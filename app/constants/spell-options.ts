import type { SelectOption } from '@ui'
import type { SourceKey } from '@rolling-dice-app/core'
import { PROFESSION_CONFIG, PROFESSION_KEYS, SPELL_SCHOOLS, SPELL_SCHOOL_LABELS } from './dnd'

/** 環數下拉選項：戲法(0) ~ 9 環 */
export const SPELL_LEVEL_OPTIONS: readonly SelectOption[] = [
  { value: 0, label: '戲法' },
  ...Array.from({ length: 9 }, (_, i) => ({ value: i + 1, label: `${i + 1} 環` })),
]

/** 學派下拉選項：八大學派（多選使用，無「全部」選項） */
export const SPELL_SCHOOL_OPTIONS: readonly SelectOption[] = SPELL_SCHOOLS.map((key) => ({
  value: key,
  label: SPELL_SCHOOL_LABELS[key],
}))

/** 職業下拉選項：以 PROFESSION_CONFIG 中文 label 顯示 */
export const SPELL_PROFESSION_OPTIONS: readonly SelectOption[] = PROFESSION_KEYS.map((key) => ({
  value: key,
  label: PROFESSION_CONFIG[key].label,
}))

/** 法術資源（sourcebook）順序 */
export const SPELL_SOURCE_KEYS: readonly SourceKey[] = [
  'AAG',
  'AI',
  'BMT',
  'EGW',
  'FTD',
  'GGR',
  'PHB',
  'SCC',
  'TCE',
  'TDCSR',
  'XGE',
]

/** 資源下拉選項：僅顯示縮寫 */
export const SPELL_SOURCE_OPTIONS: readonly SelectOption[] = SPELL_SOURCE_KEYS.map((key) => ({
  value: key,
  label: key,
}))
