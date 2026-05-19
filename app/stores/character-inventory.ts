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
  /** 正在進行 patch 的 item id；驅動 UI disabled 並作為重入 safety net，與 itemsLoading 分離。 */
  const pendingItemIds = ref<Set<string>>(new Set())
  const currencyLoading = ref(false)
  const currencyError = ref<unknown>(null)

  const characterStore = useCharacterStore()

  // 參考 useCharacterCombatState 的單一 in-flight + 尾隨合併：GET 永不並行，
  // 避免先發後到的舊 list 回應覆蓋較新結果（不同 item 並行 patch 各自 refetch 的倒流）
  let refetchInFlight: Promise<InventoryItemDTO[]> | null = null
  let refetchQueued = false
  // 對應 combat 的 dirtyDuringPatch：本地 items 每次變動（optimistic patch / add / remove）即 bump；
  // refetch 回應若期間 generation 改變，代表有並行本地變更，該 list 已過期 → 不覆蓋
  let mutationGeneration = 0

  const refetchItems = async (): Promise<InventoryItemDTO[]> => {
    if (!characterId.value) return []
    if (refetchInFlight) {
      refetchQueued = true
      return refetchInFlight
    }
    const id = characterId.value
    const run = async (): Promise<InventoryItemDTO[]> => {
      itemsLoading.value = true
      itemsError.value = null
      const gen = mutationGeneration
      try {
        const list = await characters().inventory.list(id)
        // 飛行期間有並行本地變更 → 此回應已過期，不覆蓋 optimistic；交由該變更後續的 refetch 對齊
        if (gen === mutationGeneration) items.value = list
        return list
      } catch (err) {
        itemsError.value = err
        logger.error('refetchItems failed:', err)
        throw err
      } finally {
        itemsLoading.value = false
      }
    }
    try {
      let result = await (refetchInFlight = run())
      while (refetchQueued) {
        refetchQueued = false
        result = await (refetchInFlight = run())
      }
      return result
    } finally {
      refetchInFlight = null
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
    mutationGeneration++
    return created
  }

  const patchItem = async (itemId: string, body: InventoryItemUpdateBody): Promise<void> => {
    if (!characterId.value) throw new Error('patchItem: store not loaded')
    const idx = items.value.findIndex((i) => i.id === itemId)
    if (idx === -1) throw new Error(`patchItem: itemId ${itemId} not in store`)
    // 重入 safety net：UI disabled 為主要閘門，這層僅防 disabled 失效或非 UI 路徑的並發；
    // no-op 而非 throw，避免 runInventoryOp 誤報錯誤 toast
    if (pendingItemIds.value.has(itemId)) return
    pendingItemIds.value = new Set(pendingItemIds.value).add(itemId)
    const { updatedAt: _omit, ...optimistic } = body
    items.value = items.value.map((item, i) => (i === idx ? { ...item, ...optimistic } : item))
    mutationGeneration++
    try {
      await characters().inventory.patch(characterId.value, itemId, body)
      await refetchItems()
    } catch (err) {
      // 失敗對齊 server truth，避免 snapshot rollback 蓋掉並行 mutation 的成功結果
      await refetchItems().catch(() => {})
      throw err
    } finally {
      const next = new Set(pendingItemIds.value)
      next.delete(itemId)
      pendingItemIds.value = next
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
    items.value = items.value.filter((i) => i.id !== itemId)
    mutationGeneration++
    try {
      await characters().inventory.remove(characterId.value, itemId)
    } catch (err) {
      // 失敗對齊 server truth，避免 snapshot rollback 蓋掉並行 mutation 的成功結果
      await refetchItems().catch(() => {})
      throw err
    }
  }

  /** 設定第 slotIndex 個 attunement slot；newItemId=null 表示清空該 slot。 */
  const setAttunement = async (slotIndex: number, newItemId: string | null): Promise<void> => {
    const cap = attunedCap.value
    if (slotIndex < 0 || slotIndex >= cap) return
    const current = attunedItems.value[slotIndex] ?? null
    if (current?.id === newItemId) return

    // patchItem 失敗時自身會 refetch 對齊 server truth，這裡不再額外 catch
    if (current) {
      await patchItem(current.id, { updatedAt: current.updatedAt, isAttuned: false })
    }
    if (newItemId) {
      const target = items.value.find((i) => i.id === newItemId)
      if (!target) return
      await patchItem(target.id, { updatedAt: target.updatedAt, isAttuned: true })
    }
  }

  // ─── Currency mutations ──────────────────────────────────────────────────

  const updateCurrency = async (body: CharacterCurrencyUpdateBody): Promise<void> => {
    if (!characterId.value) throw new Error('updateCurrency: store not loaded')
    if (currency.value) {
      const { updatedAt: _omit, ...optimistic } = body
      currency.value = { ...currency.value, ...optimistic }
    }
    try {
      await characters().currency.patch(characterId.value, body)
      await refetchCurrency()
    } catch (err) {
      // 失敗對齊 server truth，避免 snapshot rollback 蓋掉並行 mutation 的成功結果
      await refetchCurrency().catch(() => {})
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
    pendingItemIds.value = new Set()
    itemsError.value = null
    currencyError.value = null
  }

  return {
    characterId,
    items,
    currency,
    itemsLoading,
    itemsError,
    pendingItemIds,
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
