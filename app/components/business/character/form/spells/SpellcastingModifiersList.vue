<template>
  <section :aria-labelledby="headingId" class="rounded-lg border border-border-soft bg-canvas p-3">
    <header class="mb-1.5 flex items-center justify-between">
      <h3 :id="headingId" class="font-display text-sm font-bold text-content">施法調整值</h3>
      <span class="text-xs text-content-muted">熟練 +{{ proficiencyBonus }}</span>
    </header>

    <p v-if="rows.length === 0" class="py-3 text-center text-xs text-content-muted">
      尚未選擇施法主屬性
    </p>
    <ul v-else class="space-y-2">
      <li
        v-for="row in rows"
        :key="row.key"
        class="flex items-center gap-3 rounded-md border border-border-soft bg-surface px-3 py-2"
      >
        <span class="w-10 shrink-0 text-sm font-semibold text-content">{{ row.name }}</span>
        <span
          class="w-12 shrink-0 text-right text-sm font-bold"
          :class="modifierTextColor(row.bonus)"
        >
          {{ formatModifier(row.bonus) }}
        </span>
        <label :for="row.inputId" class="ml-auto text-xs text-content-muted">自定義</label>
        <CommonAppInput
          :id="row.inputId"
          :radius="0"
          :model-value="row.customStr"
          type="number"
          size="sm"
          outline
          placeholder="0"
          class="w-20"
          @update:model-value="(value) => onCustomChange(row.key, value)"
        />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ABILITY_NAMES } from '~/constants/dnd'
import type { TotalAbilityScores } from '~/types/business/character-form'
import type { AbilityKey } from '@rolling-dice-app/types'

const props = defineProps<{
  selectedAbilities: AbilityKey[]
  proficiencyBonus: number
  abilityScores: TotalAbilityScores
}>()

const customBonuses = defineModel<Partial<Record<AbilityKey, number>>>('customBonuses', {
  required: true,
})

const headingId = useId()
const inputIdPrefix = useId()

const rows = computed(() =>
  props.selectedAbilities.map((key) => {
    const abilityMod = getAbilityModifier(props.abilityScores[key])
    const bonus = props.proficiencyBonus + abilityMod
    const custom = customBonuses.value[key] ?? 0
    return {
      key,
      name: ABILITY_NAMES[key],
      bonus,
      customStr: custom === 0 ? '' : String(custom),
      inputId: `${inputIdPrefix}-${key}`,
    }
  }),
)

const onCustomChange = (key: AbilityKey, value: string): void => {
  const parsed = parseIntegerInput(value, 0)
  const { [key]: _omit, ...rest } = customBonuses.value
  customBonuses.value = parsed === 0 ? rest : { ...rest, [key]: parsed }
}

const modifierTextColor = (value: number): string => {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-content-muted'
}
</script>
