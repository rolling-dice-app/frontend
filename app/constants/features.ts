import type { FeatureSource, FeatureUsageRecovery } from '@rolling-dice-app/core'

/** 特性來源顯示文字 */
export const FEATURE_SOURCE_LABELS: Readonly<Record<FeatureSource, string>> = {
  feat: '專長',
  class: '職業',
  race: '種族',
  background: '背景',
  other: '其他',
}

/** 特性來源 badge 顏色（依 source 類型區分） */
export const FEATURE_SOURCE_BADGE_STYLES: Readonly<
  Record<FeatureSource, { bgColor: string; textColor: string }>
> = {
  feat: { bgColor: 'var(--color-primary)', textColor: 'var(--color-primary-soft)' },
  class: { bgColor: 'var(--color-info)', textColor: 'var(--color-info-soft)' },
  race: { bgColor: 'var(--color-success)', textColor: 'var(--color-success-soft)' },
  background: { bgColor: 'var(--color-secondary)', textColor: 'var(--color-content)' },
  other: { bgColor: 'var(--color-panel)', textColor: 'var(--color-content)' },
}

/** 特性次數恢復時機顯示文字 */
export const FEATURE_RECOVERY_LABELS: Readonly<Record<FeatureUsageRecovery, string>> = {
  shortRest: '短休',
  longRest: '長休',
  manual: '手動',
}
