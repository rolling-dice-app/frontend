import { computeHpMax } from '@rolling-dice-app/core'
import type {
  AttackEntry,
  BattlefieldAttackEntry,
  DmSessionMemberDTO,
  SharedCharacterProfileDTO,
  SkillKey,
} from '@rolling-dice-app/core'
import type { BattlefieldMemberSource } from '~/types/business/battlefield'
import type { TotalAbilityScores } from '~/types/business/character-form'
import { getAbilityModifier } from '~/helpers/ability'
import {
  calculateTotalAbilityScores,
  calculateTotalInitiative,
  calculateTotalLevel,
  calculateTotalSpeed,
  getProficiencyBonus,
  getTotalArmorClass,
} from '~/helpers/character'
import { getAttackHit } from '~/helpers/combat'
import { calculateSkillBonuses } from '~/helpers/skill'

/**
 * 角色攻擊 → 戰場攻擊快照：命中攤平為 flat 總值（屬性＋熟練＋額外命中）；
 * applyAbilityToDamage 時把屬性調整折進第一行傷害 bonus（formatDamageSummary 同慣例），
 * 讓快照後不再依賴屬性即可自動擲骰。
 */
function snapshotAttackEntry(
  attack: AttackEntry,
  abilityScores: TotalAbilityScores,
  proficiencyBonus: number,
): BattlefieldAttackEntry {
  const mod =
    attack.abilityKey && attack.applyAbilityToDamage
      ? getAbilityModifier(abilityScores[attack.abilityKey])
      : 0
  return {
    id: attack.id,
    name: attack.name,
    hitBonus: getAttackHit(attack, abilityScores, proficiencyBonus),
    damageDice: attack.damageDice.map((line, index) =>
      index === 0 && mod !== 0 ? { ...line, bonus: (line.bonus ?? 0) + mod } : { ...line },
    ),
    comment: attack.comment,
  }
}

/**
 * 出席成員 → 戰場快照來源：以 share 投影跑與角色卡同一條衍生管線
 * （useCharacterDerivedStatsFromCharacter 的純函式路徑）攤平總值；
 * 技能只快照有熟練者（none 不進快照，契約如此約定）。
 */
export function buildBattlefieldMemberSource(
  member: Pick<DmSessionMemberDTO, 'id' | 'playerName'>,
  shareId: string,
  character: SharedCharacterProfileDTO,
): BattlefieldMemberSource {
  const abilityScores = calculateTotalAbilityScores(character.abilities)
  const proficiencyBonus = getProficiencyBonus(calculateTotalLevel(character.classes))

  const skills: Partial<Record<SkillKey, number>> = {}
  for (const entry of calculateSkillBonuses({
    abilityScores,
    skills: character.skills,
    proficiencyBonus,
    isJackOfAllTrades: character.isJackOfAllTrades,
  })) {
    if (entry.proficiency !== 'none') skills[entry.key] = entry.bonus
  }

  return {
    memberId: member.id,
    shareId,
    playerName: member.playerName,
    available: true,
    name: character.name,
    race: character.race,
    classes: character.classes.map((entry) => ({ ...entry })),
    maxHp: computeHpMax({
      classes: character.classes,
      abilities: character.abilities,
      isTough: character.isTough,
      customHpBonus: character.customHpBonus,
    }),
    ac: getTotalArmorClass(character.armorClass, abilityScores),
    speed: calculateTotalSpeed(character.speedBonus),
    totalInitiative: calculateTotalInitiative({
      dexModifier: getAbilityModifier(abilityScores.dexterity),
      extraAbilityModifier: character.initiativeAbilityKey
        ? getAbilityModifier(abilityScores[character.initiativeAbilityKey])
        : 0,
      initiativeBonus: character.initiativeBonus,
    }),
    attacks: character.attacks.map((attack) =>
      snapshotAttackEntry(attack, abilityScores, proficiencyBonus),
    ),
    skills,
  }
}
