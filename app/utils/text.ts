/** trim 前後空白；null / undefined 視為空字串 */
export function cleanText(value: string | null | undefined): string {
  return (value ?? '').trim()
}

/** trim 前後空白；trim 後為空字串時回傳 null */
export function cleanTextOrNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? null : trimmed
}
