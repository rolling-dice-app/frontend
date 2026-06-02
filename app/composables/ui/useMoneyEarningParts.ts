import { computed } from 'vue'
import type { CurrencyAmount, CurrencyKey } from '@rolling-dice-app/core'

export interface MoneyPart {
  key: CurrencyKey
  label: string
  value: number
}

// 顯示順序：大面額在前（pp→gp→sp→cp），只列出 > 0 的幣別。
const DISPLAY_ORDER: readonly CurrencyKey[] = ['pp', 'gp', 'sp', 'cp']

/**
 * 戰役紀錄「本場獲得金錢」的顯示 parts（key + 短標籤 + 數值）。
 * 由 ShareCampaignList / CampaignItem 共用，避免各自硬編幣別標籤與順序而漂移。
 */
export function useMoneyEarningParts(): (money: CurrencyAmount) => MoneyPart[] {
  const { t } = useI18n()
  const labels = computed<Record<CurrencyKey, string>>(() => ({
    cp: t('inventory.cpShort'),
    sp: t('inventory.spShort'),
    gp: t('inventory.gpShort'),
    pp: t('inventory.ppShort'),
  }))
  return (money: CurrencyAmount): MoneyPart[] =>
    DISPLAY_ORDER.filter((key) => money[key] > 0).map((key) => ({
      key,
      label: labels.value[key],
      value: money[key],
    }))
}
