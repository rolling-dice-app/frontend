import type { FeatureSource } from '@rolling-dice-app/core'

interface BadgeStyle {
  bgColor: string
  textColor: string
}

/** 特性來源 badge 顏色（依 source 類型區分） */
export const FEATURE_SOURCE_BADGE_STYLES: Readonly<Record<FeatureSource, BadgeStyle>> = {
  feat: { bgColor: 'var(--color-primary)', textColor: 'var(--color-primary-soft)' },
  class: { bgColor: 'var(--color-info)', textColor: 'var(--color-info-soft)' },
  race: { bgColor: 'var(--color-success)', textColor: 'var(--color-success-soft)' },
  background: { bgColor: 'var(--color-secondary)', textColor: 'var(--color-content)' },
  other: { bgColor: 'var(--color-panel)', textColor: 'var(--color-content)' },
}
