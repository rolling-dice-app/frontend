const DECIMAL_NUMBER_RE = /^-?\d+(\.\d+)?$/

/**
 * 解析整數輸入字串。
 *
 * - 空字串、空白、非十進位整數 / 小數字面值：回傳 `fallback ?? null`
 *   （拒絕科學記號 `1e5`、前綴 `+5`、缺整數部分 `.5` 等 UI 不預期的輸入）
 * - 合法數字：以 `Math.trunc` 截斷後回傳
 * - 傳入 `cap` 時對結果做 ±cap clamp（DB-blast 防線；fallback 不受 clamp 影響）
 */
export function parseIntegerInput(value: string): number | null
export function parseIntegerInput(value: string, fallback: number, cap?: number): number
export function parseIntegerInput(value: string, fallback: undefined, cap: number): number | null
export function parseIntegerInput(value: string, fallback?: number, cap?: number): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return fallback ?? null
  if (!DECIMAL_NUMBER_RE.test(trimmed)) return fallback ?? null
  const truncated = Math.trunc(Number(trimmed))
  if (cap === undefined) return truncated
  return Math.max(-cap, Math.min(cap, truncated))
}
