import type { CharacterCurrency } from '@rolling-dice-app/core'

/** 單筆冒險 / 團務紀錄 */
export interface AdventureEntry {
  id: string
  /** 場次 / 任務名稱 */
  name: string
  /** 進行日期，YYYY-MM-DD */
  date: string
  /** 內容（純文字多行） */
  content: string
  /** 該場獲得金錢，依 cp / sp / gp / pp 分別記錄 */
  moneyEarning: CharacterCurrency
  /** 該場獲得經驗值 */
  expEarning: number
  createdAt: string
}

/** 冒險紀錄草稿（尚未具備 id / createdAt） */
export type AdventureEntryDraft = Omit<AdventureEntry, 'id' | 'createdAt'>

/** 單一角色的冒險紀錄條目集合 */
export interface AdventureLog {
  entries: AdventureEntry[]
  /** 是否將 moneyEarning 自動同步到 character.currency */
  syncMoneyToCurrency: boolean
}
