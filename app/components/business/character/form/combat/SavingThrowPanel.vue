<template>
  <section aria-labelledby="section-saving-throws">
    <h2 id="section-saving-throws" class="mb-4 font-display text-lg font-bold text-content">
      豁免熟練
    </h2>
    <ul class="grid grid-cols-2 gap-2">
      <li
        v-for="row in rows"
        :key="row.key"
        class="flex items-center justify-between gap-2 rounded-lg border border-border-soft bg-surface px-3 py-2"
      >
        <label
          class="flex flex-1 items-center gap-2"
          :class="row.locked ? 'cursor-not-allowed' : 'cursor-pointer'"
        >
          <Checkbox
            :model-value="row.proficient"
            :disabled="row.locked"
            size="sm"
            color="var(--color-primary)"
            :aria-label="`${row.name} 豁免熟練${row.locked ? '（主職業，不可變更）' : ''}`"
            @update:model-value="(checked) => onToggle(row.key, checked)"
          />
          <span class="text-sm font-semibold text-content">{{ row.name }}</span>
        </label>
        <span class="text-sm font-bold" :class="modifierTextColor(row.bonus)">
          {{ formatModifier(row.bonus) }}
        </span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { Checkbox } from '@ui'
import { ABILITY_KEYS, ABILITY_NAMES } from '~/constants/dnd'
import { calculateSavingThrowProficiencies } from '~/helpers/character'
import type { ProfessionEntry, AbilityKey } from '@rolling-dice-app/types'
import type { CharacterUpdateFormState, TotalAbilityScores } from '~/types/business/character-form'

const formState = defineModel<CharacterUpdateFormState>('formState', { required: true })

const props = defineProps<{
  professions: ProfessionEntry[]
  abilityScores: TotalAbilityScores
  proficiencyBonus: number
}>()

const lockedKeys = computed(() => new Set(calculateSavingThrowProficiencies(props.professions)))
const extrasSet = computed(() => new Set(formState.value.savingThrowExtras))

const rows = computed(() =>
  ABILITY_KEYS.map((key) => {
    const locked = lockedKeys.value.has(key)
    const proficient = locked || extrasSet.value.has(key)
    const modifier = getAbilityModifier(props.abilityScores[key])
    const bonus = getSavingThrowBonus(modifier, proficient, props.proficiencyBonus)
    return { key, name: ABILITY_NAMES[key], locked, proficient, bonus }
  }),
)

const onToggle = (key: AbilityKey, checked: boolean): void => {
  if (lockedKeys.value.has(key)) return
  const next = new Set(formState.value.savingThrowExtras)
  if (checked) next.add(key)
  else next.delete(key)
  formState.value.savingThrowExtras = Array.from(next)
}

const modifierTextColor = (value: number): string => {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-content-muted'
}
</script>
