/** Avatar 上傳 / 設定相關 backend error code（對應 docs/character-portrait.md 的清單） */
export type AvatarErrorCode =
  | 'AVATAR_INVALID_MIME'
  | 'AVATAR_TOO_LARGE'
  | 'AVATAR_MAGIC_BYTE_MISMATCH'
  | 'AVATAR_FILE_MISSING'
  | 'AVATAR_UPLOAD_FAILED'
  | 'AVATAR_URL_NOT_OWNED'
  | 'RATE_LIMITED'
