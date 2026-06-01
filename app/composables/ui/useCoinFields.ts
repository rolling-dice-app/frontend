import { computed, type ComputedRef } from 'vue'
import { CURRENCY_KEYS, type CurrencyKey } from '@rolling-dice-app/core'

export interface CoinField {
  key: CurrencyKey
  label: string
}

/**
 * 幣別欄位（key + 已 i18n label），順序固定採 core `CURRENCY_KEYS`（cp→sp→gp→pp）。
 * 由 CurrencyPanel / CurrencyEditModal 共用，避免各自硬編幣序而漂移。
 */
export function useCoinFields(): ComputedRef<CoinField[]> {
  const { t } = useI18n()
  return computed(() => CURRENCY_KEYS.map((key) => ({ key, label: t(`inventory.${key}`) })))
}
