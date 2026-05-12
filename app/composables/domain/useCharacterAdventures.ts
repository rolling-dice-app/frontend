import { CURRENCY_KEYS, DEFAULT_CURRENCY } from '@rolling-dice-app/core'
import type {
  AdventureEntry,
  AdventureEntryDraft,
  CurrencyAmount,
} from '~/types/business/adventure'

const addCurrency = (a: CurrencyAmount, b: CurrencyAmount): CurrencyAmount =>
  CURRENCY_KEYS.reduce((acc, key) => ({ ...acc, [key]: a[key] + b[key] }), { ...DEFAULT_CURRENCY })

const subtractCurrency = (a: CurrencyAmount, b: CurrencyAmount): CurrencyAmount =>
  CURRENCY_KEYS.reduce((acc, key) => ({ ...acc, [key]: a[key] - b[key] }), { ...DEFAULT_CURRENCY })

export function useCharacterAdventures(characterId: string) {
  const adventureStore = useAdventureStore()
  const inventoryStore = useCharacterInventoryStore()

  const initial = adventureStore.load(characterId)
  const entries = ref<AdventureEntry[]>(initial.entries)
  const syncMoneyToCurrency = ref<boolean>(initial.syncMoneyToCurrency)

  const sortedEntries = computed(() =>
    [...entries.value].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
  )

  const totalExpEarned = computed(() =>
    entries.value.reduce((acc, entry) => acc + entry.expEarning, 0),
  )

  const persistAdventures = (): boolean =>
    adventureStore.save(characterId, {
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

  const addAdventure = async (draft: AdventureEntryDraft): Promise<boolean> => {
    const entry: AdventureEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...draft,
      moneyEarning: { ...draft.moneyEarning },
    }
    if (syncMoneyToCurrency.value) {
      if (!(await applyCurrencyDelta((c) => addCurrency(c, entry.moneyEarning)))) return false
    }
    entries.value.push(entry)
    if (!persistAdventures()) {
      entries.value.pop()
      if (syncMoneyToCurrency.value) {
        await applyCurrencyDelta((c) => subtractCurrency(c, entry.moneyEarning))
      }
      return false
    }
    return true
  }

  const updateAdventure = async (id: string, draft: AdventureEntryDraft): Promise<boolean> => {
    const index = entries.value.findIndex((a) => a.id === id)
    if (index === -1) return true
    const old = entries.value[index]!
    const next: AdventureEntry = { ...old, ...draft, moneyEarning: { ...draft.moneyEarning } }
    if (syncMoneyToCurrency.value) {
      const ok = await applyCurrencyDelta((c) =>
        addCurrency(subtractCurrency(c, old.moneyEarning), next.moneyEarning),
      )
      if (!ok) return false
    }
    entries.value[index] = next
    if (!persistAdventures()) {
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

  const removeAdventure = async (id: string): Promise<boolean> => {
    const index = entries.value.findIndex((a) => a.id === id)
    if (index === -1) return true
    const old = entries.value[index]!
    if (syncMoneyToCurrency.value) {
      if (!(await applyCurrencyDelta((c) => subtractCurrency(c, old.moneyEarning)))) return false
    }
    entries.value.splice(index, 1)
    if (!persistAdventures()) {
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
    if (!persistAdventures()) {
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
    addAdventure,
    updateAdventure,
    removeAdventure,
  }
}
