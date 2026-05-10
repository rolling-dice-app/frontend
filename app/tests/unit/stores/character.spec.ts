import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockCharacter, createMockFormState } from '~/tests/fixtures/character'
import type { CharacterDTO, CharacterSummaryDTO } from '@rolling-dice-app/core'

const mockListCharacters = vi.fn<() => Promise<CharacterSummaryDTO[]>>()
const mockGetCharacter = vi.fn<(id: string) => Promise<CharacterDTO>>()
const mockCreateCharacter = vi.fn<(...args: unknown[]) => Promise<CharacterDTO>>()

beforeEach(() => {
  vi.resetModules()
  setActivePinia(createPinia())
  mockListCharacters.mockReset()
  mockGetCharacter.mockReset()
  mockCreateCharacter.mockReset()
  vi.stubGlobal('useCharacterApi', () => ({
    listCharacters: mockListCharacters,
    getCharacter: mockGetCharacter,
    createCharacter: mockCreateCharacter,
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

describe('character store — 未支援的 mutation', () => {
  it('updateCharacter throw', async () => {
    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    expect(() => store.updateCharacter('x', {} as never)).toThrow(/尚未支援/)
  })

  it('removeCharacter throw', async () => {
    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    expect(() => store.removeCharacter('x')).toThrow(/尚未支援/)
  })

  it('patchCharacter throw', async () => {
    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    expect(() => store.patchCharacter('x', {})).toThrow(/尚未支援/)
  })
})
