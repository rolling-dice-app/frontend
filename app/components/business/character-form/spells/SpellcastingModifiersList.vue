<template>
  <section :aria-labelledby="headingId" class="rounded-lg border border-border-soft bg-canvas p-3">
    <header class="mb-1.5 flex items-center justify-between">
      <h3 :id="headingId" class="font-display text-sm font-bold text-content">
        {{ t('spell.castingBonus') }}
      </h3>
      <span class="text-xs text-content-muted">
        {{ t('spell.proficient') }} +{{ proficiencyBonus }}
      </span>
    </header>

    <p v-if="rows.length === 0" class="py-3 text-center text-xs text-content-muted">
      {{ t('spell.noPrimaryAbilitySelected') }}
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
          :class="getModifierColorClass(row.bonus)"
        >
          {{ formatModifier(row.bonus) }}
        </span>
        <label :for="row.inputId" class="ml-auto text-xs text-content-muted">
          {{ t('spell.custom') }}
        </label>
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
import type { TotalAbilityScores } from '~/types/business/character-form'
import { CHARACTER_INT_LIMITS, type AbilityKey } from '@rolling-dice-app/core'

const { t } = useI18n()

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
      name: t(`ability.${key}`),
      bonus,
      customStr: custom === 0 ? '' : String(custom),
      inputId: `${inputIdPrefix}-${key}`,
    }
  }),
)

const onCustomChange = (key: AbilityKey, value: string): void => {
  const parsed = parseIntegerInput(value, 0, CHARACTER_INT_LIMITS.SMALL_INT_MAX)
  const { [key]: _omit, ...rest } = customBonuses.value
  customBonuses.value = parsed === 0 ? rest : { ...rest, [key]: parsed }
}

// 施法屬性變更時，剔除不再選取屬性殘留的 custom bonus，避免幽靈加值送出
watch(
  () => props.selectedAbilities,
  (abilities) => {
    const allowed = new Set(abilities)
    const next: Partial<Record<AbilityKey, number>> = {}
    let changed = false
    for (const [key, value] of Object.entries(customBonuses.value) as [AbilityKey, number][]) {
      if (allowed.has(key)) next[key] = value
      else changed = true
    }
    if (changed) customBonuses.value = next
  },
  { deep: true },
)
</script>
