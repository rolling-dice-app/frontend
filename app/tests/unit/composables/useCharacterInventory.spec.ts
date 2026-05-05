import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHARACTERS_STORAGE_KEY } from '~/constants/storage'
import { createMockCharacter } from '~/tests/fixtures/character'
import type { InventoryItem } from '@rolling-dice-app/types'
import type { InventoryItemDraft } from '~/types/business/character-form'

const CHAR_ID = 'inv-001'

function makeItem(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: overrides.id ?? `item-${Math.random().toString(36).slice(2, 8)}`,
    name: overrides.name ?? '物品',
    description: overrides.description ?? null,
    quantity: overrides.quantity ?? 1,
    weight: overrides.weight ?? 1,
    type: overrides.type ?? 'other',
    location: overrides.location ?? 'backpack',
    isAttuned: overrides.isAttuned ?? false,
  }
}

function makeDraft(overrides: Partial<InventoryItemDraft> = {}): InventoryItemDraft {
  return {
    name: overrides.name ?? '新物品',
    description: overrides.description ?? null,
    quantity: overrides.quantity ?? 1,
    weight: overrides.weight ?? 1,
    type: overrides.type ?? 'other',
    location: overrides.location ?? 'backpack',
  }
}

async function getComposable(characterId: string, items: InventoryItem[] = []) {
  const character = createMockCharacter({ id: characterId, items })
  localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([character]))

  const { useCharacterStore } = await import('~/stores/character')
  vi.stubGlobal('useCharacterStore', useCharacterStore)

  const { useCharacterInventory } = await import('~/composables/domain/useCharacterInventory')
  return useCharacterInventory(characterId)
}

beforeEach(() => {
  vi.resetModules()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  localStorage.clear()
})

describe('useCharacterInventory — addItem / updateItem / removeItem 與 isAttuned', () => {
  it('addItem 加入的新物品 isAttuned 預設為 false', async () => {
    const { items, addItem } = await getComposable(CHAR_ID)
    addItem(makeDraft({ name: '長劍', type: 'weapon' }))
    expect(items.value).toHaveLength(1)
    expect(items.value[0]!.isAttuned).toBe(false)
  })

  it('updateItem 不會弄丟既有的 isAttuned', async () => {
    const item = makeItem({ id: 'i-1', name: '舊名', isAttuned: true })
    const { items, updateItem } = await getComposable(CHAR_ID, [item])
    updateItem('i-1', makeDraft({ name: '新名', type: 'armor' }))
    const updated = items.value.find((i) => i.id === 'i-1')
    expect(updated?.name).toBe('新名')
    expect(updated?.type).toBe('armor')
    expect(updated?.isAttuned).toBe(true)
  })

  it('removeItem 移除已同調物品時 attunedItems 會自動少一個', async () => {
    const a = makeItem({ id: 'a', isAttuned: true })
    const b = makeItem({ id: 'b', isAttuned: true })
    const { attunedItems, removeItem } = await getComposable(CHAR_ID, [a, b])
    expect(attunedItems.value).toHaveLength(2)
    removeItem('a')
    expect(attunedItems.value).toHaveLength(1)
    expect(attunedItems.value[0]?.id).toBe('b')
  })
})

describe('useCharacterInventory — setAttunement', () => {
  it('setAttunement(0, itemA) 將 itemA 設為已同調', async () => {
    const a = makeItem({ id: 'a' })
    const { items, attunedItems, setAttunement } = await getComposable(CHAR_ID, [a])
    setAttunement(0, 'a')
    expect(items.value.find((i) => i.id === 'a')?.isAttuned).toBe(true)
    expect(attunedItems.value).toEqual([expect.objectContaining({ id: 'a' })])
  })

  it('切換同一個 slot 至另一個物品，舊物品變 false、新物品變 true', async () => {
    const a = makeItem({ id: 'a', isAttuned: true })
    const b = makeItem({ id: 'b' })
    const { items, attunedItems, setAttunement } = await getComposable(CHAR_ID, [a, b])
    setAttunement(0, 'b')
    expect(items.value.find((i) => i.id === 'a')?.isAttuned).toBe(false)
    expect(items.value.find((i) => i.id === 'b')?.isAttuned).toBe(true)
    expect(attunedItems.value).toHaveLength(1)
    expect(attunedItems.value[0]?.id).toBe('b')
  })

  it('setAttunement(0, null) 解除該 slot', async () => {
    const a = makeItem({ id: 'a', isAttuned: true })
    const { items, attunedItems, setAttunement } = await getComposable(CHAR_ID, [a])
    setAttunement(0, null)
    expect(items.value.find((i) => i.id === 'a')?.isAttuned).toBe(false)
    expect(attunedItems.value).toHaveLength(0)
  })

  it('slotIndex 超出 ATTUNEMENT_SLOT_COUNT 範圍時不變更狀態', async () => {
    const a = makeItem({ id: 'a' })
    const { items, setAttunement } = await getComposable(CHAR_ID, [a])
    setAttunement(3, 'a')
    setAttunement(-1, 'a')
    expect(items.value.find((i) => i.id === 'a')?.isAttuned).toBe(false)
  })

  it('newItemId 與該 slot 當前物品相同時為 no-op', async () => {
    const a = makeItem({ id: 'a', isAttuned: true })
    const { items, setAttunement } = await getComposable(CHAR_ID, [a])
    setAttunement(0, 'a')
    expect(items.value.find((i) => i.id === 'a')?.isAttuned).toBe(true)
  })

  it('已同調 3 件後，第 4 個 slot 不存在；attunedItems 仍只有 3 件', async () => {
    const a = makeItem({ id: 'a', isAttuned: true })
    const b = makeItem({ id: 'b', isAttuned: true })
    const c = makeItem({ id: 'c', isAttuned: true })
    const d = makeItem({ id: 'd' })
    const { attunedItems, setAttunement } = await getComposable(CHAR_ID, [a, b, c, d])
    expect(attunedItems.value).toHaveLength(3)
    // slotIndex=3 超界 → no-op
    setAttunement(3, 'd')
    expect(attunedItems.value).toHaveLength(3)
    expect(attunedItems.value.find((i) => i.id === 'd')).toBeUndefined()
  })
})
