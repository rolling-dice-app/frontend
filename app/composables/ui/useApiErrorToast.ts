import { isFetchError } from '~/utils/api-fetch'
import { createLogger } from '~/utils/log'

/**
 * Backend mutation 錯誤的 thin dispatcher：一律顯示 systemError + 帶 context 的 logger.error。
 *
 * 設計原則：前端不解析後端錯誤碼。可預期的錯誤（輸入限制、UI 狀態限制）由 frontend preempt
 * 在發 request 前攔下；其他一律視為「預期外」，工程師看 log，user 看通用提示。
 */

const extractCode = (err: unknown): string | undefined => {
  if (!isFetchError(err)) return undefined
  const data = err.data as { code?: unknown } | undefined
  return typeof data?.code === 'string' ? data.code : undefined
}

const extractStatus = (err: unknown): number | undefined => {
  if (!isFetchError(err)) return undefined
  return err.response?.status ?? err.statusCode
}

const extractUrl = (err: unknown): string | undefined => {
  if (!isFetchError(err)) return undefined
  return typeof err.request === 'string' ? err.request : undefined
}

export const useApiErrorToast = () => {
  const toast = useToast()
  const { t } = useI18n()
  const logger = createLogger('[ApiError]')

  const handle = (err: unknown): void => {
    toast.error(t('ui.message.systemError'))
    logger.error('[unhandled API error]', {
      code: extractCode(err),
      status: extractStatus(err),
      url: extractUrl(err),
      err,
    })
  }

  return { handle }
}
