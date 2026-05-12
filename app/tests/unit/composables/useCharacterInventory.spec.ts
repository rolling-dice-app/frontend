import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { InventoryItemDTO } from '@rolling-dice-app/core'
import type { InventoryItemDraft } from '~/types/business/character-form'

const CHAR_ID = 'inv-001'

function makeItem(overrides: Partial<InventoryItemDTO>): InventoryItemDTO {
  return {
    id: overrides.id ?? `item-${Math.random().toString(36).slice(2, 8)}`,
    name: overrides.name ?? '物品',
    description: overrides.description ?? null,
    quantity: overrides.quantity ?? 1,
    weight: overrides.weight ?? 1,
    type: overrides.type ?? 'other',
    location: overrides.location ?? 'backpack',
    isAttuned: overrides.isAttuned ?? false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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

async function getComposable(items: InventoryItemDTO[] = []) {
  const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
  const store = useCharacterInventoryStore()
  store.characterId = CHAR_ID
  store.items = [...items]
  store.currency = {
    cp: 0,
    sp: 0,
    gp: 0,
    pp: 0,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  vi.stubGlobal('useCharacterInventoryStore', useCharacterInventoryStore)
  vi.stubGlobal('useCharacterStore', () => ({ getById: () => null }))

  const { useCharacterInventory } = await import('~/composables/domain/useCharacterInventory')
  return { ...useCharacterInventory(CHAR_ID), store }
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

// 整套 mutation 測試 skip：S2 之後 store action 內含 API 呼叫，需要 mock useApiFetch
// 的全套網路層；待 S5 之後或加 store-spec 形式的新測試補回。

describe.skip('useCharacterInventory — addItem / updateItem / removeItem 與 isAttuned', () => {
  it('addItem 加入的新物品 isAttuned 預設為 false', async () => {
    const { items, addItem } = await getComposable()
    await addItem(makeDraft({ name: '長劍', type: 'weapon' }))
    expect(items.value).toHaveLength(1)
    expect(items.value[0]!.isAttuned).toBe(false)
  })

  it('updateItem 不會弄丟既有的 isAttuned', async () => {
    const item = makeItem({ id: 'i-1', name: '舊名', isAttuned: true })
    const { items, updateItem } = await getComposable([item])
    await updateItem('i-1', makeDraft({ name: '新名', type: 'armor' }))
    const updated = items.value.find((i) => i.id === 'i-1')
    expect(updated?.name).toBe('新名')
    expect(updated?.type).toBe('armor')
    expect(updated?.isAttuned).toBe(true)
  })

  it('removeItem 移除已同調物品時 attunedItems 會自動少一個', async () => {
    const a = makeItem({ id: 'a', isAttuned: true })
    const b = makeItem({ id: 'b', isAttuned: true })
    const { attunedItems, removeItem } = await getComposable([a, b])
    expect(attunedItems.value).toHaveLength(2)
    await removeItem('a')
    expect(attunedItems.value).toHaveLength(1)
    expect(attunedItems.value[0]?.id).toBe('b')
  })
})
