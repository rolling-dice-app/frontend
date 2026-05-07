import type {
  ArmorClassConfig,
  CharacterAbilityScores,
  ClassEntry,
  AbilityKey,
  ArmorType,
  ProficiencyLevel,
} from '@rolling-dice-app/core'
import type {
  CharacterFormStateBase,
  CharacterWritablePatch,
  TotalAbilityScores,
} from '~/types/business/character-form'
import { ABILITY_KEYS, CLASS_CONFIG, UNARMORED_AC_BASE } from '~/constants/dnd'
import { getAbilityModifier, getTotalScore } from '~/helpers/ability'

/** 角色分級：依總職業等級分為 common / elite / master / legendary，僅供 UI 呈現 */
export type CharacterTier = 'common' | 'elite' | 'master' | 'legendary'

/** D&D 5e 角色預設移動速度（呎/回合） */
export const BASE_MOVEMENT_SPEED = 30

export function getCharacterTier(level: number): CharacterTier {
  if (level >= 17) return 'legendary'
  if (level >= 11) return 'master'
  if (level >= 5) return 'elite'
  return 'common'
}

/** 計算總職業等級（兼職時為各職業等級之和） */
export function calculateTotalLevel(classes: ReadonlyArray<{ level: number }>): number {
  return classes.reduce((sum, entry) => sum + entry.level, 0)
}

/**
 * 計算熟練加值：floor((totalLevel - 1) / 4) + 2
 * 1–4 級 → +2、5–8 級 → +3、9–12 級 → +4、13–16 級 → +5、17–20 級 → +6
 */
export function getProficiencyBonus(totalLevel: number): number {
  return Math.floor((totalLevel - 1) / 4) + 2
}

/**
 * 計算豁免加值：modifier + (proficient ? proficiencyBonus : 0)
 */
export function getSavingThrowBonus(
  modifier: number,
  proficient: boolean,
  proficiencyBonus: number,
): number {
  return modifier + (proficient ? proficiencyBonus : 0)
}

/**
 * 計算法術豁免 DC：8 + 熟練 + 施法主屬性調整 + 自定義加值。
 */
export function getSpellSaveDc(input: {
  abilityModifier: number
  proficiencyBonus: number
  customBonus: number
}): number {
  return 8 + input.proficiencyBonus + input.abilityModifier + input.customBonus
}

/**
 * 計算技能檢定加值：
 * - none → modifier
 * - proficient → modifier + proficiencyBonus
 * - expertise → modifier + proficiencyBonus × 2
 */
export function getSkillBonus(
  modifier: number,
  proficiencyLevel: ProficiencyLevel,
  proficiencyBonus: number,
): number {
  if (proficiencyLevel === 'expertise') return modifier + proficiencyBonus * 2
  if (proficiencyLevel === 'proficient') return modifier + proficiencyBonus
  return modifier
}

/**
 * 計算單一職業的生命值
 * - 主職業（isPrimary）第 1 級取滿生命骰，其餘等級使用平均值
 * - 非主職業全部使用平均值：(hitDie / 2 + 1) × level
 */
export function getClassHitPoints(hitDie: number, level: number, isPrimary: boolean): number {
  const avg = Math.floor(hitDie / 2) + 1
  if (isPrimary && level >= 1) {
    return hitDie + avg * (level - 1)
  }
  return avg * level
}

/**
 * 計算護甲基礎值（AC base + DEX 調整）：
 * - 重甲：baseValue（不加 DEX）
 * - 中甲：baseValue + min(DEX, +2)
 * - 輕甲 / 無甲 / 未選：baseValue + 完整 DEX
 */
export function getBaseArmorClass(
  baseValue: number,
  dexModifier: number,
  type: ArmorType | null,
): number {
  if (type === 'heavy') return baseValue
  if (type === 'medium') return baseValue + Math.min(dexModifier, 2)
  return baseValue + dexModifier
}

/**
 * 由護甲設定與屬性分數計算最終 AC：
 * base（依護甲類型處理 DEX）+ 額外屬性加值 + 盾牌加值。
 */
export function getTotalArmorClass(
  config: ArmorClassConfig,
  abilityScores: TotalAbilityScores,
): number {
  const baseValue = config.value ?? UNARMORED_AC_BASE
  const dexModifier = getAbilityModifier(abilityScores.dexterity)
  let ac = getBaseArmorClass(baseValue, dexModifier, config.type)

  if (config.abilityKey) {
    ac += getAbilityModifier(abilityScores[config.abilityKey])
  }

  return ac + config.shieldValue
}

/**
 * 建立 Character 預設的護甲設定：無甲、基礎值 10、無額外屬性、無盾牌。
 * 用於新增角色或尚未設定戰鬥資訊時的初始值。
 */
