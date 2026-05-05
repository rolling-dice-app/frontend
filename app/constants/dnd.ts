import type {
  AbilityKey,
  AlignmentKey,
  ArmorType,
  DamageDieType,
  DamageTypeKey,
  GenderKey,
  ProfessionData,
  ProfessionKey,
  ProficiencyLevel,
  SizeKey,
  SkillKey,
  SpellSchool,
} from '@rolling-dice-app/types'

// ─── Profession ───────────────────────────────────────────────────────────────

/** 各職業靜態設定（D&D 5e PHB 標準） */
export const PROFESSION_CONFIG: Readonly<Record<ProfessionKey, ProfessionData>> = {
  artificer: {
    label: '奇械師',
    hitDie: 8,
    savingThrowProficiencies: ['constitution', 'intelligence'],
  },
  barbarian: {
    label: '野蠻人',
    hitDie: 12,
    savingThrowProficiencies: ['strength', 'constitution'],
  },
  bard: { label: '吟遊詩人', hitDie: 8, savingThrowProficiencies: ['dexterity', 'charisma'] },
  cleric: { label: '牧師', hitDie: 8, savingThrowProficiencies: ['wisdom', 'charisma'] },
  druid: { label: '德魯伊', hitDie: 8, savingThrowProficiencies: ['intelligence', 'wisdom'] },
  fighter: { label: '戰士', hitDie: 10, savingThrowProficiencies: ['strength', 'constitution'] },
  monk: { label: '武僧', hitDie: 8, savingThrowProficiencies: ['strength', 'dexterity'] },
  paladin: { label: '聖武士', hitDie: 10, savingThrowProficiencies: ['wisdom', 'charisma'] },
  ranger: { label: '遊俠', hitDie: 10, savingThrowProficiencies: ['strength', 'dexterity'] },
  rogue: { label: '遊蕩者', hitDie: 8, savingThrowProficiencies: ['dexterity', 'intelligence'] },
  sorcerer: { label: '術士', hitDie: 6, savingThrowProficiencies: ['constitution', 'charisma'] },
  warlock: { label: '契術師', hitDie: 8, savingThrowProficiencies: ['wisdom', 'charisma'] },
  wizard: { label: '法師', hitDie: 6, savingThrowProficiencies: ['intelligence', 'wisdom'] },
}

// ─── Ability ──────────────────────────────────────────────────────────────────

export const ABILITY_NAMES: Readonly<Record<AbilityKey, string>> = {
  strength: '力量',
  dexterity: '敏捷',
  constitution: '體質',
  intelligence: '智力',
  wisdom: '感知',
  charisma: '魅力',
}

// ─── Skill ────────────────────────────────────────────────────────────────────

export const SKILL_NAMES: Readonly<Record<SkillKey, string>> = {
  // 力量
  athletics: '運動',
  // 敏捷
  acrobatics: '特技',
  sleightOfHand: '巧手',
  stealth: '隱匿',
  // 智力
  arcana: '奧秘',
  history: '歷史',
  investigation: '調查',
  nature: '自然',
  religion: '宗教',
  // 感知
  animalHandling: '馴獸',
  insight: '洞察',
  medicine: '醫藥',
  perception: '察覺',
  survival: '求生',
  // 魅力
  deception: '欺瞞',
  intimidation: '威嚇',
  performance: '表演',
  persuasion: '說服',
}

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

// ─── Alignment ────────────────────────────────────────────────────────────────

export const ALIGNMENT_NAMES: Readonly<Record<AlignmentKey, string>> = {
  lawfulGood: '守序善良',
  neutralGood: '中立善良',
  chaoticGood: '混亂善良',
  lawfulNeutral: '守序中立',
  trueNeutral: '絕對中立',
  chaoticNeutral: '混亂中立',
  lawfulEvil: '守序邪惡',
  neutralEvil: '中立邪惡',
  chaoticEvil: '混亂邪惡',
}

// ─── Size ─────────────────────────────────────────────────────────────────────

/** 體型中文名稱對照表 */
export const SIZE_NAMES: Readonly<Record<SizeKey, string>> = {
  tiny: '微型',
  small: '小型',
  medium: '中型',
  large: '大型',
  huge: '超大型',
  gargantuan: '巨型',
}

// ─── Gender ───────────────────────────────────────────────────────────────────

