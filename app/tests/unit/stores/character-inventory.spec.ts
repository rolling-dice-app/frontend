import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CharacterCurrencyDTO,
  CharacterCurrencyUpdateBody,
  InventoryItemDTO,
  InventoryItemUpdateBody,
} from '@rolling-dice-app/core'
import { createMockCharacter, seedCharacterInStore } from '~/tests/fixtures/character'
import type { InventoryItemDraft } from '~/types/business/character-form'

const mockInventoryList = vi.fn<(id: string) => Promise<InventoryItemDTO[]>>()
const mockInventoryAdd = vi.fn<(...args: unknown[]) => Promise<InventoryItemDTO>>()
const mockInventoryPatch =
  vi.fn<(id: string, itemId: string, body: InventoryItemUpdateBody) => Promise<void>>()
const mockInventoryRemove = vi.fn<(id: string, itemId: string) => Promise<void>>()
const mockCurrencyGet = vi.fn<(id: string) => Promise<CharacterCurrencyDTO>>()
const mockCurrencyPatch = vi.fn<(id: string, body: CharacterCurrencyUpdateBody) => Promise<void>>()

beforeEach(async () => {
  vi.resetModules()
  setActivePinia(createPinia())
  mockInventoryList.mockReset()
  mockInventoryAdd.mockReset()
  mockInventoryPatch.mockReset()
  mockInventoryRemove.mockReset()
  mockCurrencyGet.mockReset()
  mockCurrencyPatch.mockReset()
  vi.stubGlobal('characters', () => ({
    inventory: {
      list: mockInventoryList,
      add: mockInventoryAdd,
      patch: mockInventoryPatch,
      remove: mockInventoryRemove,
    },
    currency: {
      get: mockCurrencyGet,
      patch: mockCurrencyPatch,
    },
  }))
  // inventory store setup 內部會呼叫 useCharacterStore()（auto-import）
  const { useCharacterStore } = await import('~/stores/character')
  vi.stubGlobal('useCharacterStore', useCharacterStore)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const makeItem = (overrides: Partial<InventoryItemDTO> = {}): InventoryItemDTO => ({
  id: 'item-1',
  name: '長劍',
  description: null,
  quantity: 1,
  weight: 3,
  type: 'weapon',
  location: 'backpack',
  isAttuned: false,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
  ...overrides,
})

const makeCurrency = (overrides: Partial<CharacterCurrencyDTO> = {}): CharacterCurrencyDTO => ({
  cp: 0,
  sp: 0,
  gp: 100,
  pp: 0,
  updatedAt: '2026-05-01T00:00:00.000Z',
  ...overrides,
})

describe('character-inventory store — load', () => {
  it('items 與 currency 平行 fetch；其一失敗不影響另一個', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockInventoryList.mockResolvedValue([makeItem()])
    mockCurrencyGet.mockRejectedValue(new Error('currency boom'))

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    expect(store.items).toHaveLength(1)
    expect(store.itemsError).toBeNull()
    expect(store.currency).toBeNull()
    expect(store.currencyError).toMatchObject({ message: 'currency boom' })
    expect(consoleError).toHaveBeenCalled()
  })
})

describe('character-inventory store — patchItem', () => {
  it('失敗時還原 items 快照並 rethrow', async () => {
    const item = makeItem({ id: 'i-1', quantity: 1 })
    mockInventoryList.mockResolvedValueOnce([item])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())
    mockInventoryPatch.mockRejectedValue(new Error('patch boom'))

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    await expect(
      store.patchItem('i-1', { updatedAt: item.updatedAt, quantity: 99 }),
    ).rejects.toThrow('patch boom')

    expect(store.items[0]?.quantity).toBe(1)
  })

  it('成功時 optimistic 套用、PATCH、再 refetch 同步 server 結果', async () => {
    const before = makeItem({ id: 'i-1', quantity: 1 })
    const after = makeItem({
      id: 'i-1',
      quantity: 99,
      updatedAt: '2026-05-02T00:00:00.000Z',
    })
    mockInventoryList.mockResolvedValueOnce([before]).mockResolvedValueOnce([after])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())
    mockInventoryPatch.mockResolvedValue()

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    await store.patchItem('i-1', { updatedAt: before.updatedAt, quantity: 99 })

    expect(mockInventoryPatch).toHaveBeenCalledOnce()
    expect(store.items[0]?.quantity).toBe(99)
    expect(store.items[0]?.updatedAt).toBe('2026-05-02T00:00:00.000Z')
  })
})

describe('character-inventory store — removeItem', () => {
  it('失敗時還原 items 快照並 rethrow', async () => {
    const item = makeItem({ id: 'i-1' })
    mockInventoryList.mockResolvedValueOnce([item])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())
    mockInventoryRemove.mockRejectedValue(new Error('remove boom'))

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    await expect(store.removeItem('i-1')).rejects.toThrow('remove boom')
    expect(store.items.map((i) => i.id)).toEqual(['i-1'])
  })
})

