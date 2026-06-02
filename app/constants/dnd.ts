import {
  ARMOR_TYPES as CORE_ARMOR_TYPES,
  CLASS_HIT_DICE,
  CLASS_SAVING_THROW_PROFICIENCIES,
  type AbilityKey,
  type ArmorType,
  type DieType,
  type ClassKey,
  type SizeKey,
  type SkillKey,
} from '@rolling-dice-app/core'

// ─── Class ────────────────────────────────────────────────────────────────────

/** 職業靜態規則：hitDie / savingThrowProficiencies 由 core 提供，label 由 i18n 持有 */
export interface ClassData {
  hitDie: DieType
  savingThrowProficiencies: readonly AbilityKey[]
}

/** 各職業靜態規則設定（D&D 5e PHB 標準） */
export const CLASS_CONFIG: Readonly<Record<ClassKey, ClassData>> = Object.freeze(
  Object.fromEntries(
    (Object.keys(CLASS_HIT_DICE) as ClassKey[]).map((key) => [
      key,
      {
        hitDie: CLASS_HIT_DICE[key],
        savingThrowProficiencies: CLASS_SAVING_THROW_PROFICIENCIES[key],
      },
    ]),
  ) as Record<ClassKey, ClassData>,
)

// ─── Skill-Ability Mapping ────────────────────────────────────────────────────

/** D&D 5e 技能與屬性對應表 */
export const SKILL_TO_ABILITY_MAP: Readonly<Record<SkillKey, AbilityKey>> = {
  athletics: 'strength',
  acrobatics: 'dexterity',
  sleightOfHand: 'dexterity',
  stealth: 'dexterity',
  arcana: 'intelligence',
  history: 'intelligence',
  investigation: 'intelligence',
  nature: 'intelligence',
  religion: 'intelligence',
  animalHandling: 'wisdom',
  insight: 'wisdom',
  medicine: 'wisdom',
  perception: 'wisdom',
  survival: 'wisdom',
  deception: 'charisma',
  intimidation: 'charisma',
  performance: 'charisma',
  persuasion: 'charisma',
}

// ─── Point Buy ────────────────────────────────────────────────────────────────

/** 購點制總預算（D&D 5e 標準）*/
export const POINT_BUY_BUDGET = 27

/** 購點制單項屬性最低分數 */
export const POINT_BUY_MIN_SCORE = 8

/** 購點制單項屬性最高分數 */
export const POINT_BUY_MAX_SCORE = 15

/** 購點制費用查找表：key 為屬性分數，value 為所需點數（D&D 5e PHB 標準）*/
export const POINT_BUY_COST_TABLE: Readonly<Record<number, number>> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
}

// ─── Custom ─────────────────────────────────────────────────────────────────────

/** 自訂模式屬性分數下限 */
export const CUSTOM_ABILITY_MIN = 1

/** 自訂模式屬性分數上限 */
export const CUSTOM_ABILITY_MAX = 20

/** 屬性總值理論硬上限（D&D 5e：含魔法物品/稀有來源後的絕對上限） */
export const ABILITY_HARD_MAX = 30

// ─── Ability Defaults ─────────────────────────────────────────────────────────

/** 購點制的各屬性初始分數 */
export const POINT_BUY_DEFAULT_SCORE = 8

/** 擲骰模式下，尚未指派骰值的屬性顯示分數 */
export const UNASSIGNED_ABILITY_SCORE = 8

// ─── Iteration Keys ───────────────────────────────────────────────────────────
// AbilityKey / SkillKey / ClassKey / AlignmentKey 的迭代陣列（ABILITY_KEYS / SKILL_KEYS /
// CLASS_KEYS / ALIGNMENT_KEYS）由 `@rolling-dice-app/core` 提供，請直接從 core import。

/**
 * 所有 ArmorType，用於迭代。core 的 ARMOR_TYPES 將 `none` 殿後，但 UI 慣例 `none`（無甲）排首，
 * 故以 core 為來源衍生顯示序（成員若 drift，type-check 會在 satisfies 抓到）。
 */
export const ARMOR_TYPES = [
  'none',
  ...CORE_ARMOR_TYPES.filter((type) => type !== 'none'),
] as const satisfies readonly ArmorType[]

/**
 * 所有 SizeKey，用於迭代。core 僅導出 `SizeKey` 型別、無對應 runtime 陣列，
 * 故此處本地維護迭代序（satisfies 確保與 core 型別不漂移）。
 */
export const SIZE_KEYS = [
  'tiny',
  'small',
  'medium',
  'large',
  'huge',
  'gargantuan',
] as const satisfies readonly SizeKey[]
