import type { BattlefieldAttackEntry, ClassEntry, SkillKey } from '@rolling-dice-app/core'

/**
 * m7.3 即時戰場 — UI-only 型別。
 *
 * 契約型別（BattlefieldDTO / BattlefieldUnit / BattlefieldSessionOption 等）
 * 一律 import `@rolling-dice-app/core`（12.1.0 起）；本檔僅保留不進 core 的
 * 前端組合型別：快照來源、表單輸入、結束戰鬥保留旗標。
 */

/**
 * 出席成員快照來源；由前端 fetch share profile 後經衍生管線組成
 * （helpers/battlefield-snapshot.ts）。maxHp / ac / speed / totalInitiative 為
 * 前端以契約基礎欄位計算的衍生總值（useCharacterDerivedStats 同路徑），非後端
 * 提供的儲存欄位。memberId 為團務出席名單條目 id，供移除／重新連結回寫。
 */
export type BattlefieldMemberSource =
  | {
      /** 團務出席名單條目 id（DmSessionMemberDTO.id） */
      memberId: string
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
      /** 技能加值快照；只含熟練技能的攤平總值 */
      skills: Partial<Record<SkillKey, number>>
    }
  | {
      memberId: string
      shareId: string
      playerName: string
      /** share 已停止分享或角色已刪除，無法建立快照 */
      available: false
    }

/** 怪物模板來源（MonsterTemplateSummaryDTO 投影）；速度／先攻等重欄位於加入戰場時抓單筆詳情快照 */
export interface BattlefieldTemplateSource {
  id: string
  name: string
  challengeRating: string | null
  hp: number
  ac: number
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
