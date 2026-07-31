import { toRaw } from 'vue'
import type {
  DmSessionContainerDTO,
  DmSessionContainerSummaryDTO,
  DmSessionLogDTO,
  DmSessionMemberDTO,
} from '@rolling-dice-app/core'
import type { DmSessionContainerSaveResult, DmSessionLogDraft } from '~/types/business/dm-session'
import {
  buildDmSessionContainerUpdateBody,
  buildDmSessionLogCreateBody,
  buildDmSessionLogUpdateBody,
} from '~/helpers/dm-session'
import { createKeyedSingleFlight, createSingleFlight } from '~/utils/single-flight'

const cloneContainer = (c: DmSessionContainerDTO): DmSessionContainerDTO =>
  structuredClone(toRaw(c))
const cloneLog = (l: DmSessionLogDTO): DmSessionLogDTO => structuredClone(toRaw(l))

/**
 * 團務容器 / 團務紀錄 store。
 *
 * 內部走 /dm-session-containers API（含 session-logs 子資源）；
 * PATCH 以 cache 內 DTO 的 updatedAt 作樂觀鎖 token，204 後 re-GET 換新 token。
 */
/** log 單飛 key 的組合分隔字元；uuid 不含此字元故不會誤切 */
const LOG_KEY_SEPARATOR = '::'

