import type { AvatarErrorCode } from '~/types/business/avatar'

/** Avatar 上傳錯誤 code → 人話訊息 */
const messages: Readonly<Record<AvatarErrorCode, string>> = {
  AVATAR_INVALID_MIME: '請上傳圖片格式',
  AVATAR_TOO_LARGE: '肖像超過 1 MB，請重新裁剪',
  AVATAR_MAGIC_BYTE_MISMATCH: '肖像格式損毀，請重新上傳',
  AVATAR_FILE_MISSING: '未收到肖像檔，請重試',
  AVATAR_UPLOAD_FAILED: '儲存失敗，請稍後再試',
  AVATAR_URL_NOT_OWNED: '肖像來源無效，請重新上傳',
  RATE_LIMITED: '上傳太頻繁，請稍候再試',
}

export default messages
