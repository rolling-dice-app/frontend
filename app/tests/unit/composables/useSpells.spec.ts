import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { SpellDTO } from '@rolling-dice-app/core'
import { useSpells } from '~/composables/domain/useSpells'

const SPELL_ID_1 = 'aaaaaaaa-0000-0000-0000-000000000001'
const SPELL_ID_2 = 'aaaaaaaa-0000-0000-0000-000000000002'

function makeDto(overrides: Partial<SpellDTO> = {}): SpellDTO {
  return {
    id: SPELL_ID_1,
    name: '火焰箭',
    engName: 'Fire Bolt',
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
    source: 'PHB',
    classes: [],
    desc: '測試描述',
    ...overrides,
  }
}

function stubListSpells(mock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('spells', () => ({ list: mock }))
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('useSpells — 正常載入', () => {
  it('spells 包含所有正規化後的法術', async () => {
    stubListSpells(
      vi.fn().mockResolvedValue([makeDto(), makeDto({ id: SPELL_ID_2, name: '魔法飛彈' })]),
    )
    const { spells, refresh } = useSpells()
    await refresh()
    expect(spells.value).toHaveLength(2)
    expect(spells.value[0]!.school).toBe('evocation')
  })

  it('spellMap 以 id 為 key，getSpell 可查詢', async () => {
    stubListSpells(vi.fn().mockResolvedValue([makeDto({ id: SPELL_ID_1, name: '火焰箭' })]))
    const { getSpell, refresh } = useSpells()
    await refresh()
    const spell = getSpell(SPELL_ID_1)
    expect(spell).toBeDefined()
    expect(spell!.name).toBe('火焰箭')
  })

  it('getSpell 查無結果回傳 undefined', async () => {
    stubListSpells(vi.fn().mockResolvedValue([makeDto()]))
    const { getSpell, refresh } = useSpells()
    await refresh()
    expect(getSpell('不存在的-uuid-0000-0000-000000000000')).toBeUndefined()
  })

  it('pending 在 refresh 執行中為 true，結束後為 false', async () => {
    let resolve!: (v: SpellDTO[]) => void
    stubListSpells(vi.fn().mockReturnValue(new Promise<SpellDTO[]>((r) => (resolve = r))))
    const { pending, refresh } = useSpells()
    const refreshPromise = refresh()
    expect(pending.value).toBe(true)
    resolve([makeDto()])
    await refreshPromise
    expect(pending.value).toBe(false)
  })
})

describe('useSpells — 載入失敗', () => {
  it('listSpells 拋出錯誤時 error 非 null', async () => {
    stubListSpells(vi.fn().mockRejectedValue(new Error('network error')))
    const { error, refresh } = useSpells()
    await refresh()
    expect(error.value).toBeInstanceOf(Error)
  })

  it('listSpells 拋出錯誤時 spells 仍為空陣列', async () => {
    stubListSpells(vi.fn().mockRejectedValue(new Error('500')))
    const { spells, refresh } = useSpells()
    await refresh()
    expect(spells.value).toEqual([])
  })
})
