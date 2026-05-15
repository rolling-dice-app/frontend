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
