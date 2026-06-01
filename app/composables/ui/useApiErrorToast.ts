import { isApiErrorCode, type ApiErrorCode } from '@rolling-dice-app/core'
import { isFetchError } from '~/utils/api-fetch'
import { createLogger } from '~/utils/log'
import type { InterpolationParams, MessagePath } from '~/i18n'

/**
 * Backend mutation 錯誤的 dispatcher：
 *
 * - 不可 preempt 的錯誤（race / 環境 / cooldown / rate-limit）走 ERROR_MESSAGE_MAP 專屬訊息
 * - 可 preempt 的錯誤（plan limit / validation / 上限 / file size 等）由前端在發 request 前攔下；
 *   漏到這裡走 generic systemError fallback
 *
 * 設計原則：thin dispatcher + preempt。新增 race code 時兩邊同步：
 *   - 加 mapping 條目於本檔 ERROR_MESSAGE_MAP
 *   - 加 i18n 訊息於 `app/i18n/zh-TW/ui.ts` 的 `error.*`
 *   - 同步 backend `error-handling-conventions` skill 的「Frontend toast 同步」段
 */

interface NormalizedError {
  code: string | undefined
  status: number | undefined
  url: string | undefined
  details: unknown
  isFetch: boolean
}

const extractError = (err: unknown): NormalizedError => {
  if (!isFetchError(err)) {
    return {
      code: undefined,
      status: undefined,
      url: undefined,
      details: undefined,
      isFetch: false,
    }
  }
  const data = err.data as { code?: unknown; details?: unknown } | undefined
  return {
    code: typeof data?.code === 'string' ? data.code : undefined,
    status: err.response?.status ?? err.statusCode,
    url: typeof err.request === 'string' ? err.request : undefined,
    details: data?.details,
    isFetch: true,
  }
}

interface ErrorMapping {
  messageKey: MessagePath
  getParams?: (details: unknown) => InterpolationParams
}

const restoreCooldownParams = (details: unknown): InterpolationParams => {
  const ends =
    typeof (details as { cooldownEndsAt?: unknown })?.cooldownEndsAt === 'string'
      ? new Date((details as { cooldownEndsAt: string }).cooldownEndsAt)
      : null
  if (!ends || Number.isNaN(ends.getTime())) return { minutes: 1 }
  const minutes = Math.max(1, Math.ceil((ends.getTime() - Date.now()) / 60_000))
  return { minutes }
}

/** 不可 preempt 的 code → 專屬訊息。新增 race code 必須同步更新此表 + i18n + backend skill。 */
const ERROR_MESSAGE_MAP: Partial<Record<ApiErrorCode, ErrorMapping>> = {
  // ─ Optimistic-lock race：同一資源被其他來源（另開 tab、其他裝置、隊友）改過後，本端拿著
  //   舊 updatedAt PATCH 被 409 退回。
  /** 角色主資料 PATCH 撞 race（如同時開兩個 tab 編輯同一角色卡） */
  STALE_CHARACTER_VERSION: { messageKey: 'ui.error.staleVersion' },
  /** 戰鬥狀態 PATCH 撞 race（HP / slot / death save 等與隊友戰場同時操作） */
  STALE_COMBAT_STATE_VERSION: { messageKey: 'ui.error.staleVersion' },
  /** 戰役紀錄 PATCH 撞 race（同筆紀錄在他端被修改） */
  STALE_CAMPAIGN_RECORD_VERSION: { messageKey: 'ui.error.staleVersion' },
  /** User profile / preference PATCH 撞 race（settings 頁與其他裝置同時改 displayName 等） */
  STALE_USER_VERSION: { messageKey: 'ui.error.staleVersion' },
  /** Currency PATCH 撞 race（背包資產與 campaign record moneyEarning 自動同步衝突） */
  STALE_CURRENCY_VERSION: { messageKey: 'ui.error.staleVersion' },

  // ─ Backend-tracked cooldown：時間限制由 backend 把關，client 無法事先得知是否已過期。
  /** 還原角色卡後 7 天 cooldown 內又按刪除；details.cooldownEndsAt 帶剩餘時間 */
  RESTORE_COOLDOWN_ACTIVE: {
    messageKey: 'ui.error.restoreCooldown',
    getParams: restoreCooldownParams,
  },

  // ─ Rate limit：bucket 狀態只在 backend，client 看不到剩餘額度。
  /** session-keyed mutation 連發超過閾值（@fastify/rate-limit 拋出） */
  RATE_LIMITED: { messageKey: 'ui.error.rateLimited' },
}

export const useApiErrorToast = () => {
  const toast = useToast()
  const { t } = useI18n()
  const logger = createLogger('[ApiError]')

  /**
   * 訊息決策順序：
   *   1. options.toastMessage（caller 動作層級覆寫）
   *   2. ERROR_MESSAGE_MAP[code]（race / cooldown / rate-limit）
   *   3. status >= 500 → serverError
   *   4. FetchError 且無 status → network
   *   5. 其他（4xx 漏網、非 FetchError）→ systemError
   */
  const resolveMessage = (normalized: NormalizedError): string => {
    const mapping = isApiErrorCode(normalized.code) ? ERROR_MESSAGE_MAP[normalized.code] : undefined
    if (mapping) return t(mapping.messageKey, mapping.getParams?.(normalized.details))
    if (normalized.status !== undefined && normalized.status >= 500)
      return t('ui.error.serverError')
    if (normalized.isFetch && normalized.status === undefined) return t('ui.error.network')
    return t('ui.message.systemError')
  }

  const handle = (err: unknown, options: { toastMessage?: string } = {}): void => {
    const normalized = extractError(err)
    toast.error(options.toastMessage ?? resolveMessage(normalized))
    // production 只印 sanitized 欄位；原始 err 可能含 request/response headers 等敏感資料，僅 dev 印出
    logger.error('[unhandled API error]', {
      code: normalized.code,
      status: normalized.status,
      url: normalized.url,
      ...(import.meta.dev ? { err } : {}),
    })
  }

  return { handle }
}
