import type {
  ClassEntry,
  ConditionKey,
  DamageDieEntry,
  DeathSaves,
  SkillKey,
} from '@rolling-dice-app/core'

/**
 * m7.3 即時戰場 — 契約鏡像 + UI 型別（mock 階段）。
 *
 * 戰場參戰實例為「絕對值快照」模型（設計定稿第五節）：加入戰場時把角色卡／
 * 怪物模板計算完成的絕對值快照進來，之後與來源互不同步、不回寫。
 * CombatPhase 採內聯欄位（battleSequence / round / activeUnitId），不落獨立實體。
 *
 * TODO(串接階段): core 契約定稿後改 import `@rolling-dice-app/core`，刪除本檔鏡像
 * 型別（BattlefieldUnit / BattlefieldDTO 等），僅保留 UI-only 型別。
 */

export type BattlefieldUnitKind = 'character' | 'monster' | 'adhoc'

export type BattlefieldFaction = 'player' | 'enemy' | 'neutral'

export interface BattlefieldCondition {
  id: string
  key: ConditionKey
  note: string | null
}

/** 攻擊快照條目；命中為 flat 總值（快照時已攤平），傷害復用 DamageDieEntry 供自動擲骰取數 */
export interface BattlefieldAttackEntry {
  id: string
  name: string
  /** 命中加值（flat 總值） */
  hitBonus: number
  damageDice: DamageDieEntry[]
  /** 補充說明（觸發條件、附加效果等）；未填為 null */
  comment: string | null
}

export interface BattlefieldUnit {
  id: string
  kind: BattlefieldUnitKind
  /** 角色單位回溯 share 來源；monster / adhoc 為 null */
  shareId: string | null
  /** 怪物實例回溯模板來源；character / adhoc 為 null */
  templateId: string | null
  faction: BattlefieldFaction
  name: string
  /** 顯示用補充（monster CR 描述／adhoc 說明），character 恆空字串 */
  title: string
  /** character 快照種族；其他 kind 為 null */
  race: string | null
  /** character 快照職業列表；其他 kind 為空陣列 */
  classes: ClassEntry[]
  maxHp: number
  /** 快照當下的最大 HP；「結束戰鬥不保留其他調整值」時的重置基準 */
  baseMaxHp: number
  currentHp: number
  tempHp: number
  /** 快照當下的 AC；重置基準 */
  baseAc: number
  currentAc: number
  /** 速度快照（呎；建立時定格、不可變）：角色寫前端計算值、怪物搬模板 speed、adhoc 手填；未知為 null */
  speed: number | null
  /** 速度臨時調整（疊加於 speed 快照，比照 HP/AC 調整值模型）；speed 為 null 時無意義 */
  speedAdjustment: number
  initiativeBonus: number
  initiative: number | null
  /** 先攻軌顯示順序；擲骰後自動重排，拖曳為手動覆蓋 */
  sortOrder: number
  conditions: BattlefieldCondition[]
  inCombat: boolean
  /** 死亡豁免計數；僅 HP 0 時顯示／計數（HP ≥ 1 歸零） */
  deathSaves: DeathSaves
  /** 攻擊快照；角色／怪物加入時由來源快照，adhoc 空陣列起步 */
  attacks: BattlefieldAttackEntry[]
  /** 技能加值快照（flat 總值）；只快照有加值的技能，adhoc 為空物件 */
  skills: Partial<Record<SkillKey, number>>
}

export interface BattlefieldDTO {
  id: string
  sessionId: string
  /** 同一戰場的第幾場戰鬥（CombatPhase 內聯欄位） */
  battleSequence: number
  round: number
  activeUnitId: string | null
  /** false = 本場戰鬥已結束、尚未開下一場 */
  inProgress: boolean
  units: BattlefieldUnit[]
  createdAt: string
  updatedAt: string
}

/** 入口頁的團務選項；battlefieldId 有值表示該團務已有戰場（1 團務至多 1 戰場） */
export interface BattlefieldSessionOption {
  sessionId: string
  containerTitle: string
  sessionTitle: string
  date: string
  memberCount: number
  battlefieldId: string | null
}

/**
 * 出席成員快照來源（mock 階段模擬 hydrate 結果；串接階段由前端 fetch share
 * profile 後經衍生管線組成）。maxHp / ac / speed / totalInitiative 為前端
 * 以契約基礎欄位計算的衍生總值（useCharacterDerivedStats 同路徑），非後端提供
 * 的儲存欄位。
 */
export type BattlefieldMemberSource =
  | {
      shareId: string
      playerName: string
      available: true
      name: string
      race: string | null
      classes: ClassEntry[]
      maxHp: number
      ac: number
      /** 總速度（30 + speedBonus，呎） */
      speed: number
      /** 含 DEX 與額外能力的先攻總修正；非契約 initiativeBonus（額外加值）原值 */
      totalInitiative: number
      /** 攻擊快照（命中已攤平為 flat 總值） */
      attacks: BattlefieldAttackEntry[]
      /** 技能加值快照；只含熟練或有調整的技能攤平總值 */
      skills: Partial<Record<SkillKey, number>>
    }
  | {
      shareId: string
      playerName: string
      /** share 已停止分享或角色已刪除，無法建立快照 */
      available: false
    }

/** 怪物模板來源（欄位對齊 MonsterTemplateDTO 子集） */
export interface BattlefieldTemplateSource {
  id: string
  name: string
  challengeRating: string | null
  hp: number
  ac: number
  /** 速度（呎；core v12 起模板 speed 為 number） */
  speed: number
  initiativeBonus: number
  /** 攻擊列表（模板 hitBonus 即 flat 總值） */
  attacks: BattlefieldAttackEntry[]
  /** 技能加值（模板 skills 原樣搬） */
  skills: Partial<Record<SkillKey, number>>
}

/** 手動臨時單位表單輸入 */
export interface AdhocUnitInput {
  name: string
  maxHp: number
  ac: number
  /** 速度（呎） */
  speed: number
  initiativeBonus: number
}

/** 結束戰鬥彈窗的逐項保留選擇（2026-07-16 決議） */
export interface EndBattleKeepFlags {
  keepCurrentHp: boolean
  keepTempHp: boolean
  keepConditions: boolean
  keepAdjustments: boolean
}
