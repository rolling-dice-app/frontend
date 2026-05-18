import {
  SKILL_KEYS,
  type SkillProficiencies,
  type ProficiencyLevel,
  type SkillKey,
  type AbilityKey,
} from '@rolling-dice-app/core'
import type { TotalAbilityScores } from '~/types/business/character-form'
import { SKILL_TO_ABILITY_MAP } from '~/constants/dnd'
import { getAbilityModifier } from '~/helpers/ability'
import { getSkillBonus } from '~/helpers/character'

/** 套用技能熟練度；level 為 'none' 時刪除該 key。 */
export function applySkillProficiency(
  skills: SkillProficiencies,
  skill: SkillKey,
  level: ProficiencyLevel,
): SkillProficiencies {
  if (level === 'none') {
    const { [skill]: _omitted, ...rest } = skills
    return rest
  }
  return { ...skills, [skill]: level }
}

export interface SkillBonusEntry {
  key: SkillKey
  abilityKey: AbilityKey
  proficiency: ProficiencyLevel
  bonus: number
}

/** 計算 18 項技能加值；none + 全能高手時補半熟練。回傳純資料，i18n / 格式化由呼叫端處理。 */
export function calculateSkillBonuses(input: {
  abilityScores: TotalAbilityScores
  skills: SkillProficiencies
  proficiencyBonus: number
  isJackOfAllTrades: boolean
}): SkillBonusEntry[] {
  const jackBonus = input.isJackOfAllTrades ? Math.floor(input.proficiencyBonus / 2) : 0
  return SKILL_KEYS.map((key) => {
    const abilityKey = SKILL_TO_ABILITY_MAP[key]
    const mod = getAbilityModifier(input.abilityScores[abilityKey])
    const proficiency: ProficiencyLevel = input.skills[key] ?? 'none'
    const base = getSkillBonus(mod, proficiency, input.proficiencyBonus)
    const bonus = proficiency === 'none' ? base + jackBonus : base
    return { key, abilityKey, proficiency, bonus }
  })
}
