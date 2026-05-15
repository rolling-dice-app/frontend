import { describe, expect, it } from 'vitest'
import { useI18n } from '~/i18n'
import {
  formatSpellComponents,
  formatSpellLevel,
  groupSpellsByLevel,
  withToggledFlag,
} from '~/helpers/spell'
import type { SpellDTO } from '@rolling-dice-app/core'
import type { SpellFormEntry } from '~/types/business/character-form'

const makeEntry = (spellId: string, isPrepared = false, isFavorite = false): SpellFormEntry => ({
  spellId,
  isPrepared,
  isFavorite,
})

// ─── CN_TO_SCHOOL reverse map ─────────────────────────────────────────────────

describe('spell.school i18n labels reverse map', () => {
  it('所有 label 互不相同（reverse map 大小等於原 map）', () => {
    const { messages } = useI18n()
    const labels = Object.values(messages.value.spell.school)
    const unique = new Set(labels)
    expect(unique.size).toBe(labels.length)
  })
})

// ─── formatSpellLevel ─────────────────────────────────────────────────────────

describe('formatSpellLevel', () => {
  it('0 → 戲法', () => {
    expect(formatSpellLevel(0)).toBe('戲法')
  })

  it('1 → 1 環', () => {
    expect(formatSpellLevel(1)).toBe('1 環')
  })

  it('9 → 9 環', () => {
    expect(formatSpellLevel(9)).toBe('9 環')
  })
})

// ─── formatSpellComponents ────────────────────────────────────────────────────

describe('formatSpellComponents', () => {
  it('三個成分都有 → 聲 / 勢 / 材', () => {
    expect(formatSpellComponents({ verbal: true, somatic: true, material: '一根羽毛' })).toBe(
      '聲 / 勢 / 材',
    )
  })

  it('只有聲 → 聲', () => {
    expect(formatSpellComponents({ verbal: true, somatic: false, material: '' })).toBe('聲')
  })

  it('聲 + 材 → 聲 / 材', () => {
    expect(formatSpellComponents({ verbal: true, somatic: false, material: '一片葉子' })).toBe(
      '聲 / 材',
    )
  })

  it('全部 falsy → —', () => {
    expect(formatSpellComponents({ verbal: false, somatic: false, material: '' })).toBe('—')
  })

  it('material 為空字串視為無材料成分', () => {
    expect(formatSpellComponents({ verbal: false, somatic: true, material: '' })).toBe('勢')
  })
})

// ─── groupSpellsByLevel ───────────────────────────────────────────────────────

let _spellCounter = 0
function makeSpell(
  name: string,
  level: number,
  school: SpellDTO['school'] = 'evocation',
): SpellDTO {
  return {
    id: `test-spell-id-${String(++_spellCounter).padStart(4, '0')}-000000000000`,
    name,
    engName: 'Test SpellDTO',
    level,
    school,
    castingTime: '1 個動作',
    range: '30 英尺',
    verbal: true,
    somatic: false,
    material: '',
    duration: '瞬間',
    concentration: false,
    ritual: false,
    source: 'PHB',
    classes: [],
    desc: '',
  }
}

describe('groupSpellsByLevel', () => {
  it('空陣列回傳空陣列', () => {
    expect(groupSpellsByLevel([])).toEqual([])
  })

  it('依環數由低至高排序分組', () => {
    const spells = [makeSpell('B', 3), makeSpell('A', 1), makeSpell('C', 2)]
    const groups = groupSpellsByLevel(spells)
    expect(groups.map((g) => g.level)).toEqual([1, 2, 3])
  })

  it('同一環數內依中文名稱排序', () => {
    const spells = [makeSpell('魔法飛彈', 1), makeSpell('火焰箭', 1), makeSpell('魅惑人類', 1)]
    const groups = groupSpellsByLevel(spells)
    const names = groups[0]!.spells.map((s) => s.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'zh-Hant')))
  })

  it('戲法（level 0）與高環法術正確分組', () => {
    const spells = [makeSpell('火焰術', 0), makeSpell('火焰箭', 1)]
    const groups = groupSpellsByLevel(spells)
    expect(groups).toHaveLength(2)
    expect(groups[0]!.level).toBe(0)
    expect(groups[1]!.level).toBe(1)
  })

  it('每個分組的 spells 陣列包含正確的法術', () => {
    const spells = [makeSpell('A', 2), makeSpell('B', 1), makeSpell('C', 2)]
    const groups = groupSpellsByLevel(spells)
    const level2 = groups.find((g) => g.level === 2)!
    expect(level2.spells).toHaveLength(2)
    expect(level2.spells.map((s) => s.name).sort()).toEqual(['A', 'C'])
  })
})

// ─── SpellFormEntry helpers ──────────────────────────────────────────────────

describe('withToggledFlag', () => {
  it('切換 isPrepared 並回傳新陣列', () => {
    const entries = [makeEntry('a', false), makeEntry('b', true)]
    const result = withToggledFlag(entries, 'a', 'isPrepared')
    expect(result[0]).toEqual({ spellId: 'a', isPrepared: true, isFavorite: false })
    expect(result[1]).toEqual({ spellId: 'b', isPrepared: true, isFavorite: false })
    expect(result).not.toBe(entries)
  })

  it('切換 isFavorite 不影響 isPrepared', () => {
    const entries = [makeEntry('a', true, false)]
    const result = withToggledFlag(entries, 'a', 'isFavorite')
    expect(result[0]).toEqual({ spellId: 'a', isPrepared: true, isFavorite: true })
  })

  it('spellId 不存在時原樣回傳每筆 entry', () => {
    const entries = [makeEntry('a', true)]
    const result = withToggledFlag(entries, 'z', 'isPrepared')
    expect(result).toEqual(entries)
  })
})
