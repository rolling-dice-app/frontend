import type { DamageDieEntry } from '@rolling-dice-app/core'

/**
 * 把單一傷害條目格式化為骰式字串（不含傷害類型 label，類型由呼叫端以 i18n 補）。
 * 例：`2d6+3` / `1d8` / `+3` / `0`。
 */
export function formatDamageDice(entry: DamageDieEntry): string {
  const dice = entry.count > 0 && entry.dieType ? `${entry.count}d${entry.dieType}` : ''
  const bonus =
    entry.bonus != null && entry.bonus !== 0
      ? entry.bonus > 0
        ? `+${entry.bonus}`
        : `${entry.bonus}`
      : ''
  return dice + bonus || '0'
}
