import type { DmSessionLogDTO } from '@rolling-dice-app/core'

/**
 * 團務紀錄的 UI form state。
 * 契約型別（DmSessionLogDTO 等）來自 `@rolling-dice-app/core`，此處僅保留 UI-only 衍生型別。
 */

/** 紀錄草稿；create / update 表單共用，不含伺服端欄位（id / containerId / 時間戳） */
export type DmSessionLogDraft = Omit<
  DmSessionLogDTO,
  'id' | 'containerId' | 'createdAt' | 'updatedAt'
>