export const useDmSessionStore = defineStore('dmSession', () => {
  const list = ref<DmSessionContainerSummaryDTO[]>([])
  const containerCache = ref(new Map<string, DmSessionContainerDTO>())
  const logCache = ref(new Map<string, DmSessionLogDTO>())

  const listLoading = ref(false)
  const listError = ref<unknown>(null)

  /** 詳情載入狀態 per-id（容器與紀錄共用同一組 map，key 不重疊）：
   * 兩筆詳情同時載入時，先完成者不再清掉另一筆的 loading／error */
  const detailLoadingIds = ref(new Set<string>())
  const detailErrors = ref(new Map<string, unknown>())

  const isDetailLoading = (id: string): boolean => detailLoadingIds.value.has(id)
  const detailErrorOf = (id: string): unknown => detailErrors.value.get(id) ?? null

  // 容器數是否達方案上限；limits 未就緒不視為達上限。
  const isAtContainerLimit = computed(() => {
    const limits = useAuthStore().limits
    return limits != null && list.value.length >= limits.maxDmSessionContainers
  })

  // ── 容器 ───────────────────────────────────────────────────────────────────
  // 單飛：並發的 loadList 共享同一輪 GET，避免先發後到的舊結果覆蓋較新結果。
  const listFlight = createSingleFlight(async (): Promise<DmSessionContainerSummaryDTO[]> => {
    listLoading.value = true
    listError.value = null
    try {
      // server 排序 createdAt desc，本地不再重排
      const items = await dmSessionContainers().list()
      list.value = items
      return items
    } catch (error) {
      listError.value = error
      throw error
    } finally {
      listLoading.value = false
    }
  })
  const loadList = (): Promise<DmSessionContainerSummaryDTO[]> => listFlight.run()

  // 單飛 per-id：同一容器的並發載入共享同一輪 GET。
  const containerFlight = createKeyedSingleFlight(
    async (id: string): Promise<DmSessionContainerDTO> => {
      detailLoadingIds.value.add(id)
      detailErrors.value.delete(id)
      try {
        const container = await dmSessionContainers().get(id)
        containerCache.value.set(id, container)
        return container
      } catch (error) {
        detailErrors.value.set(id, error)
        throw error
      } finally {
        detailLoadingIds.value.delete(id)
      }
    },
  )

  /** 回傳防禦性 clone；共享同一輪 GET 的多個呼叫端各自拿到獨立副本。 */
  const loadContainer = async (id: string): Promise<DmSessionContainerDTO> =>
    cloneContainer(await containerFlight.run(id))

  /** 對外讀取：回傳防禦性 clone，呼叫端可安全改寫。 */
  const getContainerById = (id: string): DmSessionContainerDTO | undefined => {
    const cached = containerCache.value.get(id)
    return cached ? cloneContainer(cached) : undefined
  }

  const createContainer = async (
    title: string,
    remark?: string,
  ): Promise<DmSessionContainerDTO> => {
    const created = await dmSessionContainers().create(
      remark === undefined ? { title } : { title, remark },
    )
    containerCache.value.set(created.id, created)
    // 列表不本地同步：成功即導詳情，返回列表時必重抓
    return cloneContainer(created)
  }

  /** 三態結果見 {@link DmSessionContainerSaveResult}；呼叫端需自行區分無變更與真的存成功。 */
  const updateContainer = async (
    id: string,
    patch: Partial<Pick<DmSessionContainerDTO, 'title' | 'remark'>> &
      Partial<{ members: DmSessionMemberDTO[] }>,
  ): Promise<DmSessionContainerSaveResult> => {
    const original = containerCache.value.get(id)
    if (!original) throw new Error('updateContainer: container not loaded')

    const body = buildDmSessionContainerUpdateBody(original, patch)
    if (Object.keys(body).length <= 1) {
      return { status: 'unchanged', container: cloneContainer(original) }
    }

    const api = dmSessionContainers()
    await api.update(id, body)
    // PATCH 204 無 body，重抓拿新 updatedAt（樂觀鎖 token）
    let next: DmSessionContainerDTO
    try {
      next = await api.get(id)
    } catch {
      // PATCH 已成功，re-GET 失敗不得誤報為儲存失敗；cache 內舊 lock token 已作廢，
      // 失效之避免原地重試撞 409，頁面重載時重抓。
      containerCache.value.delete(id)
      return { status: 'stale' }
    }
    containerCache.value.set(id, next)
    return { status: 'saved', container: cloneContainer(next) }
  }

  // hard-delete 無 deletedAt 分流，本地移除即與後端一致；cascade 以 containerId 清掉所屬紀錄 cache。
  const removeContainer = async (id: string): Promise<void> => {
    await dmSessionContainers().remove(id)
    for (const [logId, log] of logCache.value) {
      if (log.containerId === id) logCache.value.delete(logId)
    }
    containerCache.value.delete(id)
    list.value = list.value.filter((c) => c.id !== id)
  }

  // ── 紀錄 ───────────────────────────────────────────────────────────────────
  // 單飛的 key 需同時帶容器與紀錄 id（getLog 兩者都要），故以分隔字元組合。
  const logFlight = createKeyedSingleFlight(async (key: string): Promise<DmSessionLogDTO> => {
    const [containerId = '', logId = ''] = key.split(LOG_KEY_SEPARATOR)
    detailLoadingIds.value.add(logId)
    detailErrors.value.delete(logId)
    try {
      const log = await dmSessionContainers().getLog(containerId, logId)
      logCache.value.set(logId, log)
      return log
    } catch (error) {
      detailErrors.value.set(logId, error)
      throw error
    } finally {
      detailLoadingIds.value.delete(logId)
    }
  })

  /** 回傳防禦性 clone；共享同一輪 GET 的多個呼叫端各自拿到獨立副本。 */
  const loadLog = async (containerId: string, logId: string): Promise<DmSessionLogDTO> =>
    cloneLog(await logFlight.run(`${containerId}${LOG_KEY_SEPARATOR}${logId}`))

  /** 對外讀取：回傳防禦性 clone，呼叫端可安全改寫。 */
  const getLogById = (logId: string): DmSessionLogDTO | undefined => {
    const cached = logCache.value.get(logId)
    return cached ? cloneLog(cached) : undefined
  }

  const createLog = async (
    containerId: string,
    draft: DmSessionLogDraft,
  ): Promise<DmSessionLogDTO> => {
    const created = await dmSessionContainers().createLog(
      containerId,
      buildDmSessionLogCreateBody(draft),
    )
    logCache.value.set(created.id, created)
    // container.sessions 不本地同步：成功即導 log 詳情，容器頁重進時必重抓
    return cloneLog(created)
  }

  /** 回傳 null 表示 PATCH 已成功但 re-GET 失敗（資料已存，僅新副本暫不可得）。 */
  const updateLog = async (
    containerId: string,
    logId: string,
    draft: DmSessionLogDraft,
  ): Promise<DmSessionLogDTO | null> => {
    const original = logCache.value.get(logId)
    if (!original || original.containerId !== containerId)
      throw new Error('updateLog: log not loaded')

    const body = buildDmSessionLogUpdateBody(original, draft)
    if (Object.keys(body).length <= 1) return cloneLog(original)

    const api = dmSessionContainers()
    await api.updateLog(containerId, logId, body)
    let next: DmSessionLogDTO
    try {
      next = await api.getLog(containerId, logId)
    } catch {
      logCache.value.delete(logId)
      return null
    }
    logCache.value.set(logId, next)
    return cloneLog(next)
  }

  const removeLog = async (containerId: string, logId: string): Promise<void> => {
    await dmSessionContainers().removeLog(containerId, logId)
    logCache.value.delete(logId)
  }

  /** 清空所有 session-bound state；登出 / 換帳號 / 401 時由 auth store 統一呼叫。 */
  const reset = (): void => {
    list.value = []
    containerCache.value = new Map()
    logCache.value = new Map()
    listLoading.value = false
    listError.value = null
    detailLoadingIds.value = new Set()
    detailErrors.value = new Map()
  }

  return {
    list,
    containerCache,
    logCache,
    isAtContainerLimit,
    listLoading,
    listError,
    isDetailLoading,
    detailErrorOf,
    loadList,
    loadContainer,
    getContainerById,
    createContainer,
    updateContainer,
    removeContainer,
    loadLog,
    getLogById,
    createLog,
    updateLog,
    removeLog,
    reset,
  }
})