export function createDefaultArmorClass(): ArmorClassConfig {
  return { type: 'none', value: UNARMORED_AC_BASE, abilityKey: null, shieldValue: 0 }
}

/**
 * 計算被動屬性檢定值：10 + 技能加值（含全能高手半熟練規則）+ 額外加值。
 * 適用於被動察覺、被動洞察等同型計算。
 */
export function calculatePassiveScore(input: {
  abilityModifier: number
  skillLevel: ProficiencyLevel
  proficiencyBonus: number
  isJackOfAllTrades: boolean
  extraBonus: number
}): number {
  const skillBonus =
    input.skillLevel === 'none' && input.isJackOfAllTrades
      ? input.abilityModifier + Math.floor(input.proficiencyBonus / 2)
      : getSkillBonus(input.abilityModifier, input.skillLevel, input.proficiencyBonus)
  return 10 + skillBonus + input.extraBonus
}

/**
 * 由完整屬性單元（origin + race + bonusScore）計算六項屬性的總分字典。
 */
export function calculateTotalAbilityScores(abilities: CharacterAbilityScores): TotalAbilityScores {
  return Object.fromEntries(
    ABILITY_KEYS.map((key) => [key, getTotalScore(abilities[key])]),
  ) as TotalAbilityScores
}

/**
 * 計算總生命值：依序累加各職業 HP（第一個為主職業，第 1 級滿骰）、
 * 每等 CON 調整值、健壯加值（totalLevel × 2）、額外加值。
 */
export function calculateTotalHp(input: {
  classes: ClassEntry[]
  conModifier: number
  isTough: boolean
  customHpBonus: number
}): number {
  const classHp = input.classes.reduce((sum, entry, index) => {
    const config = CLASS_CONFIG[entry.classKey]
    const hp = getClassHitPoints(config.hitDie, entry.level, index === 0)
    return sum + hp + input.conModifier * entry.level
  }, 0)
  const totalLevel = calculateTotalLevel(input.classes)
  const toughBonus = input.isTough ? totalLevel * 2 : 0
  return classHp + toughBonus + input.customHpBonus
}

/**
 * 計算總移動速度：30 呎 + 額外加值。
 */
export function calculateTotalSpeed(speedBonus: number): number {
  return BASE_MOVEMENT_SPEED + speedBonus
}

/**
 * 計算總先攻加值：DEX 調整值 + 額外屬性調整值（initiativeAbilityKey 對應）+ 額外加值。
 */
export function calculateTotalInitiative(input: {
  dexModifier: number
  extraAbilityModifier: number
  initiativeBonus: number
}): number {
  return input.dexModifier + input.extraAbilityModifier + input.initiativeBonus
}

/**
 * 由（已過濾的）職業陣列取得豁免熟練屬性，
 * 規則：取主職業（第一個 entry）的 savingThrowProficiencies；無主職業時回傳空陣列。
 */
export function calculateSavingThrowProficiencies(classes: ClassEntry[]): AbilityKey[] {
  const primary = classes[0]
  if (!primary) return []
  return [...CLASS_CONFIG[primary.classKey].savingThrowProficiencies]
}

/**
 * 將 form state 的共用欄位轉為 Character 可寫入的 patch。
 * 不處理 abilities、armorClass、attacks、spells、bonus 欄位與 savingThrowProficiencies。
 */
export function formStateToCharacterPatch(
  formState: CharacterFormStateBase,
): CharacterWritablePatch {
  // identity
  const name = formState.name
  const gender = formState.gender
  const race = formState.race
  const subrace = formState.subrace
  const alignment = formState.alignment

  // progression
  const classes = formState.classes.filter((entry): entry is ClassEntry => entry.classKey !== null)

  // skills & toggles
  const skills = { ...formState.skills }
  const isJackOfAllTrades = formState.isJackOfAllTrades
  const isTough = formState.isTough

  // profile
  const background = formState.background || null
  const faith = formState.faith || null
  const age = formState.age ?? null
  const height = formState.height || null
  const weight = formState.weight || null
  const appearance = formState.appearance || null
  const story = formState.story || null

  // proficiencies
  const languages = formState.languages || null
  const tools = formState.tools || null
  const weaponProficiencies = formState.weaponProficiencies || null
  const armorProficiencies = formState.armorProficiencies || null

  return {
    name,
    gender,
    race,
    subrace,
    alignment,
    classes,
    skills,
    isJackOfAllTrades,
    isTough,
    background,
    faith,
    age,
    height,
    weight,
    appearance,
    story,
    languages,
    tools,
    weaponProficiencies,
    armorProficiencies,
  }
}
