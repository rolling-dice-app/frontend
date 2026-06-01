import type {
  CampaignRecordDTO,
  CurrencyAmount,
  SharedCharacterPreviewDTO,
} from '@rolling-dice-app/core'

/** 後端持久化的戰役紀錄；對齊 core DTO，前端不再 re-declare */
export type CampaignEntry = CampaignRecordDTO

/**
 * 表單草稿。teammates 在 draft 階段以 hydrated SharedCharacterPreviewDTO 存放（chip 需要 avatar/name），
 * composable 送往 backend 時轉成 shareId[]。
 */
export interface CampaignDraft {
  title: string
  subtitle: string | null
  date: string
  content: string
  teammates: SharedCharacterPreviewDTO[]
  moneyEarning: CurrencyAmount
  expEarning: number
}
