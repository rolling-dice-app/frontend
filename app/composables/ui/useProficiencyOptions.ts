import { computed, type ComputedRef } from 'vue'
import type { SelectOption } from '@ui'
import type { ProficiencyLevel } from '@rolling-dice-app/core'

const PROFICIENCY_LEVELS = [
  'none',
  'proficient',
  'expertise',
] as const satisfies readonly ProficiencyLevel[]

/** 技能熟練度下拉選項：none / proficient / expertise，依當前 locale 動態產生 label */
export function useProficiencyOptions(): { options: ComputedRef<SelectOption[]> } {
  const { t } = useI18n()
  const options = computed<SelectOption[]>(() =>
    PROFICIENCY_LEVELS.map((key) => ({ value: key, label: t(`skill.proficiency.${key}`) })),
  )
  return { options }
}
