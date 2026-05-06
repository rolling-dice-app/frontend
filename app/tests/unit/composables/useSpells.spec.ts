import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { SpellDto, SpellSchool } from '@rolling-dice-app/core'
import { useSpells } from '~/composables/domain/useSpells'

const SPELL_ID_1 = 'aaaaaaaa-0000-0000-0000-000000000001'
const SPELL_ID_2 = 'aaaaaaaa-0000-0000-0000-000000000002'

function makeDto(overrides: Partial<SpellDto> = {}): SpellDto {
  return {
    id: SPELL_ID_1,
    name: '火焰箭',
    level: 1,
    school: 'evocation',
    castingTime: '1 個動作',
    range: '90 英尺',
    verbal: true,
    somatic: true,
    material: '',
    duration: '瞬間',
    concentration: false,
    ritual: false,
    desc: '測試描述',
    ...overrides,
  }
}

beforeEach(() => {
  vi.stubGlobal('useRuntimeConfig', () => ({ public: {}, app: { baseURL: '/' } }))
})

describe('useSpells — 正常載入', () => {
  it('spells 包含所有正規化後的法術', async () => {
    vi.stubGlobal(
      '$fetch',
      vi.fn().mockResolvedValue([makeDto(), makeDto({ id: SPELL_ID_2, name: '魔法飛彈' })]),
    )
    const { spells, refresh } = useSpells()
    await refresh()
    expect(spells.value).toHaveLength(2)
    expect(spells.value[0]!.school).toBe('evocation')
  })

  it('spellMap 以 id 為 key，getSpell 可查詢', async () => {
    vi.stubGlobal(
      '$fetch',
      vi.fn().mockResolvedValue([makeDto({ id: SPELL_ID_1, name: '火焰箭' })]),
    )
    const { getSpell, refresh } = useSpells()
    await refresh()
    const spell = getSpell(SPELL_ID_1)
    expect(spell).toBeDefined()
    expect(spell!.name).toBe('火焰箭')
  })

  it('getSpell 查無結果回傳 undefined', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([makeDto()]))
    const { getSpell, refresh } = useSpells()
    await refresh()
    expect(getSpell('不存在的-uuid-0000-0000-000000000000')).toBeUndefined()
  })

  it('pending 在 refresh 執行中為 true，結束後為 false', async () => {
    let resolve!: (v: SpellDto[]) => void
    vi.stubGlobal('$fetch', vi.fn().mockReturnValue(new Promise<SpellDto[]>((r) => (resolve = r))))
    const { pending, refresh } = useSpells()
    const refreshPromise = refresh()
    expect(pending.value).toBe(true)
    resolve([makeDto()])
    await refreshPromise
    expect(pending.value).toBe(false)
  })
})

describe('useSpells — 未知學派過濾', () => {
  it('未知學派的 dto 進入 skippedSpells，不進入 spells', async () => {
    vi.stubGlobal(
      '$fetch',
      vi
        .fn()
        .mockResolvedValue([
          makeDto(),
          makeDto({ name: '謎之法術', school: 'unknown-school' as SpellSchool }),
        ]),
    )
    const { spells, skippedSpells, refresh } = useSpells()
    await refresh()
    expect(spells.value).toHaveLength(1)
    expect(skippedSpells.value).toHaveLength(1)
    expect(skippedSpells.value[0]!.name).toBe('謎之法術')
    expect(skippedSpells.value[0]!.school).toBe('unknown-school')
  })

  it('全部都是未知學派時 spells 為空陣列', async () => {
    vi.stubGlobal(
      '$fetch',
      vi
        .fn()
        .mockResolvedValue([
          makeDto({ school: 'unknown-a' as SpellSchool }),
          makeDto({ school: 'unknown-b' as SpellSchool }),
        ]),
    )
    const { spells, skippedSpells, refresh } = useSpells()
    await refresh()
    expect(spells.value).toHaveLength(0)
    expect(skippedSpells.value).toHaveLength(2)
  })
})

describe('useSpells — 載入失敗', () => {
  it('$fetch 拋出錯誤時 error 非 null', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('network error')))
    const { error, refresh } = useSpells()
    await refresh()
    expect(error.value).toBeInstanceOf(Error)
  })

  it('$fetch 拋出錯誤時 spells 仍為空陣列', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('500')))
    const { spells, refresh } = useSpells()
    await refresh()
    expect(spells.value).toEqual([])
  })
})

describe('useSpells — baseURL 處理', () => {
  it('baseURL 不帶結尾斜線時自動補上', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ public: {}, app: { baseURL: '/rolling-dice' } }))
    const fetchMock = vi.fn().mockResolvedValue([])
    vi.stubGlobal('$fetch', fetchMock)
    const { refresh } = useSpells()
    await refresh()
    expect(fetchMock).toHaveBeenCalledWith('/rolling-dice/json/spells.json')
  })

  it('baseURL 已帶結尾斜線時不重複', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ public: {}, app: { baseURL: '/rolling-dice/' } }))
    const fetchMock = vi.fn().mockResolvedValue([])
    vi.stubGlobal('$fetch', fetchMock)
    const { refresh } = useSpells()
    await refresh()
    expect(fetchMock).toHaveBeenCalledWith('/rolling-dice/json/spells.json')
  })
})
