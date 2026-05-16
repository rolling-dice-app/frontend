import type {
  CharacterDTO,
  CharacterCurrencyDTO,
  CampaignRecordDTO,
  InventoryItemDTO,
  SpellDTO,
} from '@rolling-dice-app/core'

/**
 * 分享頁唯讀資料聚合：角色本體 + 各獨立 sub-resource 快照，外加擁有者顯示字串。
 *
 * contract 目前無擁有者欄位，ownerDisplayName 暫由前端 view-model 承載；
 * 正式串接時改由後端 server-filtered DTO 提供（走 core repo 新增）。
 */
export interface ShareCharacterView {
  ownerDisplayName: string
  character: CharacterDTO
  /** 已學法術完整資料；mock 階段直接給 SpellDTO，正式為 entry + catalog join 結果 */
  learnedSpells: SpellDTO[]
  inventoryItems: InventoryItemDTO[]
  currency: CharacterCurrencyDTO
  campaignRecords: CampaignRecordDTO[]
}
