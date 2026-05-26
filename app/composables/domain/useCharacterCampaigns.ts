import type { CampaignRecordCreateBody, CampaignRecordUpdateBody } from '@rolling-dice-app/core'
import type { CampaignDraft, CampaignEntry } from '~/types/business/campaign'

const STALE_CAMPAIGN_RECORD_VERSION = 'STALE_CAMPAIGN_RECORD_VERSION'

/** 樂觀鎖衝突偵測；duck-type 不依賴 FetchError instance（vitest 在 unit 解不到 ofetch transitive） */
const isStaleVersionError = (err: unknown): boolean => {
  if (typeof err !== 'object' || err === null) return false
  const e = err as {
    statusCode?: number
    response?: { status?: number }
    data?: { code?: unknown }
  }
  const status = e.statusCode ?? e.response?.status
  if (status !== 409) return false
  return e.data?.code === STALE_CAMPAIGN_RECORD_VERSION
}

const draftToCreateBody = (draft: CampaignDraft): CampaignRecordCreateBody => ({
  title: draft.title,
  subtitle: draft.subtitle,
  content: draft.content,
  date: draft.date,
  teammates: draft.teammates.map((t) => t.shareId),
  moneyEarning: { ...draft.moneyEarning },
  expEarning: draft.expEarning,
})

const draftToUpdateBody = (draft: CampaignDraft, updatedAt: string): CampaignRecordUpdateBody => ({
  updatedAt,
  title: draft.title,
  subtitle: draft.subtitle,
  content: draft.content,
  date: draft.date,
  teammates: draft.teammates.map((t) => t.shareId),
  moneyEarning: { ...draft.moneyEarning },
  expEarning: draft.expEarning,
})

/**
 * 角色戰役紀錄；對齊 /characters/:id/campaign-records 走 REST。
 * - 載入透過 load() 顯式觸發，暴露 isLoading / loadError / isReady 三態
 * - 是否同步 moneyEarning 到角色 currency 由 server 從 authed user.preference.applyMoneyToCurrency 決定
 * - 409 樂觀鎖衝突 → toast 提示 + 重新 load + 透過 conflictSignal 通知 caller（用於關閉 modal）
 */
export function useCharacterCampaigns(characterId: string) {
  const apiErrorToast = useApiErrorToast()
  const { t } = useI18n()
  const toast = useToast()
  const authStore = useAuthStore()

  const entries = ref<CampaignEntry[]>([])
  const isLoading = ref(false)
  const loadError = ref<unknown>(null)
  const isReady = ref(false)
  /** 每次發生 409 +1，UI 可 watch 之觸發 modal 關閉 */
  const conflictSignal = ref(0)

  const sortedEntries = computed(() =>
    [...entries.value].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
  )

  const totalExpEarned = computed(() =>
    entries.value.reduce((acc, entry) => acc + entry.expEarning, 0),
  )

  const load = async (): Promise<void> => {
    isLoading.value = true
    loadError.value = null
    try {
      entries.value = await characters().campaignRecords.list(characterId)
      isReady.value = true
    } catch (err) {
      loadError.value = err
    } finally {
      isLoading.value = false
    }
  }

  const handleConflict = async (): Promise<void> => {
    toast.error(t('ui.message.staleRecord'))
    conflictSignal.value++
    await load()
  }

  const addCampaign = async (draft: CampaignDraft): Promise<boolean> => {
    const applyMoney = authStore.user?.preference.applyMoneyToCurrency ?? true
    try {
      const dto = await characters().campaignRecords.create(characterId, draftToCreateBody(draft))
      entries.value.push(dto)
      if (applyMoney) {
        void useCharacterInventoryStore()
          .refetchCurrency()
          .catch(() => {})
      }
      return true
    } catch (err) {
      apiErrorToast.handle(err)
      return false
    }
  }

  const updateCampaign = async (id: string, draft: CampaignDraft): Promise<boolean> => {
    const target = entries.value.find((e) => e.id === id)
    if (!target) return false
    try {
      await characters().campaignRecords.patch(
        characterId,
        id,
        draftToUpdateBody(draft, target.updatedAt),
      )
      await load()
      return true
    } catch (err) {
      if (isStaleVersionError(err)) {
        await handleConflict()
        return false
      }
      apiErrorToast.handle(err)
      return false
    }
  }

  const removeCampaign = async (id: string): Promise<boolean> => {
    try {
      await characters().campaignRecords.remove(characterId, id)
      entries.value = entries.value.filter((e) => e.id !== id)
      return true
    } catch (err) {
      apiErrorToast.handle(err)
      return false
    }
  }

  return {
    entries: sortedEntries,
    totalExpEarned,
    isLoading,
    loadError,
    isReady,
    conflictSignal: readonly(conflictSignal),
    load,
    retry: load,
    addCampaign,
    updateCampaign,
    removeCampaign,
  }
}
