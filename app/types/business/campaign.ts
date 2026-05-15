import type { CampaignRecordDTO, CharacterCurrencyDTO } from '@rolling-dice-app/core'

/** 金幣面額快照（不含樂觀鎖 token，純記錄四幣種數量） */
export type CurrencyAmount = Omit<CharacterCurrencyDTO, 'updatedAt'>

/** 後端持久化的戰役紀錄；對齊 core DTO，前端不再 re-declare */
export type CampaignEntry = CampaignRecordDTO

/**
 * 表單草稿：前端 UI 僅綁五個欄位；composable 在送往 backend 時補
 * subtitle / teammates / applyMoneyToCurrency。
 * TODO(campaign): 之後補 subtitle / teammates UI 時，把對應欄位加進這裡。
 */
export interface CampaignDraft {
  title: string
  date: string
  content: string
  moneyEarning: CurrencyAmount
  expEarning: number
}
