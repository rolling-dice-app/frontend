import { describe, expect, it } from 'vitest'
import { applySkillProficiency, calculateSkillBonuses } from '~/helpers/skill'
import { SKILL_KEYS } from '@rolling-dice-app/core'
import { SKILL_TO_ABILITY_MAP } from '~/constants/dnd'
import type { TotalAbilityScores } from '~/types/business/character-form'

const abilityScores: TotalAbilityScores = {
  strength: 16, // mod +3
  dexterity: 14, // mod +2
  constitution: 10, // mod +0
  intelligence: 8, // mod -1
  wisdom: 12, // mod +1
  charisma: 20, // mod +5
}

const pick = (key: (typeof SKILL_KEYS)[number], list: ReturnType<typeof calculateSkillBonuses>) =>
  list.find((e) => e.key === key)!

describe('applySkillProficiency', () => {
  it('空 skills 加入 proficient', () => {
    const result = applySkillProficiency({}, 'athletics', 'proficient')
    expect(result).toEqual({ athletics: 'proficient' })
  })

  it('已有熟練度時覆寫為 expertise', () => {
    const result = applySkillProficiency({ athletics: 'proficient' }, 'athletics', 'expertise')
    expect(result).toEqual({ athletics: 'expertise' })
  })

  it("level 為 'none' 時移除該 key", () => {
    const result = applySkillProficiency(
      { athletics: 'proficient', acrobatics: 'expertise' },
      'athletics',
      'none',
    )
    expect(result).toEqual({ acrobatics: 'expertise' })
    expect('athletics' in result).toBe(false)
  })

  it("level 為 'none' 且 key 不存在時不影響其他 key", () => {
    const skills = { acrobatics: 'proficient' } as const
    const result = applySkillProficiency(skills, 'athletics', 'none')
    expect(result).toEqual({ acrobatics: 'proficient' })
  })

  it('不修改原始 skills 物件', () => {
    const original = { athletics: 'proficient' } as const
    applySkillProficiency(original, 'athletics', 'expertise')
    expect(original).toEqual({ athletics: 'proficient' })
  })

  it('可同時存在多個不同技能的熟練度', () => {
    const result = applySkillProficiency({ athletics: 'proficient' }, 'arcana', 'expertise')
    expect(result).toEqual({ athletics: 'proficient', arcana: 'expertise' })
  })
})

describe('calculateSkillBonuses', () => {
  it('回傳全部 18 項技能且 abilityKey 對應正確', () => {
    const list = calculateSkillBonuses({
      abilityScores,
      skills: {},
      proficiencyBonus: 3,
      isJackOfAllTrades: false,
    })
    expect(list).toHaveLength(SKILL_KEYS.length)
    for (const entry of list) {
      expect(entry.abilityKey).toBe(SKILL_TO_ABILITY_MAP[entry.key])
    }
  })

  it('none：只給屬性調整，不含熟練加值', () => {
    const list = calculateSkillBonuses({
      abilityScores,
      skills: {},
      proficiencyBonus: 3,
      isJackOfAllTrades: false,
    })
    expect(pick('athletics', list).bonus).toBe(3) // STR +3
    expect(pick('athletics', list).proficiency).toBe('none')
  })

  it('proficient：屬性調整 + 熟練加值', () => {
    const list = calculateSkillBonuses({
      abilityScores,
      skills: { athletics: 'proficient' },
      proficiencyBonus: 3,
      isJackOfAllTrades: false,
    })
    expect(pick('athletics', list).bonus).toBe(6) // +3 + 3
  })

  it('expertise：屬性調整 + 熟練加值 ×2', () => {
    const list = calculateSkillBonuses({
      abilityScores,
      skills: { athletics: 'expertise' },
      proficiencyBonus: 3,
      isJackOfAllTrades: false,
    })
    expect(pick('athletics', list).bonus).toBe(9) // +3 + 3×2
  })

  it('全能高手：未熟練技能補半熟練（向下取整），已熟練技能不受影響', () => {
    const list = calculateSkillBonuses({
      abilityScores,
      skills: { athletics: 'proficient' },
      proficiencyBonus: 3,
      isJackOfAllTrades: true,
    })
    // acrobatics 未熟練：DEX +2 + floor(3/2)=1 → 3
    expect(pick('acrobatics', list).bonus).toBe(3)
    // athletics 已熟練：+3 + 3，不再加 jack
    expect(pick('athletics', list).bonus).toBe(6)
  })
})
