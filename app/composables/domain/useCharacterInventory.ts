import { storeToRefs } from 'pinia'
import type {
  CharacterCurrencyDTO,
  InventoryItemCreateBody,
  InventoryItemUpdateBody,
} from '@rolling-dice-app/core'
import type { InventoryItemDraft } from '~/types/business/character-form'

/**
 * 背包與金幣的 component facade；對外維持既有 API 形狀，
 * 內部全部委派給 useCharacterInventoryStore。
 */
export function useCharacterInventory(_characterId: string) {
  const store = useCharacterInventoryStore()
  const {
    items,
    currency,
    backpackItems,
    dimensionalBagItems,
    attunedItems,
    attunedCap,
    backpackLoad,
    maxCarryWeight,
    isOverEncumbered,
  } = storeToRefs(store)

  const draftToCreateBody = (draft: InventoryItemDraft): InventoryItemCreateBody => ({
    name: draft.name,
    description: draft.description,
    quantity: draft.quantity,
    weight: draft.weight,
    type: draft.type,
    location: draft.location,
  })

  const addItem = (draft: InventoryItemDraft): Promise<unknown> =>
    store.addItem(draftToCreateBody(draft))

  const removeItem = (itemId: string): Promise<void> => store.removeItem(itemId)

  const updateItem = (itemId: string, draft: InventoryItemDraft): Promise<void> => {
    const item = store.items.find((i) => i.id === itemId)
    if (!item) return Promise.resolve()
    const body: InventoryItemUpdateBody = {
      updatedAt: item.updatedAt,
      ...draftToCreateBody(draft),
    }
    return store.patchItem(itemId, body)
  }

  const moveItem = (itemId: string): Promise<void> => {
    const item = store.items.find((i) => i.id === itemId)
    if (!item) return Promise.resolve()
    const nextLocation = item.location === 'backpack' ? 'dimensionalBag' : 'backpack'
    return store.patchItem(itemId, { updatedAt: item.updatedAt, location: nextLocation })
  }

  const updateCurrency = (value: CharacterCurrencyDTO): Promise<void> =>
    store.updateCurrency({
      updatedAt: value.updatedAt,
      cp: value.cp,
      sp: value.sp,
      gp: value.gp,
      pp: value.pp,
    })

  const setAttunement = (slotIndex: number, newItemId: string | null): Promise<void> =>
    store.setAttunement(slotIndex, newItemId)

  return {
    items,
    currency,
    backpackItems,
    dimensionalBagItems,
    attunedItems,
    attunedCap,
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
