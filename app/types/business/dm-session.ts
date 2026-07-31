import type { DmSessionContainerDTO, DmSessionLogDTO } from '@rolling-dice-app/core'

/**
 * 團務紀錄的 UI form state。
 * 契約型別（DmSessionLogDTO 等）來自 `@rolling-dice-app/core`，此處僅保留 UI-only 衍生型別。
 */

/** 紀錄草稿；create / update 表單共用，不含伺服端欄位（id / containerId / 時間戳） */
export type DmSessionLogDraft = Omit<
  DmSessionLogDTO,
  'id' | 'containerId' | 'createdAt' | 'updatedAt'
>

/**
 * 更新團務容器的結果三態。頁面需區分才不會在無變更時謊報「已儲存」。
 *
 * - `saved`：PATCH 成功且已取得新副本
 * - `unchanged`：無任何欄位變更，未發請求
 * - `stale`：PATCH 已成功但 re-GET 失敗（資料已存，僅新副本暫不可得）
 */
export type DmSessionContainerSaveResult =
  | { status: 'saved'; container: DmSessionContainerDTO }
  | { status: 'unchanged'; container: DmSessionContainerDTO }
  | { status: 'stale' }
