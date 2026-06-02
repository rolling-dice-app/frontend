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
import { createDirtyGuard } from '~/utils/dirty-guard'
import { createLogger } from '~/utils/log'
import { createKeyedSingleFlight } from '~/utils/single-flight'

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

  // GET 單飛 + trailing-merge：避免先發後到的舊 list 蓋掉較新結果。
  // 以 characterId 為 key：跨角色切換時不同 key 互不 coalesce，stale 角色的回應不會寫進新角色。
  // dirty 用於飛行中本地若有並行 mutation，則 server list 視為過期、不覆蓋 optimistic。
  const itemsDirty = createDirtyGuard()
  const itemsFlight = createKeyedSingleFlight(async (id: string): Promise<InventoryItemDTO[]> => {
    itemsLoading.value = true
    itemsError.value = null
    const snap = itemsDirty.snapshot()
    try {
      const list = await characters().inventory.list(id)
      // 進場 id 與當前 characterId 不符（await 期間已切角色）→ 丟棄，不寫回
      if (characterId.value === id && !itemsDirty.changedSince(snap)) items.value = list
      return list
    } catch (err) {
      if (characterId.value === id) itemsError.value = err
      logger.error('refetchItems failed:', err)
      throw err
    } finally {
      if (characterId.value === id) itemsLoading.value = false
    }
  })
  const refetchItems = (): Promise<InventoryItemDTO[]> => {
    const id = characterId.value
    if (!id) return Promise.resolve([])
    return itemsFlight.run(id)
  }

  const refetchCurrency = async (): Promise<CharacterCurrencyDTO | null> => {
    const id = characterId.value
    if (!id) return null
    currencyLoading.value = true
    currencyError.value = null
    try {
      const next = await characters().currency.get(id)
      // await 期間若已切角色，丟棄 stale 結果
      if (characterId.value === id) currency.value = next
      return next
    } catch (err) {
      if (characterId.value === id) currencyError.value = err
      logger.error('refetchCurrency failed:', err)
      throw err
    } finally {
      if (characterId.value === id) currencyLoading.value = false
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
    itemsDirty.bump()
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
    itemsDirty.bump()
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
    // 重入 safety net：UI disabled 為主要閘門，這層僅防 disabled 失效或非 UI 路徑的並發；
    // no-op 而非 throw，避免 caller 誤報錯誤 toast（對齊 patchItem）
    if (pendingItemIds.value.has(itemId)) return
    pendingItemIds.value = new Set(pendingItemIds.value).add(itemId)
    items.value = items.value.filter((i) => i.id !== itemId)
    itemsDirty.bump()
    try {
      await characters().inventory.remove(characterId.value, itemId)
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

  /** 設定第 slotIndex 個 attunement slot；newItemId=null 表示清空該 slot。 */
  const setAttunement = async (slotIndex: number, newItemId: string | null): Promise<void> => {
    const cap = attunedCap.value
    if (slotIndex < 0 || slotIndex >= cap) return
    const current = attunedItems.value[slotIndex] ?? null
    if (current?.id === newItemId) return

    // 先驗證 newItemId 確實存在，再 detach 舊的；否則「清掉舊同調卻找不到新的」會留下空 slot（部分成功）
    const target = newItemId ? (items.value.find((i) => i.id === newItemId) ?? null) : null
    if (newItemId && !target) return

    // 兩步 detach→attach 無法在前端做到真原子；patchItem 失敗時自身會 refetch 對齊 server truth，這裡不再額外 catch
    if (current) {
      await patchItem(current.id, { updatedAt: current.updatedAt, isAttuned: false })
    }
    if (target) {
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
    // peekById：唯讀計算不需防禦性 clone，避免每次重算深拷貝整張角色卡
    const character = characterStore.peekById(characterId.value)
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
    const character = characterStore.peekById(characterId.value)
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
