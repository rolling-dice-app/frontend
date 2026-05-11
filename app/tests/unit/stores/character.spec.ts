import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockCharacter,
  createMockFormState,
  createMockUpdateFormState,
} from '~/tests/fixtures/character'
import type { CharacterDTO, CharacterSummaryDTO, CharacterUpdateDTO } from '@rolling-dice-app/core'

const mockListCharacters = vi.fn<() => Promise<CharacterSummaryDTO[]>>()
const mockGetCharacter = vi.fn<(id: string) => Promise<CharacterDTO>>()
const mockCreateCharacter = vi.fn<(...args: unknown[]) => Promise<CharacterDTO>>()
const mockUpdateCharacter = vi.fn<(id: string, input: CharacterUpdateDTO) => Promise<void>>()
const mockDeleteCharacter = vi.fn<(id: string) => Promise<void>>()

beforeEach(() => {
  vi.resetModules()
  setActivePinia(createPinia())
  mockListCharacters.mockReset()
  mockGetCharacter.mockReset()
  mockCreateCharacter.mockReset()
  mockUpdateCharacter.mockReset()
  mockDeleteCharacter.mockReset()
  vi.stubGlobal('useCharacterApi', () => ({
    listCharacters: mockListCharacters,
    getCharacter: mockGetCharacter,
    createCharacter: mockCreateCharacter,
    updateCharacter: mockUpdateCharacter,
    deleteCharacter: mockDeleteCharacter,
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const charToSummary = (c: CharacterDTO): CharacterSummaryDTO => ({
  id: c.id,
  name: c.name,
  classes: c.classes,
  level: c.classes.reduce((sum, entry) => sum + entry.level, 0),
  avatar: c.avatar,
  updatedAt: c.updatedAt,
  race: c.race,
})

describe('character store — loadList', () => {
  it('成功時將 backend summary 直接寫入 list（含 race）', async () => {
    const c = createMockCharacter({ id: 'list-1', name: '測試', race: 'elf' })
    mockListCharacters.mockResolvedValue([charToSummary(c)])

    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    await store.loadList()

    expect(store.list).toHaveLength(1)
    expect(store.list[0]).toMatchObject({
      id: 'list-1',
      name: '測試',
      race: 'elf',
    })
    expect(store.listLoading).toBe(false)
    expect(store.listError).toBeNull()
  })

  it('過程中 listLoading 為 true，完成後為 false', async () => {
    let resolveFn: (v: CharacterSummaryDTO[]) => void = () => {}
    mockListCharacters.mockReturnValue(
      new Promise<CharacterSummaryDTO[]>((resolve) => {
        resolveFn = resolve
      }),
    )

    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    const pending = store.loadList()
    expect(store.listLoading).toBe(true)
    resolveFn([])
    await pending
    expect(store.listLoading).toBe(false)
  })

  it('失敗時 listError 被設定且 rethrow', async () => {
    const err = new Error('boom')
    mockListCharacters.mockRejectedValue(err)

    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    await expect(store.loadList()).rejects.toThrow('boom')
    expect(store.listError).toBe(err)
    expect(store.listLoading).toBe(false)
  })
})

describe('character store — loadDetail / getById', () => {
  it('成功時把 character 寫進 detailCache 並回傳深拷貝', async () => {
    const c = createMockCharacter({ id: 'detail-1' })
    mockGetCharacter.mockResolvedValue(c)

    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    const result = await store.loadDetail('detail-1')

    expect(result.id).toBe('detail-1')
    expect(store.detailCache.get('detail-1')?.id).toBe('detail-1')
    result.name = 'mutated'
    expect(store.detailCache.get('detail-1')?.name).not.toBe('mutated')
  })

  it('getById 從 cache 回傳深拷貝；cache 沒命中時回 undefined', async () => {
    const c = createMockCharacter({ id: 'detail-2', name: '原始' })
    mockGetCharacter.mockResolvedValue(c)

    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    expect(store.getById('not-exist')).toBeUndefined()

    await store.loadDetail('detail-2')
    const fetched = store.getById('detail-2')
    expect(fetched?.name).toBe('原始')
    fetched!.name = 'mutated'
    expect(store.getById('detail-2')?.name).toBe('原始')
  })

  it('失敗時 detailError 被設定且 rethrow', async () => {
    const err = new Error('not found')
    mockGetCharacter.mockRejectedValue(err)

    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    await expect(store.loadDetail('detail-x')).rejects.toThrow('not found')
    expect(store.detailError).toBe(err)
    expect(store.detailLoading).toBe(false)
  })
})

describe('character store — createCharacter', () => {
  it('將 formState 轉成 CharacterCreateDTO 送 API；回傳 character 加入 list 與 cache', async () => {
    const created = createMockCharacter({ id: 'created-1', name: '新建' })
    mockCreateCharacter.mockResolvedValue(created)

    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    const formState = createMockFormState({
      name: '新建',
      classes: [{ classKey: 'fighter', level: 1, subclass: null }],
    })
    const result = await store.createCharacter(formState)

    expect(mockCreateCharacter).toHaveBeenCalledOnce()
    const input = mockCreateCharacter.mock.calls[0]![0] as Record<string, unknown>
    expect(input.name).toBe('新建')
    const abilities = input.abilities as Record<string, { bonusScore: number }>
    expect(abilities.strength!.bonusScore).toBe(0)

    expect(result.id).toBe('created-1')
    expect(store.detailCache.get('created-1')?.id).toBe('created-1')
    expect(store.list).toHaveLength(1)
    expect(store.list[0]).toMatchObject({ id: 'created-1', name: '新建' })
  })

  it('avatar URL 透過 createInput 帶到 API；列表項保留 avatar', async () => {
    const url = 'https://avatars.example.com/u1/p.webp'
    const created = createMockCharacter({ id: 'created-2', name: '帶圖', avatar: url })
    mockCreateCharacter.mockResolvedValue(created)

    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    const formState = createMockFormState({ name: '帶圖', avatar: url })
    await store.createCharacter(formState)

    const input = mockCreateCharacter.mock.calls[0]![0] as Record<string, unknown>
    expect(input.avatar).toBe(url)
    expect(store.list[0]?.avatar).toBe(url)
  })
})

describe('character store — removeCharacter', () => {
  it('成功時呼叫 API、清掉 list 與 detailCache 對應 entry', async () => {
    const a = createMockCharacter({ id: 'rm-a', name: 'A' })
    const b = createMockCharacter({ id: 'rm-b', name: 'B' })
    mockListCharacters.mockResolvedValue([charToSummary(a), charToSummary(b)])
    mockGetCharacter.mockResolvedValue(a)
    mockDeleteCharacter.mockResolvedValue(undefined)

    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    await store.loadList()
    await store.loadDetail('rm-a')

    await store.removeCharacter('rm-a')

    expect(mockDeleteCharacter).toHaveBeenCalledWith('rm-a')
    expect(store.list.map((c) => c.id)).toEqual(['rm-b'])
    expect(store.detailCache.has('rm-a')).toBe(false)
  })

  it('失敗時 rethrow，且不動 list 與 cache', async () => {
    const a = createMockCharacter({ id: 'rm-x', name: 'X' })
    mockListCharacters.mockResolvedValue([charToSummary(a)])
    mockGetCharacter.mockResolvedValue(a)
    mockDeleteCharacter.mockRejectedValue(new Error('boom'))

    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    await store.loadList()
    await store.loadDetail('rm-x')

    await expect(store.removeCharacter('rm-x')).rejects.toThrow('boom')
    expect(store.list).toHaveLength(1)
    expect(store.detailCache.has('rm-x')).toBe(true)
  })
})

describe('character store — updateCharacter', () => {
  it('cache 不存在時 throw', async () => {
    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    await expect(store.updateCharacter('not-cached', createMockUpdateFormState())).rejects.toThrow(
      /not loaded/,
    )
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })

  it('無變動時短路、不打 API', async () => {
    const character = createMockCharacter({ id: 'u-1' })
    mockGetCharacter.mockResolvedValue(character)

    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    await store.loadDetail('u-1')

    // 完全比對的 form state（用 character 蓋過所有預設）
    const form = createMockUpdateFormState({
      id: character.id,
      name: character.name,
      gender: character.gender,
      race: character.race,
      alignment: character.alignment,
      classes: character.classes.map((e) => ({ ...e })),
      abilities: structuredClone(character.abilities),
      skills: { ...character.skills },
      background: character.background,
      armorClass: { ...character.armorClass },
      currency: { ...character.currency },
    })
    await store.updateCharacter('u-1', form)

    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })

  it('有變動時送 PATCH、重新 fetch、同步 cache 與 list', async () => {
    const before = createMockCharacter({ id: 'u-2', name: '舊名' })
    const after = createMockCharacter({
      id: 'u-2',
      name: '新名',
      updatedAt: '2026-05-01T00:00:00.000Z',
    })
    mockListCharacters.mockResolvedValue([
      {
        id: before.id,
        name: before.name,
        classes: before.classes,
        level: 5,
        avatar: before.avatar,
        updatedAt: before.updatedAt,
        race: before.race,
      },
    ])
    mockGetCharacter.mockResolvedValueOnce(before).mockResolvedValueOnce(after)
    mockUpdateCharacter.mockResolvedValue()

    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    await store.loadList()
    await store.loadDetail('u-2')

    const form = createMockUpdateFormState({ id: before.id, name: '新名' })
    const result = await store.updateCharacter('u-2', form)

    expect(mockUpdateCharacter).toHaveBeenCalledOnce()
    const [calledId, calledPatch] = mockUpdateCharacter.mock.calls[0]!
    expect(calledId).toBe('u-2')
    expect(calledPatch.updatedAt).toBe(before.updatedAt)
    expect(calledPatch.profile?.name).toBe('新名')

    expect(mockGetCharacter).toHaveBeenCalledTimes(2)
    expect(store.detailCache.get('u-2')?.name).toBe('新名')
    expect(store.list[0]?.name).toBe('新名')
    expect(result.name).toBe('新名')
  })

  it('API 失敗時 rethrow、不動 cache', async () => {
    const character = createMockCharacter({ id: 'u-3' })
    mockGetCharacter.mockResolvedValue(character)
    mockUpdateCharacter.mockRejectedValue(new Error('boom'))

    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    await store.loadDetail('u-3')

    const form = createMockUpdateFormState({ id: character.id, name: '新名' })
    await expect(store.updateCharacter('u-3', form)).rejects.toThrow('boom')
    expect(store.detailCache.get('u-3')?.name).toBe(character.name)
  })
})

describe('character store — patchCharacter（仍未支援）', () => {
  it('patchCharacter throw', async () => {
    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    expect(() => store.patchCharacter('x', {})).toThrow(/尚未支援/)
  })
})
