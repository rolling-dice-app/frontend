import type { SelectOption } from '@ui'
import type {
  AbilityKey,
  AbilityScoreInput,
  AlignmentKey,
  ArmorClassConfig,
  AttackEntry,
  Character,
  CharacterAbilityScores,
  CharacterCurrency,
  CharacterFeature,
  GenderKey,
  InventoryItem,
  ClassKey,
  SkillProficiencies,
  SpellEntry,
  SpellSlotsDelta,
  SubclassKey,
} from '@rolling-dice-app/core'

// ─── Form-only Class Entry ───────────────────────────────────────────────────

/** 表單用職業條目：允許尚未選擇職業的空值狀態 */
export interface FormClassEntry {
  /** 職業（null 表示尚未選擇） */
  classKey: ClassKey | null
  /** 該職業等級（1–20） */
  level: number
  /** 流派 / 範型，未選以 null 表示 */
  subclass: SubclassKey | null
}

// ─── Ability Form Aliases ────────────────────────────────────────────────────

/** 建立流程表單型別（六屬性） */
export type AbilityScores = Record<AbilityKey, AbilityScoreInput>

/** 計算後總值（讓只關心 modifier 的消費端使用） */
export type TotalAbilityScores = Record<AbilityKey, number>

// ─── UI Drafts ───────────────────────────────────────────────────────────────

/** 物品草稿（尚未具備 id；同調狀態由 composable 管理，不入草稿） */
export type InventoryItemDraft = Omit<InventoryItem, 'id' | 'isAttuned'>

/** 攻擊草稿（尚未具備 id 的攻擊條目，常見於新增/編輯 modal） */
export type AttackDraft = Omit<AttackEntry, 'id'>

/** 特性草稿（尚未具備 id 的條目） */
export type FeatureDraft = Omit<CharacterFeature, 'id'>

// ─── Form State ──────────────────────────────────────────────────────────────

/** 能力值分配方式 */
export type AbilityMethod = 'custom' | 'diceRoll'

/** 擲骰模式下骰值池單元 */
export interface DiceSlot {
  /** 穩定識別，作為下拉 option 的 key 與 value */
  id: string
  /** 擲骰結果（4d6 取最高 3） */
  value: number
  /** 已指派的屬性 key；尚未指派時為 null */
  assignedTo: AbilityKey | null
}

/** 擲骰指派下拉的單一屬性 view model */
export interface DiceCell {
  /** 該屬性目前指派的 slot id；未指派時為空字串 */
  selectedId: string
  /** 下拉選項（首項為「未指派」+ 6 個骰值，其他屬性已指派的標 disabled） */
  options: SelectOption[]
}

/** 角色表單共用基底欄位（未填欄位統一以 null 表示） */
export interface CharacterFormStateBase {
  name: string
  gender: GenderKey | null
  race: string | null
  subrace: string | null
  alignment: AlignmentKey | null
  classes: FormClassEntry[]
  skills: SkillProficiencies
  background: string | null
  isJackOfAllTrades: boolean
  isTough: boolean
  faith: string | null
  age: number | null
  height: string | null
  weight: string | null
  appearance: string | null
  story: string | null
  languages: string | null
  tools: string | null
  weaponProficiencies: string | null
  armorProficiencies: string | null
}

/** 建立角色表單的 draft 狀態 */
export interface CharacterFormState extends CharacterFormStateBase {
  abilities: AbilityScores
  abilityMethod: AbilityMethod
  /** 擲骰模式下產生的骰值池；其他模式維持空陣列 */
  dicePool: DiceSlot[]
}

/** 更新角色表單的狀態（abilities 保留 basicScore + bonusScore 結構） */
export interface CharacterUpdateFormState extends CharacterFormStateBase {
  id: string
  abilities: CharacterAbilityScores
  /** 使用者額外勾選的豁免熟練（不含主職業 baseline） */
  savingThrowExtras: AbilityKey[]
  /** 護甲等級設定 */
  armorClass: ArmorClassConfig
  /** 額外移動速度加值，移動速度 = 30 + speedBonus */
  speedBonus: number
  /** 額外先攻加值 */
  initiativeBonus: number
  /** 額外加值到先攻的屬性（null = 不加） */
  initiativeAbilityKey: AbilityKey | null
  /** 額外被動察覺加值 */
  passivePerceptionBonus: number
  /** 額外被動洞察加值 */
  passiveInsightBonus: number
  /** 額外生命值（與職業 HP、體質加值、健壯加值累加為總 HP） */
  customHpBonus: number
  /** 自訂攻擊列表 */
  attacks: AttackEntry[]
  /** 施法主屬性列表 */
  spellcastingAbilities: AbilityKey[]
  /** 各施法主屬性的自定義調整值；只記錄非 0 項 */
  customSpellcastingBonuses: Partial<Record<AbilityKey, number>>
  /** 角色掌握的法術 */
  spells: SpellEntry[]
  /** 一般施法者環位的使用者調整量 */
  spellSlotsDelta: SpellSlotsDelta
  /** 契術師 pact magic 環位的使用者調整量 */
  pactSlotsDelta: SpellSlotsDelta
  /** 角色特性列表 */
  features: CharacterFeature[]
  /** 背包與儲物袋的物品列表 */
  items: InventoryItem[]
  /** 持有金錢 */
  currency: CharacterCurrency
}

// ─── Store Mapper Internal ───────────────────────────────────────────────────

/**
 * Character 中可由 form state 直接產生的欄位子集。
 * 僅供 store 邊界使用（mapper 的輸出 + action 消費），composable/page 不應 import。
 */
export type CharacterWritablePatch = Pick<
  Character,
  | 'name'
  | 'gender'
  | 'race'
  | 'subrace'
  | 'alignment'
  | 'classes'
  | 'skills'
  | 'background'
  | 'isJackOfAllTrades'
  | 'isTough'
  | 'faith'
  | 'age'
  | 'height'
  | 'weight'
  | 'appearance'
  | 'story'
  | 'languages'
  | 'tools'
  | 'weaponProficiencies'
  | 'armorProficiencies'
>
