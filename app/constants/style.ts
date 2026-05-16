import type { FeatureSource } from '@rolling-dice-app/core'

// ─── Radius ───────────────────────────────────────────────────────────────────

/**
 * design-language §6 圓角級距（px）。@ui Button/Card/Badge 的 radius prop
 * 為 number，吃不進 CSS var，故圓角的單一來源集中於此；CSS 端用 Tailwind
 * rounded-/rounded-md/rounded-lg（v4 預設值已對齊 4/6/8）。
 */
export const RADIUS = {
  /** 角-小：標籤、chip */
  sm: 4,
  /** 角-中：按鈕、輸入框、圖示按鈕 */
  md: 6,
  /** 角-大：卡片、面板、Modal、Drawer */
  lg: 8,
} as const

// ─── Feature badge ────────────────────────────────────────────────────────────

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
