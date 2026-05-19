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
  it('失敗時 refetch server truth 並 rethrow（不能用進入時 snapshot 蓋掉並行 mutation 結果）', async () => {
    const item = makeItem({ id: 'i-1', quantity: 1 })
    // 1st list: 初始 load
    mockInventoryList.mockResolvedValueOnce([item])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())
    // 2nd list: catch 內 refetchItems → server 仍是 quantity=1
    mockInventoryList.mockResolvedValueOnce([item])
    mockInventoryPatch.mockRejectedValue(new Error('patch boom'))

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    await expect(
      store.patchItem('i-1', { updatedAt: item.updatedAt, quantity: 99 }),
    ).rejects.toThrow('patch boom')

    // 失敗後本地對齊 server truth（server 仍是 quantity=1）；refetch 應被呼叫
    expect(mockInventoryList).toHaveBeenCalledTimes(2)
    expect(store.items[0]?.quantity).toBe(1)
  })

  it('A 失敗 refetch 時，B 已成功寫入 server 的較新狀態應被保留', async () => {
    const a = makeItem({ id: 'i-a', quantity: 1 })
    const b = makeItem({ id: 'i-b', quantity: 1 })
    // 1st list: 初始 load → [a, b]
    mockInventoryList.mockResolvedValueOnce([a, b])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())
    // catch 內 refetchItems → server 顯示 a 沒變、b 已更新到 5（並行 B mutation 已成功的 server truth）
    const bAfter = makeItem({ id: 'i-b', quantity: 5, updatedAt: '2026-05-02T00:00:00.000Z' })
    mockInventoryList.mockResolvedValueOnce([a, bAfter])
    mockInventoryPatch.mockRejectedValue(new Error('a patch boom'))

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    await expect(store.patchItem('i-a', { updatedAt: a.updatedAt, quantity: 99 })).rejects.toThrow(
      'a patch boom',
    )

    // B 的 server truth (quantity=5) 不可被舊 snapshot 蓋成 1
    expect(store.items.find((i) => i.id === 'i-b')?.quantity).toBe(5)
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

describe('character-inventory store — patchItem in-flight 守衛', () => {
  const deferredPatch = (): { resolve: () => void } => {
    const ref: { resolve: () => void } = { resolve: () => {} }
    mockInventoryPatch.mockImplementation(
      () =>
        new Promise<void>((res) => {
          ref.resolve = () => res()
        }),
    )
    return ref
  }

  it('patch 進行中 pendingItemIds 含該 id，resolve（含 refetch）後移除', async () => {
    const item = makeItem({ id: 'i-1' })
    mockInventoryList.mockResolvedValue([item])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())
    const gate = deferredPatch()

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    const p = store.patchItem('i-1', { updatedAt: item.updatedAt, quantity: 9 })
    await Promise.resolve()
    expect(store.pendingItemIds.has('i-1')).toBe(true)

    gate.resolve()
    await p
    expect(store.pendingItemIds.has('i-1')).toBe(false)
  })

  it('in-flight 期間對同 id 再呼叫 patchItem → 底層 patch 只呼叫一次（重入 no-op，不 throw）', async () => {
    const item = makeItem({ id: 'i-1' })
    mockInventoryList.mockResolvedValue([item])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())
    const gate = deferredPatch()

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    const p1 = store.patchItem('i-1', { updatedAt: item.updatedAt, quantity: 9 })
    await Promise.resolve()
    // 重入：應 no-op resolve，不 throw、不再打 API
    await expect(
      store.patchItem('i-1', { updatedAt: item.updatedAt, quantity: 8 }),
    ).resolves.toBeUndefined()
    expect(mockInventoryPatch).toHaveBeenCalledTimes(1)

    gate.resolve()
    await p1
  })

  it('moveItem in-flight 期間再次 moveItem 同 id 被守衛擋下（只送一次 patch）', async () => {
    const item = makeItem({ id: 'i-1', location: 'backpack' })
    mockInventoryList.mockResolvedValue([item])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())
    const gate = deferredPatch()

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    const p1 = store.moveItem('i-1')
    await Promise.resolve()
    await store.moveItem('i-1') // 第二次連點：store 尚未 refetch，被 pending 守衛 no-op
    expect(mockInventoryPatch).toHaveBeenCalledTimes(1)

    gate.resolve()
    await p1
    expect(store.pendingItemIds.has('i-1')).toBe(false)
  })

  it('setAttunement 兩段 patch 完成後 pendingItemIds 清空', async () => {
    seedCharacterInStore(createMockCharacter({ id: 'char-1' }))
    const current = makeItem({ id: 'i-current', isAttuned: true })
    const target = makeItem({ id: 'i-new', isAttuned: false })
    mockInventoryList.mockResolvedValueOnce([current, target])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())
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
    expect(store.pendingItemIds.size).toBe(0)
  })
})

