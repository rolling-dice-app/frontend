import type {
  AbilityKey,
  AlignmentKey,
  DamageDieEntry,
  SizeKey,
  SkillKey,
} from '@rolling-dice-app/core'

/**
 * 怪物模板的 UI view-model / form state（m7.1 UI 階段）。
 *
 * TODO(串接階段): core 發佈含怪物型別的版本後，改從 `@rolling-dice-app/core`
 * import `MonsterTemplateDTO` / `MonsterTemplateSummaryDTO` /
 * `MonsterAttackEntry` / `MonsterFeature`，並移除此處的本地宣告。目前前端裝的
 * core 版本尚未含這些型別，故先在前端本地鏡像契約形狀以驅動 UI。
 */

/** 怪物攻擊條目；命中走寫死 flat 加值，傷害重用角色的 DamageDieEntry */
export interface MonsterAttackEntry {
  id: string
  name: string
  hitBonus: number
  damageDice: DamageDieEntry[]
  comment: string | null
}

/** 攻擊草稿（尚未具備 id 的條目，用於新增 / 編輯 modal） */
export type MonsterAttackDraft = Omit<MonsterAttackEntry, 'id'>

/** 怪物特性 / 動作；平鋪、僅名稱＋描述，不分組 */
export interface MonsterFeature {
  id: string
  name: string
  description: string | null
}

/** 特性草稿（尚未具備 id 的條目） */
export type MonsterFeatureDraft = Omit<MonsterFeature, 'id'>

/** 列表用輕量子集 */
export interface MonsterTemplateSummary {
  id: string
  name: string
  size: SizeKey | null
  challengeRating: string | null
  ac: number
  hp: number
}

/** 完整怪物模板 view（數值全走 flat 絕對值） */
export interface MonsterTemplateView {
  id: string
  name: string
  size: SizeKey | null
  alignment: AlignmentKey | null
  challengeRating: string | null
  ac: number
  hp: number
  speed: string
  initiativeBonus: number
  abilities: Record<AbilityKey, number>
  savingThrows: Partial<Record<AbilityKey, number>>
  skills: Partial<Record<SkillKey, number>>
  damageVulnerabilities: string | null
  damageResistances: string | null
  damageImmunities: string | null
  conditionImmunities: string | null
  senses: string | null
  languages: string | null
  attacks: MonsterAttackEntry[]
  features: MonsterFeature[]
}

/**
 * 編輯怪物模板的 form state。本階段欄位等同 view 的可改欄位（含 id 以利對應）；
 * 串接階段 submit 時改 diff 對到 PATCH body。
 */
export type MonsterTemplateFormState = MonsterTemplateView
