import type { CharacterCurrencyDTO } from '@rolling-dice-app/core'

/** 金幣面額快照（不含樂觀鎖 token，純記錄四幣種數量） */
export type CurrencyAmount = Omit<CharacterCurrencyDTO, 'updatedAt'>

/** 單筆戰役紀錄 */
export interface CampaignEntry {
  id: string
  /** 場次 / 任務名稱 */
  name: string
  /** 進行日期，YYYY-MM-DD */
  date: string
  /** 內容（純文字多行） */
  content: string
  /** 該場獲得金錢，依 cp / sp / gp / pp 分別記錄 */
  moneyEarning: CurrencyAmount
  /** 該場獲得經驗值 */
  expEarning: number
  createdAt: string
}

/** 戰役紀錄草稿（尚未具備 id / createdAt） */
export type CampaignEntryDraft = Omit<CampaignEntry, 'id' | 'createdAt'>

/** 單一角色的戰役紀錄條目集合 */
export interface CampaignLog {
  entries: CampaignEntry[]
  /** 是否將 moneyEarning 自動同步到 character.currency */
  syncMoneyToCurrency: boolean
}
