const SHARE_ID_RE = /\/(chs_[A-Za-z0-9_-]{22})(?:[/?#]|$)/

/**
 * 從使用者貼的分享連結擷取 shareId（形如 `chs_<22 字 URL-safe base64>`）。
 * 容錯 host 與末尾斜線 / query / hash；非法或無 match 回 null。
 */
export const parseShareIdFromLink = (input: string): string | null => {
  const trimmed = input.trim()
  if (trimmed === '') return null
  const match = SHARE_ID_RE.exec(trimmed)
  return match?.[1] ?? null
}
