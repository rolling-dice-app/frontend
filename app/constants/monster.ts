import type { SizeKey } from '@rolling-dice-app/core'

/**
 * 體型選單顯示順序（微型 → 巨型）。
 *
 * core 目前只導出 `SizeKey` 型別、未導出對應 const 陣列，故在前端以此 presentation
 * 用途的順序陣列補足；標籤走 i18n `character.size.*`。
 * TODO(串接階段): 若 core 後續導出 `SIZE_KEYS`，改 import 並移除此檔。
 */
export const SIZE_KEYS: readonly SizeKey[] = [
  'tiny',
  'small',
  'medium',
  'large',
  'huge',
  'gargantuan',
]
