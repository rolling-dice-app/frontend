import { isFetchError } from '~/utils/api-fetch'
import { createLogger } from '~/utils/log'

/**
 * Sub-resource mutation 統一錯誤分流：
 * - 行為層（refetch / revert / catalog refresh）：本 plan 已就位
 * - 訊息層（i18n key 設計）：依 docs/issues/m3/error-i18n-policy 結論後再補；目前對所有
 *   user-facing 錯誤統一吐 ui.message.saveFailed，避免散落每處新增 i18n key。
 */

type ApiErrorCode =
  | 'STALE_SPELL_ENTRY_VERSION'
  | 'STALE_INVENTORY_ITEM_VERSION'
  | 'STALE_CURRENCY_VERSION'
  | 'STALE_CHARACTER_VERSION'
  | 'ATTUNED_LIMIT_EXCEEDED'
  | 'ITEM_LIMIT_EXCEEDED'
  | 'SPELL_ALREADY_LEARNED'
  | 'SPELL_NOT_FOUND'
  | 'VALIDATION_ERROR'

export interface ApiErrorRecovery {
  /** 樂觀鎖 / 過期版本：呼叫對應 slice 的 refetch */
  onStale?: () => Promise<unknown> | unknown
  /** SPELL_NOT_FOUND：重新撈圖鑑 */
  onSpellNotFound?: () => Promise<unknown> | unknown
}

const extractCode = (err: unknown): string | undefined => {
  if (!isFetchError(err)) return undefined
  const data = err.data as { code?: unknown } | undefined
  return typeof data?.code === 'string' ? data.code : undefined
}

export const useApiErrorToast = () => {
  const toast = useToast()
  const { t } = useI18n()
  const logger = createLogger('[ApiError]')

  /**
   * 依 error.data.code 決定行為與 toast；未對應到的 code / 非 FetchError 視為系統錯誤。
   */
  const handle = async (err: unknown, recovery?: ApiErrorRecovery): Promise<void> => {
    const code = extractCode(err) as ApiErrorCode | undefined

    switch (code) {
      case 'STALE_SPELL_ENTRY_VERSION':
      case 'STALE_INVENTORY_ITEM_VERSION':
      case 'STALE_CURRENCY_VERSION':
      case 'STALE_CHARACTER_VERSION':
        toast.error(t('ui.message.staleCharacter'))
        await recovery?.onStale?.()
        return
      case 'SPELL_NOT_FOUND':
        toast.error(t('ui.message.saveFailed'))
        await recovery?.onSpellNotFound?.()
        return
      case 'SPELL_ALREADY_LEARNED':
      case 'ATTUNED_LIMIT_EXCEEDED':
      case 'ITEM_LIMIT_EXCEEDED':
        toast.error(t('ui.message.saveFailed'))
        return
      case 'VALIDATION_ERROR':
        logger.error('VALIDATION_ERROR (前端送錯欄位)：', err)
        toast.error(t('ui.message.saveFailed'))
        return
      default:
        logger.error('unmapped API error:', err)
        toast.error(t('ui.message.saveFailed'))
    }
  }

  return { handle }
}