describe('character-inventory store — updateCurrency', () => {
  it('失敗時還原 currency 快照並 rethrow', async () => {
    mockInventoryList.mockResolvedValueOnce([])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency({ gp: 100 }))
    mockCurrencyPatch.mockRejectedValue(new Error('currency patch boom'))

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    await expect(
      store.updateCurrency({ updatedAt: store.currency!.updatedAt, gp: 0 }),
    ).rejects.toThrow('currency patch boom')

    expect(store.currency?.gp).toBe(100)
  })
})

describe('character-inventory store — setAttunement', () => {
  beforeEach(() => {
    seedCharacterInStore(createMockCharacter({ id: 'char-1' }))
  })

  it('slot 已佔用時：先 detach 舊物、再 attach 新物', async () => {
    const current = makeItem({ id: 'i-current', isAttuned: true })
    const target = makeItem({ id: 'i-new', isAttuned: false })
    mockInventoryList.mockResolvedValueOnce([current, target])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())
    // patchItem 之間會 refetch；提供穩定的後續清單
    mockInventoryList.mockResolvedValue([
      { ...current, isAttuned: false },
      { ...target, isAttuned: true },
    ])
    mockInventoryPatch.mockResolvedValue()

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    await store.setAttunement(0, 'i-new')

    expect(mockInventoryPatch).toHaveBeenCalledTimes(2)
    const [first, second] = mockInventoryPatch.mock.calls
    expect(first?.[1]).toBe('i-current')
    expect(first?.[2].isAttuned).toBe(false)
    expect(second?.[1]).toBe('i-new')
    expect(second?.[2].isAttuned).toBe(true)
  })

  it('slot 為空時：只 attach 新物，不發 detach', async () => {
    const target = makeItem({ id: 'i-new', isAttuned: false })
    mockInventoryList.mockResolvedValueOnce([target])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())
    mockInventoryList.mockResolvedValue([{ ...target, isAttuned: true }])
    mockInventoryPatch.mockResolvedValue()

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    await store.setAttunement(0, 'i-new')

    expect(mockInventoryPatch).toHaveBeenCalledOnce()
    expect(mockInventoryPatch.mock.calls[0]?.[1]).toBe('i-new')
    expect(mockInventoryPatch.mock.calls[0]?.[2].isAttuned).toBe(true)
  })

  it('detach 成功、attach 失敗時：rethrow 並 refetch 與 server 對齊', async () => {
    const current = makeItem({ id: 'i-current', isAttuned: true })
    const target = makeItem({ id: 'i-new', isAttuned: false })
    // 1st list: 初始 load
    mockInventoryList.mockResolvedValueOnce([current, target])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())
    // 2nd list: detach 成功後 patchItem 內部 refetch
    mockInventoryList.mockResolvedValueOnce([{ ...current, isAttuned: false }, target])
    // 3rd list: catch 內 refetchItems —— server 顯示「current 已 detach、target 仍未 attune」
    mockInventoryList.mockResolvedValueOnce([{ ...current, isAttuned: false }, target])

    mockInventoryPatch.mockResolvedValueOnce() // detach
    mockInventoryPatch.mockRejectedValueOnce(new Error('attach boom'))

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    await expect(store.setAttunement(0, 'i-new')).rejects.toThrow('attach boom')

    expect(mockInventoryList).toHaveBeenCalledTimes(3)
    expect(store.items.find((i) => i.id === 'i-current')?.isAttuned).toBe(false)
    expect(store.items.find((i) => i.id === 'i-new')?.isAttuned).toBe(false)
  })

  it('目標已在該 slot 時：no-op', async () => {
    const current = makeItem({ id: 'i-current', isAttuned: true })
    mockInventoryList.mockResolvedValueOnce([current])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    await store.setAttunement(0, 'i-current')

    expect(mockInventoryPatch).not.toHaveBeenCalled()
  })
})

describe('character-inventory store — reset', () => {
  it('清掉 items / currency / 錯誤 / characterId', async () => {
    mockInventoryList.mockResolvedValueOnce([makeItem()])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    store.reset()

    expect(store.characterId).toBeNull()
    expect(store.items).toEqual([])
    expect(store.currency).toBeNull()
    expect(store.itemsError).toBeNull()
    expect(store.currencyError).toBeNull()
  })
})

describe('character-inventory store — guard clauses', () => {
  it('store 未 load 前呼叫 mutation 會 throw', async () => {
    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    const draft: InventoryItemDraft = {
      name: '繩索',
      description: null,
      quantity: 1,
      weight: 5,
      type: 'other',
      location: 'backpack',
    }
    await expect(store.addItem(draft)).rejects.toThrow(/not loaded/)
    await expect(store.removeItem('any')).rejects.toThrow(/not loaded/)
    await expect(
      store.updateCurrency({ updatedAt: '2026-01-01T00:00:00.000Z', gp: 1 }),
    ).rejects.toThrow(/not loaded/)
  })
})
