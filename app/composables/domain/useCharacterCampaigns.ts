import { CURRENCY_KEYS, DEFAULT_CURRENCY } from '@rolling-dice-app/core'
import type { CampaignEntry, CampaignEntryDraft, CurrencyAmount } from '~/types/business/campaign'

const addCurrency = (a: CurrencyAmount, b: CurrencyAmount): CurrencyAmount =>
  CURRENCY_KEYS.reduce((acc, key) => ({ ...acc, [key]: a[key] + b[key] }), { ...DEFAULT_CURRENCY })

const subtractCurrency = (a: CurrencyAmount, b: CurrencyAmount): CurrencyAmount =>
  CURRENCY_KEYS.reduce((acc, key) => ({ ...acc, [key]: a[key] - b[key] }), { ...DEFAULT_CURRENCY })

export function useCharacterCampaigns(characterId: string) {
  const campaignStore = useCampaignStore()
  const inventoryStore = useCharacterInventoryStore()

  const initial = campaignStore.load(characterId)
  const entries = ref<CampaignEntry[]>(initial.entries)
  const syncMoneyToCurrency = ref<boolean>(initial.syncMoneyToCurrency)

  const sortedEntries = computed(() =>
    [...entries.value].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
  )

  const totalExpEarned = computed(() =>
    entries.value.reduce((acc, entry) => acc + entry.expEarning, 0),
  )

  const persistCampaigns = (): boolean =>
    campaignStore.save(characterId, {
      entries: entries.value,
      syncMoneyToCurrency: syncMoneyToCurrency.value,
    })

  /** 將 currency 推導後送到 inventory store；store 內部負責 PATCH + refetch + revert。 */
  const applyCurrencyDelta = async (
    delta: (current: CurrencyAmount) => CurrencyAmount,
  ): Promise<boolean> => {
    const current = inventoryStore.currency
    if (!current) return false
    const next = delta(current)
    try {
      await inventoryStore.updateCurrency({
        updatedAt: current.updatedAt,
        cp: next.cp,
        sp: next.sp,
        gp: next.gp,
        pp: next.pp,
      })
      return true
    } catch {
      return false
    }
  }

  const addCampaign = async (draft: CampaignEntryDraft): Promise<boolean> => {
    const entry: CampaignEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...draft,
      moneyEarning: { ...draft.moneyEarning },
    }
    if (syncMoneyToCurrency.value) {
      if (!(await applyCurrencyDelta((c) => addCurrency(c, entry.moneyEarning)))) return false
    }
    entries.value.push(entry)
    if (!persistCampaigns()) {
      entries.value.pop()
      if (syncMoneyToCurrency.value) {
        await applyCurrencyDelta((c) => subtractCurrency(c, entry.moneyEarning))
      }
      return false
    }
    return true
  }

  const updateCampaign = async (id: string, draft: CampaignEntryDraft): Promise<boolean> => {
    const index = entries.value.findIndex((a) => a.id === id)
    if (index === -1) return true
    const old = entries.value[index]!
    const next: CampaignEntry = { ...old, ...draft, moneyEarning: { ...draft.moneyEarning } }
    if (syncMoneyToCurrency.value) {
      const ok = await applyCurrencyDelta((c) =>
        addCurrency(subtractCurrency(c, old.moneyEarning), next.moneyEarning),
      )
      if (!ok) return false
    }
    entries.value[index] = next
    if (!persistCampaigns()) {
      entries.value[index] = old
      if (syncMoneyToCurrency.value) {
        await applyCurrencyDelta((c) =>
          addCurrency(subtractCurrency(c, next.moneyEarning), old.moneyEarning),
        )
      }
      return false
    }
    return true
  }

  const removeCampaign = async (id: string): Promise<boolean> => {
    const index = entries.value.findIndex((a) => a.id === id)
    if (index === -1) return true
    const old = entries.value[index]!
    if (syncMoneyToCurrency.value) {
      if (!(await applyCurrencyDelta((c) => subtractCurrency(c, old.moneyEarning)))) return false
    }
    entries.value.splice(index, 1)
    if (!persistCampaigns()) {
      entries.value.splice(index, 0, old)
      if (syncMoneyToCurrency.value) {
        await applyCurrencyDelta((c) => addCurrency(c, old.moneyEarning))
      }
      return false
    }
    return true
  }

  const setSyncMoneyToCurrency = (next: boolean): boolean => {
    const previous = syncMoneyToCurrency.value
    syncMoneyToCurrency.value = next
    if (!persistCampaigns()) {
      syncMoneyToCurrency.value = previous
      return false
    }
    return true
  }

  return {
    entries: sortedEntries,
    totalExpEarned,
    syncMoneyToCurrency: readonly(syncMoneyToCurrency),
    setSyncMoneyToCurrency,
    addCampaign,
    updateCampaign,
    removeCampaign,
  }
}
