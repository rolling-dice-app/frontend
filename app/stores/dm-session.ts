import { toRaw } from 'vue'
import { buildDmSessionContainerCreateDefaults } from '@rolling-dice-app/core'
import type {
  DmSessionContainerDTO,
  DmSessionContainerSummaryDTO,
  DmSessionLogDTO,
  DmSessionLogSummaryDTO,
  DmSessionMemberDTO,
} from '@rolling-dice-app/core'
import type { DmSessionLogDraft } from '~/types/business/dm-session'
import { buildDmSessionMockSeed } from '~/mocks/dm-sessions'
import { createSingleFlight } from '~/utils/single-flight'

const cloneContainer = (c: DmSessionContainerDTO): DmSessionContainerDTO =>
  structuredClone(toRaw(c))
const cloneLog = (l: DmSessionLogDTO): DmSessionLogDTO => structuredClone(toRaw(l))

const toContainerSummary = (c: DmSessionContainerDTO): DmSessionContainerSummaryDTO => ({
  id: c.id,
  title: c.title,
  members: c.members.map((m) => ({ playerName: m.playerName })),
  createdAt: c.createdAt,
})

const toLogSummary = (l: DmSessionLogDTO): DmSessionLogSummaryDTO => ({
  id: l.id,
  title: l.title,
  date: l.date,
})

/**
 * 團務容器 / 團務紀錄 store（m7.2）。
 *
 * UI 階段：內部以 `app/mocks/dm-sessions.ts` seed 的 in-memory 資料模擬後端（重整即還原）。
 * action 簽名對齊未來 API client；TODO(串接階段): 內部改走 api client，簽名與頁面不動。
 */
