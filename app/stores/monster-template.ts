import { toRaw } from 'vue'
import type { MonsterTemplateDTO, MonsterTemplateSummaryDTO } from '@rolling-dice-app/core'
import type {
  MonsterTemplateFormState,
  MonsterTemplateSaveResult,
  MonsterTemplateView,
} from '~/types/business/monster'
import {
  buildMonsterTemplateCreateBody,
  buildMonsterTemplateUpdatePatch,
  monsterTemplateToSummary,
} from '~/helpers/monster'
import { createSingleFlight } from '~/utils/single-flight'

const cloneTemplate = (t: MonsterTemplateDTO): MonsterTemplateDTO => structuredClone(toRaw(t))

export const useMonsterTemplateStore = defineStore('monsterTemplate', () => {
  const list = ref<MonsterTemplateSummaryDTO[]>([])
  const detailCache = ref(new Map<string, MonsterTemplateDTO>())

  const listLoading = ref(false)
  const listError = ref<unknown>(null)
  const listLoaded = ref(false)

  const detailLoading = ref(false)
  const detailError = ref<unknown>(null)

  // 模板數是否達方案上限；hard-delete 無 trash，全列表即計數。limits 未就緒不視為達上限。
  const isAtMonsterTemplateLimit = computed(() => {
    const limits = useAuthStore().limits
    return limits != null && list.value.length >= limits.maxMonsterTemplates
  })

  // 單飛：並發的 loadList（middleware / 頁面同時觸發）共享同一輪 GET，
  // 避免先發後到的舊結果覆蓋較新結果。
  const listFlight = createSingleFlight(async (): Promise<MonsterTemplateSummaryDTO[]> => {
    listLoading.value = true
    listError.value = null
    try {
      const items = await monsterTemplates().list()
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
  const loadList = (): Promise<MonsterTemplateSummaryDTO[]> => listFlight.run()

  /** limit middleware 冷啟動 seed：至少載入一次即 no-op；列表頁一律直呼 loadList 重抓。 */
  const ensureListLoaded = async (): Promise<void> => {
    if (listLoaded.value) return
    await loadList()
  }

  const loadDetail = async (id: string): Promise<MonsterTemplateDTO> => {
    detailLoading.value = true
    detailError.value = null
    try {
      const template = await monsterTemplates().get(id)
      detailCache.value.set(id, template)
      return cloneTemplate(template)
    } catch (error) {
      detailError.value = error
      throw error
    } finally {
      detailLoading.value = false
    }
  }

  const createMonsterTemplate = async (view: MonsterTemplateView): Promise<MonsterTemplateDTO> => {
    const created = await monsterTemplates().create(buildMonsterTemplateCreateBody(view))
    detailCache.value.set(created.id, created)
    // 後端列表為 updatedAt desc，新建者置頂對齊
    list.value.unshift(monsterTemplateToSummary(created))
    return cloneTemplate(created)
  }

  /** 對外讀取：回傳防禦性 clone，呼叫端可安全改寫。 */
  const getById = (id: string): MonsterTemplateDTO | undefined => {
    const cached = detailCache.value.get(id)
    return cached ? cloneTemplate(cached) : undefined
  }

  /** 三態結果見 {@link MonsterTemplateSaveResult}；呼叫端需自行區分無變更與真的存成功。 */
  const updateMonsterTemplate = async (
    id: string,
    formState: MonsterTemplateFormState,
  ): Promise<MonsterTemplateSaveResult> => {
    const original = detailCache.value.get(id)
    if (!original) throw new Error('updateMonsterTemplate: template not loaded')

    const patch = buildMonsterTemplateUpdatePatch(original, formState)
    if (Object.keys(patch).length <= 1) {
      return { status: 'unchanged', template: cloneTemplate(original) }
    }

    const api = monsterTemplates()
    await api.update(id, patch)
    // PATCH 204 無 body，重抓拿新 updatedAt（樂觀鎖 token）
    let next: MonsterTemplateDTO
    try {
      next = await api.get(id)
    } catch {
      // PATCH 已成功，re-GET 失敗不得誤報為儲存失敗；cache 內舊 lock token 已作廢，
      // 失效之避免原地重試撞 409，下次進入頁面重抓。
      detailCache.value.delete(id)
      return { status: 'stale' }
    }
    detailCache.value.set(id, next)
    // 列表不本地同步（含 updatedAt desc 置頂）：成功後必導列表，該頁必重抓
    return { status: 'saved', template: cloneTemplate(next) }
  }

  // hard-delete 無 deletedAt 分流，本地移除即與後端一致，不需重載列表。
  const removeMonsterTemplate = async (id: string): Promise<void> => {
    await monsterTemplates().remove(id)
    detailCache.value.delete(id)
    list.value = list.value.filter((t) => t.id !== id)
  }

  /** 清空所有 session-bound state；登出 / 換帳號 / 401 時由 auth store 統一呼叫。 */
  const reset = (): void => {
    list.value = []
    detailCache.value = new Map()
    listLoaded.value = false
    listLoading.value = false
    listError.value = null
    detailLoading.value = false
    detailError.value = null
  }

  return {
    list,
    detailCache,
    isAtMonsterTemplateLimit,
    listLoading,
    listError,
    listLoaded,
    detailLoading,
    detailError,
    loadList,
    ensureListLoaded,
    loadDetail,
    createMonsterTemplate,
    getById,
    updateMonsterTemplate,
    removeMonsterTemplate,
    reset,
  }
})