/** 性別中文名稱對照表 */
export const GENDER_NAMES: Readonly<Record<GenderKey, string>> = {
  male: '男性',
  female: '女性',
  nonBinary: '非二元',
}
// ─── Spell School ─────────────────────────────────────────────────────────────

/** 法術學派中文顯示名稱 */
export const SPELL_SCHOOL_LABELS: Readonly<Record<SpellSchool, string>> = {
  abjuration: '防護',
  conjuration: '咒法',
  divination: '預言',
  enchantment: '惑控',
  evocation: '塑能',
  illusion: '幻術',
  necromancy: '死靈',
  transmutation: '變化',
}

// ─── Damage Dice ──────────────────────────────────────────────────────────────

/** 傷害骰類型，用於攻擊模組的傷害計算 */
export const DAMAGE_DIE_TYPES = [
  'd4',
  'd6',
  'd8',
  'd10',
  'd12',
] as const satisfies readonly DamageDieType[]

// ─── Damage Type ──────────────────────────────────────────────────────────────

export const DAMAGE_TYPE_KEYS = [
  'bludgeoning',
  'piercing',
  'slashing',
  'acid',
  'cold',
  'fire',
  'lightning',
  'thunder',
  'poison',
  'force',
  'necrotic',
  'radiant',
  'psychic',
] as const satisfies readonly DamageTypeKey[]

/** 傷害類型顯示文字 */
export const DAMAGE_TYPE_LABELS: Readonly<Record<DamageTypeKey, string>> = {
  bludgeoning: '鈍擊',
  piercing: '穿刺',
  slashing: '劈砍',
  acid: '酸蝕',
  cold: '寒冰',
  fire: '火焰',
  lightning: '閃電',
  thunder: '雷鳴',
  poison: '毒素',
  force: '力場',
  necrotic: '暗蝕',
  radiant: '光耀',
  psychic: '心靈',
}

// ─── Armor Type ─────────────────────────────────────────────────────────────────

/** 護甲類型中文名稱對照表 */
export const ARMOR_TYPE_NAMES: Readonly<Record<ArmorType, string>> = {
  none: '無甲',
  light: '輕甲',
  medium: '中甲',
  heavy: '重甲',
}

// ─── Armor Class ──────────────────────────────────────────────────────────────

/** 無甲 AC 基礎值（D&D 5e：10 + DEX 或職業特性） */
export const UNARMORED_AC_BASE = 10

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

// ─── Proficiency ──────────────────────────────────────────────────────────────

/** 技能熟練度下拉選單選項 */
export const PROFICIENCY_OPTIONS: ReadonlyArray<{
  value: ProficiencyLevel
  label: string
}> = [
  { value: 'none', label: '無' },
  { value: 'proficient', label: '熟練' },
  { value: 'expertise', label: '專精' },
]

// ─── Ability Defaults ─────────────────────────────────────────────────────────

/** 購點制的各屬性初始分數 */
export const POINT_BUY_DEFAULT_SCORE = 8

/** 擲骰模式下，尚未指派骰值的屬性顯示分數 */
export const UNASSIGNED_ABILITY_SCORE = 8

/** 所有 AbilityKey，用於迭代 */
export const ABILITY_KEYS: readonly AbilityKey[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const

// ─── Iteration Keys ───────────────────────────────────────────────────────────

/** 所有 SkillKey，用於迭代 */
export const SKILL_KEYS: readonly SkillKey[] = Object.keys(SKILL_NAMES) as SkillKey[]

/** 所有 ProfessionKey，用於迭代 */
export const PROFESSION_KEYS: readonly ProfessionKey[] = Object.keys(
  PROFESSION_CONFIG,
) as ProfessionKey[]

/** 所有 AlignmentKey，用於迭代 */
export const ALIGNMENT_KEYS: readonly AlignmentKey[] = Object.keys(
  ALIGNMENT_NAMES,
) as AlignmentKey[]

/** 所有 ArmorType，用於迭代 */
export const ARMOR_TYPES: readonly ArmorType[] = Object.keys(ARMOR_TYPE_NAMES) as ArmorType[]

/** 所有 SizeKey，用於迭代 */
export const SIZE_KEYS: readonly SizeKey[] = Object.keys(SIZE_NAMES) as SizeKey[]

/** 所有 SpellSchool，用於迭代 */
export const SPELL_SCHOOLS: readonly SpellSchool[] = Object.keys(
  SPELL_SCHOOL_LABELS,
) as SpellSchool[]