export const useDmSessionStore = defineStore('dmSession', () => {
  const list = ref<DmSessionContainerSummaryDTO[]>([])
  const containerCache = ref(new Map<string, DmSessionContainerDTO>())
  const logCache = ref(new Map<string, DmSessionLogDTO>())

  const listLoading = ref(false)
  const listError = ref<unknown>(null)
  const listLoaded = ref(false)

  const detailLoading = ref(false)
  const detailError = ref<unknown>(null)

  // 容器數是否達方案上限；limits 未就緒不視為達上限。
  const isAtContainerLimit = computed(() => {
    const limits = useAuthStore().limits
    return limits != null && list.value.length >= limits.maxDmSessionContainers
  })

  // ── mock 資料層（串接後整段移除） ──────────────────────────────────────────
  let seeded = false
  /** 首次存取時把 seed clone 進 cache，模擬後端既有資料 */
  const ensureSeeded = (): void => {
    if (seeded) return
    seeded = true
    const seed = buildDmSessionMockSeed()
    for (const container of seed.containers) containerCache.value.set(container.id, container)
    for (const log of seed.logs) logCache.value.set(log.id, log)
  }

  /** 模擬 server 衍生欄位排序：date 升冪、同日依 createdAt 升冪（跑團時序） */
  const sortContainerSessions = (container: DmSessionContainerDTO): void => {
    container.sessions.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1
      const aCreated = logCache.value.get(a.id)?.createdAt ?? ''
      const bCreated = logCache.value.get(b.id)?.createdAt ?? ''
      return aCreated < bCreated ? -1 : aCreated > bCreated ? 1 : 0
    })
  }

  // ── 容器 ───────────────────────────────────────────────────────────────────
  const listFlight = createSingleFlight(async (): Promise<DmSessionContainerSummaryDTO[]> => {
    listLoading.value = true
    listError.value = null
    try {
      ensureSeeded()
      // mock 列表序：createdAt desc（後端定案後對齊）
      const items = [...containerCache.value.values()]
        .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
        .map(toContainerSummary)
      list.value = items
      listLoaded.value = true
      return items
    } catch (error) {
      listError.value = error
      throw error
    } finally {
      listLoading.value = false
    }
  })
  const loadList = (): Promise<DmSessionContainerSummaryDTO[]> => listFlight.run()

  /** 確保列表已載入一次；已載入則 no-op，避免 SPA 內導航重複載入。 */
  const ensureListLoaded = async (): Promise<void> => {
    if (listLoaded.value) return
    await loadList()
  }

  /** 回傳 null 表示容器不存在；頁面走 NotFound 分支。 */
  const loadContainer = async (id: string): Promise<DmSessionContainerDTO | null> => {
    detailLoading.value = true
    detailError.value = null
    try {
      ensureSeeded()
      const container = containerCache.value.get(id)
      return container ? cloneContainer(container) : null
    } catch (error) {
      detailError.value = error
      throw error
    } finally {
      detailLoading.value = false
    }
  }

  /** 對外讀取：回傳防禦性 clone，呼叫端可安全改寫。 */
  const getContainerById = (id: string): DmSessionContainerDTO | undefined => {
    const cached = containerCache.value.get(id)
    return cached ? cloneContainer(cached) : undefined
  }

  const createContainer = async (title: string): Promise<DmSessionContainerDTO> => {
    ensureSeeded()
    const now = new Date().toISOString()
    const created: DmSessionContainerDTO = {
      ...buildDmSessionContainerCreateDefaults(),
      id: crypto.randomUUID(),
      userId: 'mock-dm-user',
      title,
      sessions: [],
      createdAt: now,
      updatedAt: now,
    }
    containerCache.value.set(created.id, created)
    list.value.unshift(toContainerSummary(created))
    return cloneContainer(created)
  }

  const updateContainer = async (
    id: string,
    patch: Partial<Pick<DmSessionContainerDTO, 'title' | 'remark'>> &
      Partial<{ members: DmSessionMemberDTO[] }>,
  ): Promise<DmSessionContainerDTO> => {
    const container = containerCache.value.get(id)
    if (!container) throw new Error('updateContainer: container not loaded')
    if (patch.title !== undefined) container.title = patch.title
    if (patch.remark !== undefined) container.remark = patch.remark
    if (patch.members !== undefined) container.members = structuredClone(toRaw(patch.members))
    container.updatedAt = new Date().toISOString()
    const idx = list.value.findIndex((c) => c.id === id)
    if (idx >= 0) list.value.splice(idx, 1, toContainerSummary(container))
    return cloneContainer(container)
  }

  const removeContainer = async (id: string): Promise<void> => {
    const container = containerCache.value.get(id)
    for (const session of container?.sessions ?? []) logCache.value.delete(session.id)
    containerCache.value.delete(id)
    list.value = list.value.filter((c) => c.id !== id)
  }

  // ── 紀錄 ───────────────────────────────────────────────────────────────────
  /** 回傳 null 表示紀錄不存在（或不屬於該容器）；頁面走 NotFound 分支。 */
  const loadLog = async (containerId: string, logId: string): Promise<DmSessionLogDTO | null> => {
    detailLoading.value = true
    detailError.value = null
    try {
      ensureSeeded()
      const log = logCache.value.get(logId)
      return log && log.containerId === containerId ? cloneLog(log) : null
    } catch (error) {
      detailError.value = error
      throw error
    } finally {
      detailLoading.value = false
    }
  }

  /** 對外讀取：回傳防禦性 clone，呼叫端可安全改寫。 */
  const getLogById = (logId: string): DmSessionLogDTO | undefined => {
    const cached = logCache.value.get(logId)
    return cached ? cloneLog(cached) : undefined
  }

  const createLog = async (
    containerId: string,
    draft: DmSessionLogDraft,
  ): Promise<DmSessionLogDTO> => {
    const container = containerCache.value.get(containerId)
    if (!container) throw new Error('createLog: container not loaded')
    const now = new Date().toISOString()
    const created: DmSessionLogDTO = {
      ...structuredClone(toRaw(draft)),
      id: crypto.randomUUID(),
      containerId,
      createdAt: now,
      updatedAt: now,
    }
    logCache.value.set(created.id, created)
    container.sessions.push(toLogSummary(created))
    sortContainerSessions(container)
    return cloneLog(created)
  }

  const updateLog = async (
    containerId: string,
    logId: string,
    draft: DmSessionLogDraft,
  ): Promise<DmSessionLogDTO> => {
    const log = logCache.value.get(logId)
    if (!log || log.containerId !== containerId) throw new Error('updateLog: log not loaded')
    Object.assign(log, structuredClone(toRaw(draft)))
    log.updatedAt = new Date().toISOString()
    const container = containerCache.value.get(containerId)
    if (container) {
      const idx = container.sessions.findIndex((s) => s.id === logId)
      if (idx >= 0) container.sessions.splice(idx, 1, toLogSummary(log))
      sortContainerSessions(container)
    }
    return cloneLog(log)
  }

  const removeLog = async (containerId: string, logId: string): Promise<void> => {
    logCache.value.delete(logId)
    const container = containerCache.value.get(containerId)
    if (container) container.sessions = container.sessions.filter((s) => s.id !== logId)
  }

  /** 清空所有 session-bound state；登出 / 換帳號 / 401 時由 auth store 統一呼叫。 */
  const reset = (): void => {
    list.value = []
    containerCache.value = new Map()
    logCache.value = new Map()
    listLoaded.value = false
    listLoading.value = false
    listError.value = null
    detailLoading.value = false
    detailError.value = null
    seeded = false
  }

  return {
    list,
    containerCache,
    logCache,
    isAtContainerLimit,
    listLoading,
    listError,
    listLoaded,
    detailLoading,
    detailError,
    loadList,
    ensureListLoaded,
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
