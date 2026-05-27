import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  SpellEntryCreateBody,
  SpellEntryDTO,
  SpellEntryUpdateBody,
} from '@rolling-dice-app/core'

const FLAG_DEBOUNCE_MS = 300

const mockSpellsList = vi.fn<(id: string) => Promise<SpellEntryDTO[]>>()
const mockSpellsLearn = vi.fn<(id: string, body: SpellEntryCreateBody) => Promise<SpellEntryDTO>>()
const mockSpellsForget = vi.fn<(id: string, spellId: string) => Promise<void>>()
const mockSpellsPatch =
  vi.fn<(id: string, spellId: string, body: SpellEntryUpdateBody) => Promise<void>>()

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetModules()
  setActivePinia(createPinia())
  mockSpellsList.mockReset()
  mockSpellsLearn.mockReset()
  mockSpellsForget.mockReset()
  mockSpellsPatch.mockReset()
  vi.stubGlobal('characters', () => ({
    spells: {
      list: mockSpellsList,
      learn: mockSpellsLearn,
      forget: mockSpellsForget,
      patch: mockSpellsPatch,
    },
  }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const makeEntry = (overrides: Partial<SpellEntryDTO> = {}): SpellEntryDTO => ({
  id: 'entry-1',
  spellId: 'fireball',
  isPrepared: false,
  isFavorite: false,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
  ...overrides,
})

describe('character-spells store — learn / forget', () => {
  it('learn 成功時 append entry', async () => {
    mockSpellsList.mockResolvedValueOnce([])
    const created = makeEntry({ id: 'e-new', spellId: 'magicMissile' })
    mockSpellsLearn.mockResolvedValue(created)

    const { useCharacterSpellsStore } = await import('~/stores/character-spells')
    const store = useCharacterSpellsStore()
    await store.load('char-1')

    const result = await store.learn('magicMissile')

    expect(mockSpellsLearn).toHaveBeenCalledWith('char-1', { spellId: 'magicMissile' })
    expect(result).toEqual(created)
    expect(store.entries.map((e) => e.spellId)).toEqual(['magicMissile'])
  })

  it('forget 失敗時還原本地 entries 並 rethrow', async () => {
    const a = makeEntry({ id: 'e-a', spellId: 'fireball' })
    const b = makeEntry({ id: 'e-b', spellId: 'shield' })
    mockSpellsList.mockResolvedValueOnce([a, b])
    mockSpellsForget.mockRejectedValue(new Error('forget boom'))

    const { useCharacterSpellsStore } = await import('~/stores/character-spells')
    const store = useCharacterSpellsStore()
    await store.load('char-1')

    await expect(store.forget('fireball')).rejects.toThrow('forget boom')
    expect(store.entries.map((e) => e.spellId)).toEqual(['fireball', 'shield'])
  })
})

describe('character-spells store — toggleFlag debounce', () => {
  it('togglePrepared 立即翻 local flag，debounce 後才送 PATCH', async () => {
    const entry = makeEntry({ spellId: 'fireball', isPrepared: false })
    mockSpellsList
      .mockResolvedValueOnce([entry])
      .mockResolvedValue([{ ...entry, isPrepared: true }])
    mockSpellsPatch.mockResolvedValue()

    const { useCharacterSpellsStore } = await import('~/stores/character-spells')
    const store = useCharacterSpellsStore()
    await store.load('char-1')

    store.togglePrepared('fireball')
    // 視覺立刻翻
    expect(store.entries[0]?.isPrepared).toBe(true)
    // 尚未送 PATCH
    expect(mockSpellsPatch).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(FLAG_DEBOUNCE_MS)

    expect(mockSpellsPatch).toHaveBeenCalledOnce()
    const [, spellId, body] = mockSpellsPatch.mock.calls[0]!
    expect(spellId).toBe('fireball')
    expect(body).toMatchObject({ isPrepared: true, updatedAt: entry.updatedAt })
  })

  it('同 spell 短時間連點兩次只發一次 PATCH（debounce 合併）', async () => {
    const entry = makeEntry({ spellId: 'fireball', isPrepared: false })
    mockSpellsList.mockResolvedValueOnce([entry]).mockResolvedValue([entry])
    mockSpellsPatch.mockResolvedValue()

    const { useCharacterSpellsStore } = await import('~/stores/character-spells')
    const store = useCharacterSpellsStore()
    await store.load('char-1')

    store.togglePrepared('fireball')
    store.togglePrepared('fireball')
    // 翻了兩次回到原值
    expect(store.entries[0]?.isPrepared).toBe(false)

    await vi.advanceTimersByTimeAsync(FLAG_DEBOUNCE_MS)

    expect(mockSpellsPatch).toHaveBeenCalledOnce()
    const body = mockSpellsPatch.mock.calls[0]![2]
    expect(body.isPrepared).toBe(false)
  })

  it('同 spell 連點 prepared + favorite 應合併成單一 PATCH（避免兩個獨立 PATCH 帶同一 stale updatedAt 競態）', async () => {
    const entry = makeEntry({ spellId: 'fireball', isPrepared: false, isFavorite: false })
    mockSpellsList
      .mockResolvedValueOnce([entry])
      .mockResolvedValue([{ ...entry, isPrepared: true, isFavorite: true }])
    mockSpellsPatch.mockResolvedValue()

    const { useCharacterSpellsStore } = await import('~/stores/character-spells')
    const store = useCharacterSpellsStore()
    await store.load('char-1')

    store.togglePrepared('fireball')
    store.toggleFavorite('fireball')

    await vi.advanceTimersByTimeAsync(FLAG_DEBOUNCE_MS)

    expect(mockSpellsPatch).toHaveBeenCalledOnce()
    const body = mockSpellsPatch.mock.calls[0]![2]
    expect(body).toMatchObject({
      updatedAt: entry.updatedAt,
      isPrepared: true,
      isFavorite: true,
    })
  })

  it('不同 spell 的 toggle 各自獨立 debounce、互不合併', async () => {
    const a = makeEntry({ spellId: 'fireball' })
    const b = makeEntry({ id: 'entry-2', spellId: 'shield' })
    mockSpellsList.mockResolvedValueOnce([a, b]).mockResolvedValue([a, b])
    mockSpellsPatch.mockResolvedValue()

    const { useCharacterSpellsStore } = await import('~/stores/character-spells')
    const store = useCharacterSpellsStore()
    await store.load('char-1')

    store.togglePrepared('fireball')
    store.togglePrepared('shield')

    await vi.advanceTimersByTimeAsync(FLAG_DEBOUNCE_MS)

    expect(mockSpellsPatch).toHaveBeenCalledTimes(2)
    const spellIds = mockSpellsPatch.mock.calls.map((c) => c[1])
    expect(spellIds).toContain('fireball')
    expect(spellIds).toContain('shield')
  })

  it('PATCH 失敗時 mutationError 被設定且 refetch 取回 server truth', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const entry = makeEntry({ spellId: 'fireball', isPrepared: false })
    const serverTruth = makeEntry({ spellId: 'fireball', isPrepared: false })
    mockSpellsList.mockResolvedValueOnce([entry]).mockResolvedValue([serverTruth])
    const patchErr = new Error('patch boom')
    mockSpellsPatch.mockRejectedValue(patchErr)

    const { useCharacterSpellsStore } = await import('~/stores/character-spells')
    const store = useCharacterSpellsStore()
    await store.load('char-1')

    store.togglePrepared('fireball')
    await vi.advanceTimersByTimeAsync(FLAG_DEBOUNCE_MS)
    // 等 persistFlag catch 區的 refetch 跑完
    await vi.runAllTimersAsync()

    expect(store.mutationError).toBe(patchErr)
    // local 被 server truth 蓋回
    expect(store.entries[0]?.isPrepared).toBe(false)
    expect(consoleError).toHaveBeenCalled()
  })

  it('clearMutationError 把 mutationError 歸 null', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSpellsList.mockResolvedValueOnce([makeEntry()])
    const { useCharacterSpellsStore } = await import('~/stores/character-spells')
    const store = useCharacterSpellsStore()
    await store.load('char-1')

    // 直接寫入後驗證 clear
    mockSpellsPatch.mockRejectedValueOnce(new Error('boom'))
    mockSpellsList.mockResolvedValue([makeEntry()])
    store.togglePrepared('fireball')
    await vi.advanceTimersByTimeAsync(FLAG_DEBOUNCE_MS)
    await vi.runAllTimersAsync()
    expect(store.mutationError).not.toBeNull()

    store.clearMutationError()
    expect(store.mutationError).toBeNull()
    expect(consoleError).toHaveBeenCalled()
  })
})

