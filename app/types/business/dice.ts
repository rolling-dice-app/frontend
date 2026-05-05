import type { DamageTypeKey } from '@rolling-dice-app/types'

/** 擲骰模式 */
export type RollMode = 'normal' | 'advantage' | 'disadvantage'

/** 擲骰類別 */
export type RollKind = 'ability' | 'saving-throw' | 'skill' | 'attack-hit' | 'attack-damage'

interface BaseRollEntry {
  id: string
  rolledAt: number
  label: string
}

/** d20 類擲骰結果（屬性 / 豁免 / 技能 / 攻擊命中） */
export interface D20RollEntry extends BaseRollEntry {
  kind: 'ability' | 'saving-throw' | 'skill' | 'attack-hit'
  mode: RollMode
  /** 原始 d20 骰值；normal 為單顆，advantage / disadvantage 為兩顆 */
  rolls: number[]
  /** 採用值：normal 取唯一、advantage 取較大、disadvantage 取較小 */
  chosen: number
  modifier: number
  total: number
  isCritical: boolean
  isFumble: boolean
}

/** 攻擊傷害的單行擲骰結果 */
export interface DamageRollLine {
  /** 該行原始骰值；純加值行為空陣列 */
  rolls: number[]
  /** 骰面（null 表純加值行） */
  sides: number | null
  /** 骰數 */
  count: number
  /** 該行加值（含已套入的主屬性 mod） */
  bonus: number
  /** 傷害類型 */
  damageType: DamageTypeKey | null
  /** 該行小計 */
  subtotal: number
}

/** 攻擊傷害擲骰結果 */
export interface DamageRollEntry extends BaseRollEntry {
  kind: 'attack-damage'
  lines: DamageRollLine[]
  total: number
  isCritical: boolean
}

export type RollEntry = D20RollEntry | DamageRollEntry

/** push 用的草稿型別：對 union 分配套用 Omit，避免共同欄位被合併 */
export type RollEntryDraft =
  | Omit<D20RollEntry, 'id' | 'rolledAt'>
  | Omit<DamageRollEntry, 'id' | 'rolledAt'>
