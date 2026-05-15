import {
  computeAttunedLimit,
  type CharacterCurrencyDTO,
  type CharacterCurrencyUpdateBody,
  type InventoryItemCreateBody,
  type InventoryItemDTO,
  type InventoryItemUpdateBody,
} from '@rolling-dice-app/core'
import { getTotalScore } from '~/helpers/ability'
import { calculateBackpackLoad, calculateMaxCarryWeight } from '~/helpers/inventory'
import type { InventoryItemDraft } from '~/types/business/character-form'
import { createLogger } from '~/utils/log'

const logger = createLogger('[CharacterInventoryStore]')

export const useCharacterInventoryStore = defineStore('character-inventory', () => {
  const characterId = ref<string | null>(null)
  const items = ref<InventoryItemDTO[]>([])
  const currency = ref<CharacterCurrencyDTO | null>(null)

  const itemsLoading = ref(false)
  const itemsError = ref<unknown>(null)
  const currencyLoading = ref(false)
  const currencyError = ref<unknown>(null)

  const characterStore = useCharacterStore()

  const refetchItems = async (): Promise<InventoryItemDTO[]> => {
    if (!characterId.value) return []
    itemsLoading.value = true
    itemsError.value = null
    try {
      const list = await characters().inventory.list(characterId.value)
      items.value = list
      return list
    } catch (err) {
      itemsError.value = err
      logger.error('refetchItems failed:', err)
      throw err
    } finally {
      itemsLoading.value = false
    }
  }

  const refetchCurrency = async (): Promise<CharacterCurrencyDTO | null> => {
    if (!characterId.value) return null
    currencyLoading.value = true
    currencyError.value = null
    try {
      const next = await characters().currency.get(characterId.value)
      currency.value = next
      return next
    } catch (err) {
      currencyError.value = err
      logger.error('refetchCurrency failed:', err)
      throw err
    } finally {
      currencyLoading.value = false
    }
  }

  /** 進入 detail / update 頁時呼叫；items 與 currency 平行 fetch、各自獨立成敗。 */
  const load = async (id: string): Promise<void> => {
    characterId.value = id
    await Promise.allSettled([refetchItems(), refetchCurrency()])
  }

  // ─── Items mutations ──────────────────────────────────────────────────────

  const draftToCreateBody = (draft: InventoryItemDraft): InventoryItemCreateBody => ({
    name: draft.name,
    description: draft.description,
    quantity: draft.quantity,
    weight: draft.weight,
    type: draft.type,
    location: draft.location,
  })

  const addItem = async (draft: InventoryItemDraft): Promise<InventoryItemDTO> => {
    if (!characterId.value) throw new Error('addItem: store not loaded')
    const created = await characters().inventory.add(characterId.value, draftToCreateBody(draft))
    items.value = [...items.value, created]
    return created
  }

  const patchItem = async (itemId: string, body: InventoryItemUpdateBody): Promise<void> => {
    if (!characterId.value) throw new Error('patchItem: store not loaded')
    const snapshot = items.value
    const idx = snapshot.findIndex((i) => i.id === itemId)
    if (idx === -1) throw new Error(`patchItem: itemId ${itemId} not in store`)
    const { updatedAt: _omit, ...optimistic } = body
    items.value = snapshot.map((item, i) => (i === idx ? { ...item, ...optimistic } : item))
    try {
      await characters().inventory.patch(characterId.value, itemId, body)
      await refetchItems()
    } catch (err) {
      items.value = snapshot
      throw err
    }
  }

  const updateItem = async (itemId: string, draft: InventoryItemDraft): Promise<void> => {
    const item = items.value.find((i) => i.id === itemId)
    if (!item) return
    await patchItem(itemId, { updatedAt: item.updatedAt, ...draftToCreateBody(draft) })
  }

  const moveItem = async (itemId: string): Promise<void> => {
    const item = items.value.find((i) => i.id === itemId)
    if (!item) return
    const nextLocation = item.location === 'backpack' ? 'dimensionalBag' : 'backpack'
    await patchItem(itemId, { updatedAt: item.updatedAt, location: nextLocation })
  }

  const removeItem = async (itemId: string): Promise<void> => {
    if (!characterId.value) throw new Error('removeItem: store not loaded')
    const snapshot = items.value
    items.value = snapshot.filter((i) => i.id !== itemId)
    try {
      await characters().inventory.remove(characterId.value, itemId)
    } catch (err) {
      items.value = snapshot
      throw err
    }
  }

  /** 設定第 slotIndex 個 attunement slot；newItemId=null 表示清空該 slot。 */
  const setAttunement = async (slotIndex: number, newItemId: string | null): Promise<void> => {
    const cap = attunedCap.value
    if (slotIndex < 0 || slotIndex >= cap) return
    const current = attunedItems.value[slotIndex] ?? null
    if (current?.id === newItemId) return

    try {
      if (current) {
        await patchItem(current.id, { updatedAt: current.updatedAt, isAttuned: false })
      }
      if (newItemId) {
        const target = items.value.find((i) => i.id === newItemId)
        if (!target) return
        await patchItem(target.id, { updatedAt: target.updatedAt, isAttuned: true })
      }
    } catch (err) {
      // 多步操作：中間步驟可能已寫入 server；以 server truth 對齊本地，避免 UI 停留在 optimistic rollback 後的猜測值。
      await refetchItems().catch(() => {})
      throw err
    }
  }

  // ─── Currency mutations ──────────────────────────────────────────────────

  const updateCurrency = async (body: CharacterCurrencyUpdateBody): Promise<void> => {
    if (!characterId.value) throw new Error('updateCurrency: store not loaded')
    const snapshot = currency.value
    if (snapshot) {
      const { updatedAt: _omit, ...optimistic } = body
      currency.value = { ...snapshot, ...optimistic }
    }
    try {
      await characters().currency.patch(characterId.value, body)
      await refetchCurrency()
    } catch (err) {
      currency.value = snapshot
      throw err
    }
  }

  // ─── Getters ─────────────────────────────────────────────────────────────

  const backpackItems = computed(() => items.value.filter((i) => i.location === 'backpack'))
  const dimensionalBagItems = computed(() =>
    items.value.filter((i) => i.location === 'dimensionalBag'),
  )
  const attunedCap = computed(() => {
    if (!characterId.value) return 0
    const character = characterStore.getById(characterId.value)
    return character ? computeAttunedLimit(character) : 0
  })
  const attunedItems = computed(() =>
    items.value.filter((i) => i.isAttuned).slice(0, attunedCap.value),
  )
  const backpackLoad = computed(() => {
    const coinSnapshot: CharacterCurrencyDTO = currency.value ?? {
      cp: 0,
      sp: 0,
      gp: 0,
      pp: 0,
      updatedAt: '',
    }
    return calculateBackpackLoad(backpackItems.value, coinSnapshot)
  })
  const maxCarryWeight = computed(() => {
    if (!characterId.value) return 0
    const character = characterStore.getById(characterId.value)
    const str = character?.abilities.strength
    return str ? calculateMaxCarryWeight(getTotalScore(str)) : 0
  })
  const isOverEncumbered = computed(() => backpackLoad.value > maxCarryWeight.value)

  const reset = (): void => {
    characterId.value = null
    items.value = []
    currency.value = null
    itemsError.value = null
    currencyError.value = null
  }

  return {
    characterId,
    items,
    currency,
    itemsLoading,
    itemsError,
    currencyLoading,
    currencyError,
    backpackItems,
    dimensionalBagItems,
    attunedItems,
    attunedCap,
    backpackLoad,
    maxCarryWeight,
    isOverEncumbered,
    load,
    refetchItems,
    refetchCurrency,
    addItem,
    patchItem,
    updateItem,
    moveItem,
    removeItem,
    setAttunement,
    updateCurrency,
    reset,
  }
})
