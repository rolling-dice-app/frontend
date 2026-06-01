import { computed, type ComputedRef } from 'vue'
import type { SelectOption } from '@ui'
import { CLASS_KEYS, SPELL_SCHOOLS, SPELL_SOURCES } from '@rolling-dice-app/core'

interface SpellSelectOptions {
  /** 環數下拉選項：戲法(0) ~ 9 環 */
  levelOptions: ComputedRef<SelectOption[]>
  /** 學派下拉選項：八大學派 */
  schoolOptions: ComputedRef<SelectOption[]>
  /** 職業下拉選項：13 職業中文 label */
  classOptions: ComputedRef<SelectOption[]>
  /** 資源下拉選項：sourcebook 縮寫 */
  sourceOptions: ComputedRef<SelectOption[]>
}

/** 法術書 / 法術資料庫 filter 的下拉選項，依當前 locale 動態產生 label */
export function useSpellSelectOptions(): SpellSelectOptions {
  const { t } = useI18n()

  const levelOptions = computed<SelectOption[]>(() => [
    { value: 0, label: t('spell.cantrip') },
    ...Array.from({ length: 9 }, (_, i) => ({
      value: i + 1,
      label: `${i + 1} ${t('spell.level')}`,
    })),
  ])

  const schoolOptions = computed<SelectOption[]>(() =>
    SPELL_SCHOOLS.map((key) => ({ value: key, label: t(`spell.school.${key}`) })),
  )

  const classOptions = computed<SelectOption[]>(() =>
    CLASS_KEYS.map((key) => ({ value: key, label: t(`class.label.${key}`) })),
  )

  const sourceOptions = computed<SelectOption[]>(() =>
    SPELL_SOURCES.map((key) => ({ value: key, label: key })),
  )

  return { levelOptions, schoolOptions, classOptions, sourceOptions }
}
