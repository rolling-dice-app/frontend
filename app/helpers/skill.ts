import type { SkillProficiencies, ProficiencyLevel, SkillKey } from '@rolling-dice-app/types'

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