describe('character-inventory store — refetchItems 序列化（防倒流）', () => {
  it('飛行中再次 refetch 合併成尾隨一次；最後套用最新回應，舊回應不覆蓋', async () => {
    mockInventoryList.mockResolvedValueOnce([makeItem({ id: 'i-1', quantity: 1 })])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    // 第一次 run → 舊快照；尾隨 run → 最新快照
    mockInventoryList
      .mockResolvedValueOnce([makeItem({ id: 'i-1', quantity: 1 })])
      .mockResolvedValueOnce([
        makeItem({ id: 'i-1', quantity: 9, updatedAt: '2026-05-09T00:00:00.000Z' }),
      ])

    const p1 = store.refetchItems()
    const p2 = store.refetchItems() // 飛行中 → 合併、不並行
    await Promise.all([p1, p2])

    expect(store.items[0]?.quantity).toBe(9) // 最新；未被先發後到的舊回應覆蓋
    // load(1) + 第一次 run(1) + 尾隨 run(1)；p2 未觸發第 4 次
    expect(mockInventoryList).toHaveBeenCalledTimes(3)
  })

  it('refetch 飛行期間發生 optimistic patch → 該 GET 回應不覆蓋；尾隨 refetch 對齊 server', async () => {
    const initial = makeItem({ id: 'i-1', quantity: 1 })
    mockInventoryList.mockResolvedValueOnce([initial]) // load
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    // GET#1（手動 refetch）卡住，回來時帶舊快照 q=1
    let releaseGet1: () => void = () => {}
    mockInventoryList.mockImplementationOnce(
      () =>
        new Promise((res) => {
          releaseGet1 = () => res([makeItem({ id: 'i-1', quantity: 1 })])
        }),
    )
    // 尾隨 GET#2：server truth 已含 patch
    mockInventoryList.mockResolvedValueOnce([
      makeItem({ id: 'i-1', quantity: 7, updatedAt: '2026-05-09T00:00:00.000Z' }),
    ])
    mockInventoryPatch.mockResolvedValue()

    const pRefetch = store.refetchItems() // GET#1 飛行中，gen 已擷取
    await Promise.resolve()
    const pPatch = store.patchItem('i-1', { updatedAt: initial.updatedAt, quantity: 7 })
    await Promise.resolve()
    expect(store.items[0]?.quantity).toBe(7) // optimistic 立即生效

    releaseGet1() // 舊 GET#1 回來（q=1）
    await Promise.all([pRefetch, pPatch])

    expect(store.items[0]?.quantity).toBe(7) // 從未被舊快照蓋回 1
  })

  it('burst 多次觸發只收斂為一次尾隨 GET', async () => {
    mockInventoryList.mockResolvedValueOnce([makeItem({ id: 'i-1' })])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    mockInventoryList.mockResolvedValue([makeItem({ id: 'i-1', quantity: 2 })])
    await Promise.all([
      store.refetchItems(),
      store.refetchItems(),
      store.refetchItems(),
      store.refetchItems(),
    ])

    // load(1) + 第一次 run(1) + 合併後尾隨(1)；其餘並發呼叫被合併
    expect(mockInventoryList).toHaveBeenCalledTimes(3)
  })
})

describe('character-inventory store — removeItem', () => {
  it('失敗時 refetch server truth 並 rethrow（不能用進入時 snapshot 蓋掉並行 mutation 結果）', async () => {
    const item = makeItem({ id: 'i-1' })
    // 1st list: 初始 load
    mockInventoryList.mockResolvedValueOnce([item])
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency())
    // 2nd list: catch 內 refetchItems → server 仍有 item
    mockInventoryList.mockResolvedValueOnce([item])
    mockInventoryRemove.mockRejectedValue(new Error('remove boom'))

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    await expect(store.removeItem('i-1')).rejects.toThrow('remove boom')

    expect(mockInventoryList).toHaveBeenCalledTimes(2)
    expect(store.items.map((i) => i.id)).toEqual(['i-1'])
  })
})

describe('character-inventory store — updateCurrency', () => {
  it('失敗時 refetch server truth 並 rethrow', async () => {
    mockInventoryList.mockResolvedValueOnce([])
    // 1st get: 初始 load
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency({ gp: 100 }))
    // 2nd get: catch 內 refetchCurrency → server 仍是 100
    mockCurrencyGet.mockResolvedValueOnce(makeCurrency({ gp: 100 }))
    mockCurrencyPatch.mockRejectedValue(new Error('currency patch boom'))

    const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
    const store = useCharacterInventoryStore()
    await store.load('char-1')

    await expect(
      store.updateCurrency({ updatedAt: store.currency!.updatedAt, gp: 0 }),
    ).rejects.toThrow('currency patch boom')

    expect(mockCurrencyGet).toHaveBeenCalledTimes(2)
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
