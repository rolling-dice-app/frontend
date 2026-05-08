import { ATTUNEMENT_SLOT_COUNT } from '~/constants/inventory'
import { getTotalScore } from '~/helpers/ability'
import { calculateBackpackLoad, calculateMaxCarryWeight } from '~/helpers/inventory'
import {
  DEFAULT_CURRENCY,
  type CharacterCurrency,
  type InventoryItem,
} from '@rolling-dice-app/core'
import type { InventoryItemDraft } from '~/types/business/character-form'

export function useCharacterInventory(characterId: string) {
  const store = useCharacterStore()

  const character = computed(() => store.getById(characterId))

  const items = ref<InventoryItem[]>(character.value?.items.map((i) => ({ ...i })) ?? [])
  const currency = computed<CharacterCurrency>(
    () => character.value?.currency ?? { ...DEFAULT_CURRENCY },
  )

  const backpackItems = computed(() => items.value.filter((i) => i.location === 'backpack'))
  const dimensionalBagItems = computed(() =>
    items.value.filter((i) => i.location === 'dimensionalBag'),
  )
  const attunedItems = computed<InventoryItem[]>(() =>
    items.value.filter((i) => i.isAttuned).slice(0, ATTUNEMENT_SLOT_COUNT),
  )
  const backpackLoad = computed(() => calculateBackpackLoad(backpackItems.value, currency.value))
  const maxCarryWeight = computed(() => {
    const str = character.value?.abilities.strength
    return str ? calculateMaxCarryWeight(getTotalScore(str)) : 0
  })
  const isOverEncumbered = computed(() => backpackLoad.value > maxCarryWeight.value)

  function persist(): boolean {
    return store.patchCharacter(characterId, { items: items.value })
  }

  function addItem(draft: InventoryItemDraft): boolean {
    items.value.push({ id: crypto.randomUUID(), ...draft, isAttuned: false })
    if (!persist()) {
      items.value.pop()
      return false
    }
    return true
  }

  function removeItem(itemId: string): boolean {
    const index = items.value.findIndex((i) => i.id === itemId)
    if (index === -1) return true
    const removed = items.value[index]!
    items.value.splice(index, 1)
    if (!persist()) {
      items.value.splice(index, 0, removed)
      return false
    }
    return true
  }

  function updateItem(itemId: string, draft: InventoryItemDraft): boolean {
    const index = items.value.findIndex((i) => i.id === itemId)
    if (index === -1) return true
    const old = items.value[index]!
    items.value[index] = { id: itemId, ...draft, isAttuned: old.isAttuned }
    if (!persist()) {
      items.value[index] = old
      return false
    }
    return true
  }

  function moveItem(itemId: string): boolean {
    const item = items.value.find((i) => i.id === itemId)
    if (!item) return true
    const previous = item.location
    item.location = previous === 'backpack' ? 'dimensionalBag' : 'backpack'
    if (!persist()) {
      item.location = previous
      return false
    }
    return true
  }

  function updateCurrency(value: CharacterCurrency): boolean {
    return store.patchCharacter(characterId, { currency: value })
  }

  /** 設定第 slotIndex 個 slot 的同調物品；newItemId 為 null 時清空 slot。 */
  function setAttunement(slotIndex: number, newItemId: string | null): boolean {
    if (slotIndex < 0 || slotIndex >= ATTUNEMENT_SLOT_COUNT) return true
    const current = attunedItems.value[slotIndex] ?? null
    if (current?.id === newItemId) return true

    const snapshot = items.value.map((i) => ({ ...i }))
    if (current) {
      const oldIdx = items.value.findIndex((i) => i.id === current.id)
      if (oldIdx !== -1) items.value[oldIdx] = { ...items.value[oldIdx]!, isAttuned: false }
    }
    if (newItemId) {
      const newIdx = items.value.findIndex((i) => i.id === newItemId)
      if (newIdx !== -1) items.value[newIdx] = { ...items.value[newIdx]!, isAttuned: true }
    }
    if (!persist()) {
      items.value = snapshot
      return false
    }
    return true
  }

  return {
    items,
    currency,
    backpackItems,
    dimensionalBagItems,
    attunedItems,
    backpackLoad,
    maxCarryWeight,
    isOverEncumbered,
    addItem,
    removeItem,
    updateItem,
    moveItem,
    updateCurrency,
    setAttunement,
  }
}
