import { DEFAULT_CURRENCY } from '~/constants/inventory'
import type { AdventureEntry, AdventureEntryDraft } from '~/types/business/adventure'
import type { CharacterCurrency } from '@rolling-dice-app/types'

type CurrencyKey = keyof CharacterCurrency

const CURRENCY_KEYS: readonly CurrencyKey[] = ['cp', 'sp', 'gp', 'pp']

function addCurrency(a: CharacterCurrency, b: CharacterCurrency): CharacterCurrency {
  return CURRENCY_KEYS.reduce((acc, key) => ({ ...acc, [key]: a[key] + b[key] }), {
    ...DEFAULT_CURRENCY,
  })
}

function subtractCurrency(a: CharacterCurrency, b: CharacterCurrency): CharacterCurrency {
  return CURRENCY_KEYS.reduce((acc, key) => ({ ...acc, [key]: a[key] - b[key] }), {
    ...DEFAULT_CURRENCY,
  })
}

export function useCharacterAdventures(characterId: string) {
  const adventureStore = useAdventureStore()
  const characterStore = useCharacterStore()

  const initial = adventureStore.load(characterId)
  const entries = ref<AdventureEntry[]>(initial.entries)
  const syncMoneyToCurrency = ref<boolean>(initial.syncMoneyToCurrency)

  const sortedEntries = computed(() =>
    [...entries.value].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
  )

  const totalExpEarned = computed(() =>
    entries.value.reduce((acc, entry) => acc + entry.expEarning, 0),
  )

  function persistAdventures(): boolean {
    return adventureStore.save(characterId, {
      entries: entries.value,
      syncMoneyToCurrency: syncMoneyToCurrency.value,
    })
  }

  function applyCurrencyDelta(delta: (current: CharacterCurrency) => CharacterCurrency): boolean {
    const character = characterStore.getById(characterId)
    if (!character) return false
    const next = delta(character.currency)
    return characterStore.patchCharacter(characterId, { currency: next })
  }

  function addAdventure(draft: AdventureEntryDraft): boolean {
    const entry: AdventureEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...draft,
      moneyEarning: { ...draft.moneyEarning },
    }
    if (syncMoneyToCurrency.value) {
      if (!applyCurrencyDelta((c) => addCurrency(c, entry.moneyEarning))) {
        return false
      }
    }
    entries.value.push(entry)
    if (!persistAdventures()) {
      entries.value.pop()
      if (syncMoneyToCurrency.value) {
        applyCurrencyDelta((c) => subtractCurrency(c, entry.moneyEarning))
      }
      return false
    }
    return true
  }

  function updateAdventure(id: string, draft: AdventureEntryDraft): boolean {
    const index = entries.value.findIndex((a) => a.id === id)
    if (index === -1) return true
    const old = entries.value[index]!
    const next: AdventureEntry = {
      ...old,
      ...draft,
      moneyEarning: { ...draft.moneyEarning },
    }
    if (syncMoneyToCurrency.value) {
      const ok = applyCurrencyDelta((c) =>
        addCurrency(subtractCurrency(c, old.moneyEarning), next.moneyEarning),
      )
      if (!ok) return false
    }
    entries.value[index] = next
    if (!persistAdventures()) {
      entries.value[index] = old
      if (syncMoneyToCurrency.value) {
        applyCurrencyDelta((c) =>
          addCurrency(subtractCurrency(c, next.moneyEarning), old.moneyEarning),
        )
      }
      return false
    }
    return true
  }

  function removeAdventure(id: string): boolean {
    const index = entries.value.findIndex((a) => a.id === id)
    if (index === -1) return true
    const old = entries.value[index]!
    if (syncMoneyToCurrency.value) {
      if (!applyCurrencyDelta((c) => subtractCurrency(c, old.moneyEarning))) {
        return false
      }
    }
    entries.value.splice(index, 1)
    if (!persistAdventures()) {
      entries.value.splice(index, 0, old)
      if (syncMoneyToCurrency.value) {
        applyCurrencyDelta((c) => addCurrency(c, old.moneyEarning))
      }
      return false
    }
    return true
  }

  function setSyncMoneyToCurrency(next: boolean): boolean {
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
