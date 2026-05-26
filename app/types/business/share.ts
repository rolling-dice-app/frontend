import type { SharedInventoryItemDTO } from '@rolling-dice-app/core'

/**
 * 公開分享頁的 inventory item view-model。
 * `id` 為前端合成的穩定鍵（給 `:key` 與展開狀態用），不對應後端持久 id。
 * 公開投影本身不含 id / createdAt / updatedAt（避免洩漏 owner 端的樂觀鎖時間戳）。
 */
export interface SharedInventoryItemViewModel extends SharedInventoryItemDTO {
  id: string
}