const makeDeferred = <T>(): {
  promise: Promise<T>
  resolve: (v: T) => void
  reject: (e: unknown) => void
} => {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('character-spells store — race conditions', () => {
  // R1：飛行中又翻同一 spell；trailing PATCH 應使用 server 回的新 updatedAt，且本地 flag 不被覆蓋
  it('R1: 同 spell 在 PATCH 飛行中又被翻 → 用新 updatedAt 送 trailing PATCH，且保留最後一次本地 flag', async () => {
    const initial = makeEntry({ spellId: 'fireball', isPrepared: false, updatedAt: 'v0' })
    mockSpellsList.mockResolvedValueOnce([initial])
    const { useCharacterSpellsStore } = await import('~/stores/character-spells')
    const store = useCharacterSpellsStore()
    await store.load('char-1')

    // 第一輪 PATCH 用 deferred 控制；refresh 也用 deferred
    const patch1 = makeDeferred<undefined>()
    const list1 = makeDeferred<SpellEntryDTO[]>()
    mockSpellsPatch.mockReturnValueOnce(patch1.promise)
    mockSpellsList.mockReturnValueOnce(list1.promise)

    // t=0 click → 本地翻為 true
    store.togglePrepared('fireball')
    expect(store.entries[0]?.isPrepared).toBe(true)
    // 跑到 debounce
    await vi.advanceTimersByTimeAsync(FLAG_DEBOUNCE_MS)
    expect(mockSpellsPatch).toHaveBeenCalledTimes(1)
    expect(mockSpellsPatch.mock.calls[0]![2]).toMatchObject({ updatedAt: 'v0', isPrepared: true })

    // 飛行中再翻 → 本地回 false
    store.togglePrepared('fireball')
    expect(store.entries[0]?.isPrepared).toBe(false)

    // 第二輪 PATCH + list（trailing 才會用到）
    const patch2 = makeDeferred<undefined>()
    const list2 = makeDeferred<SpellEntryDTO[]>()
    mockSpellsPatch.mockReturnValueOnce(patch2.promise)
    mockSpellsList.mockReturnValueOnce(list2.promise)

    // 完成第一輪 PATCH + refresh
    patch1.resolve(undefined)
    list1.resolve([{ ...initial, isPrepared: true, updatedAt: 'v1' }])
    await vi.runAllTimersAsync()

    // 飛行期間又翻過 → server 來的 flag 不接，只接 updatedAt
    expect(store.entries[0]?.isPrepared).toBe(false)
    expect(store.entries[0]?.updatedAt).toBe('v1')

    // 第二輪 debounce 觸發 trailing PATCH，更新後 entry 為基準
    await vi.advanceTimersByTimeAsync(FLAG_DEBOUNCE_MS)
    expect(mockSpellsPatch).toHaveBeenCalledTimes(2)
    expect(mockSpellsPatch.mock.calls[1]![2]).toMatchObject({ updatedAt: 'v1', isPrepared: false })

    patch2.resolve(undefined)
    list2.resolve([{ ...initial, isPrepared: false, updatedAt: 'v2' }])
    await vi.runAllTimersAsync()

    expect(store.entries[0]?.isPrepared).toBe(false)
    expect(store.entries[0]?.updatedAt).toBe('v2')
  })

  // R2：A 的 PATCH 飛行中翻 B；A 完成後 refresh list 不可覆蓋 B 的 optimistic flip
  it('R2: A PATCH 飛行中翻 B → A refresh 回來不覆蓋 B 的 optimistic', async () => {
    const a0 = makeEntry({ id: 'e-a', spellId: 'A', isPrepared: false, updatedAt: 'va0' })
    const b0 = makeEntry({ id: 'e-b', spellId: 'B', isPrepared: false, updatedAt: 'vb0' })
    mockSpellsList.mockResolvedValueOnce([a0, b0])
    const { useCharacterSpellsStore } = await import('~/stores/character-spells')
    const store = useCharacterSpellsStore()
    await store.load('char-1')

    const patchA = makeDeferred<undefined>()
    const listAfterA = makeDeferred<SpellEntryDTO[]>()
    mockSpellsPatch.mockReturnValueOnce(patchA.promise)
    mockSpellsList.mockReturnValueOnce(listAfterA.promise)

    // 點 A → debounce → PATCH A 飛行中
    store.togglePrepared('A')
    await vi.advanceTimersByTimeAsync(FLAG_DEBOUNCE_MS)
    expect(mockSpellsPatch).toHaveBeenCalledTimes(1)

    // 飛行中點 B（本地翻 true）
    store.togglePrepared('B')
    expect(store.entries.find((e) => e.spellId === 'B')?.isPrepared).toBe(true)

    // A 完成；server list 仍認為 B = false（B 還沒 PATCH）
    patchA.resolve(undefined)
    listAfterA.resolve([
      { ...a0, isPrepared: true, updatedAt: 'va1' },
      { ...b0, isPrepared: false, updatedAt: 'vb0' },
    ])
    await vi.runAllTimersAsync()

    // A 接 server truth；B 保留 optimistic（不被覆蓋）
    expect(store.entries.find((e) => e.spellId === 'A')?.isPrepared).toBe(true)
    expect(store.entries.find((e) => e.spellId === 'A')?.updatedAt).toBe('va1')
    expect(store.entries.find((e) => e.spellId === 'B')?.isPrepared).toBe(true)

    // B debounce 已在飛行中 PATCH（trigger 點是 B click 後 300ms）；確認用的是正確 updatedAt
    const patchBCalls = mockSpellsPatch.mock.calls.filter((c) => c[1] === 'B')
    expect(patchBCalls.length).toBe(1)
    expect(patchBCalls[0]![2]).toMatchObject({ updatedAt: 'vb0', isPrepared: true })
  })

  // R3：同 spell 連點，PATCH 飛行中 debounce 再次觸發；不能用 stale updatedAt 發第二次 PATCH
  it('R3: PATCH 飛行中 debounce 再次觸發 → 排成 trailing，等第一輪結束後用新 updatedAt 發', async () => {
    const initial = makeEntry({ spellId: 'fireball', isPrepared: false, updatedAt: 'v0' })
    mockSpellsList.mockResolvedValueOnce([initial])
    const { useCharacterSpellsStore } = await import('~/stores/character-spells')
    const store = useCharacterSpellsStore()
    await store.load('char-1')

    const patch1 = makeDeferred<undefined>()
    const list1 = makeDeferred<SpellEntryDTO[]>()
    const patch2 = makeDeferred<undefined>()
    const list2 = makeDeferred<SpellEntryDTO[]>()
    mockSpellsPatch.mockReturnValueOnce(patch1.promise).mockReturnValueOnce(patch2.promise)
    mockSpellsList.mockReturnValueOnce(list1.promise).mockReturnValueOnce(list2.promise)

    // 第一次點 → debounce → PATCH 1 飛行中
    store.togglePrepared('fireball')
    await vi.advanceTimersByTimeAsync(FLAG_DEBOUNCE_MS)
    expect(mockSpellsPatch).toHaveBeenCalledTimes(1)
    expect(mockSpellsPatch.mock.calls[0]![2]).toMatchObject({ updatedAt: 'v0' })

    // 飛行中第二次點 + 等 debounce
    store.togglePrepared('fireball')
    await vi.advanceTimersByTimeAsync(FLAG_DEBOUNCE_MS)
    // 第一輪還沒結束，第二輪 PATCH 不能先發
    expect(mockSpellsPatch).toHaveBeenCalledTimes(1)

    // 第一輪結束 → trailing 觸發第二輪
    patch1.resolve(undefined)
    list1.resolve([{ ...initial, isPrepared: true, updatedAt: 'v1' }])
    await vi.runAllTimersAsync()

    expect(mockSpellsPatch).toHaveBeenCalledTimes(2)
    // 第二輪用新 updatedAt
    expect(mockSpellsPatch.mock.calls[1]![2]).toMatchObject({
      updatedAt: 'v1',
      isPrepared: false,
    })

    patch2.resolve(undefined)
    list2.resolve([{ ...initial, isPrepared: false, updatedAt: 'v2' }])
    await vi.runAllTimersAsync()

    expect(store.entries[0]?.updatedAt).toBe('v2')
  })
})

describe('character-spells store — flushPending / reset', () => {
  it('flushPending 立即觸發所有 pending 的 PATCH', async () => {
    const entry = makeEntry({ spellId: 'fireball' })
    mockSpellsList.mockResolvedValueOnce([entry]).mockResolvedValue([entry])
    mockSpellsPatch.mockResolvedValue()

    const { useCharacterSpellsStore } = await import('~/stores/character-spells')
    const store = useCharacterSpellsStore()
    await store.load('char-1')

    store.togglePrepared('fireball')
    expect(mockSpellsPatch).not.toHaveBeenCalled()

    store.flushPending()

    // flush 是同步觸發 persistFlag，但 patch 是 async；等 microtask
    await vi.runAllTimersAsync()

    expect(mockSpellsPatch).toHaveBeenCalledOnce()
  })

  it('reset 取消尚未觸發的 PATCH', async () => {
    const entry = makeEntry({ spellId: 'fireball' })
    mockSpellsList.mockResolvedValueOnce([entry])
    mockSpellsPatch.mockResolvedValue()

    const { useCharacterSpellsStore } = await import('~/stores/character-spells')
    const store = useCharacterSpellsStore()
    await store.load('char-1')

    store.togglePrepared('fireball')
    store.reset()

    await vi.advanceTimersByTimeAsync(FLAG_DEBOUNCE_MS)
    await vi.runAllTimersAsync()

    expect(mockSpellsPatch).not.toHaveBeenCalled()
    expect(store.characterId).toBeNull()
    expect(store.entries).toEqual([])
  })
})
