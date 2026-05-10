import type { OAuthErrorCode } from '@rolling-dice-app/core'

/** OAuth redirect ?error=<code> 對應的人話訊息 */
const messages: Readonly<Record<OAuthErrorCode, string>> = {
  OAUTH_USER_DENIED: '你在 Google 取消了授權',
  OAUTH_STATE_MISMATCH: '登入流程逾時或被中斷，請重新登入',
  OAUTH_CODE_EXCHANGE_FAILED: 'Google 連線失敗，請稍後再試',
  OAUTH_USERINFO_FAILED: '無法取得 Google 帳號資訊，請稍後再試',
  OAUTH_EMAIL_UNVERIFIED: '你的 Google 帳號 email 尚未驗證',
  OAUTH_EMAIL_ALREADY_LINKED: '此 email 已綁定其他帳號',
  OAUTH_UNEXPECTED_ERROR: '發生未預期錯誤，請稍後再試',
}

export default messages
