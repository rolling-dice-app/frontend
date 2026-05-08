<template>
  <section aria-labelledby="quickview-saves-label" class="flex h-full flex-col">
    <h3 id="quickview-saves-label" class="mb-2 font-display text-sm font-bold text-content">
      屬性 / 豁免
    </h3>
    <ul class="grid flex-1 auto-rows-fr grid-flow-col grid-rows-6 sm:grid-rows-3 gap-2">
      <li
        v-for="row in rows"
        :key="row.key"
        class="flex items-center justify-between gap-2 rounded-lg border border-border-soft bg-surface px-3 py-2"
      >
        <div
          class="flex flex-wrap items-center gap-1 text-sm"
          :class="row.proficient ? 'text-primary' : 'text-content'"
          :aria-label="row.proficient ? `${row.name}（熟練）` : row.name"
        >
          <span>{{ row.name }}</span>
          <div class="flex items-center gap-1">
            <span class="text-xs text-content-muted">({{ row.score }})</span>
            <span class="text-sm font-bold" :class="modifierColor(row.bonus)">
              {{ formatModifier(row.bonus) }}
            </span>
          </div>
        </div>
        <div class="flex items-center">
          <button
            type="button"
            :aria-label="`${row.name} 豁免 -1`"
            class="flex size-6 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content"
            @click="emit('adjust', row.key, -1)"
          >
            <Icon name="minus" :size="12" />
          </button>
          <span
            class="min-w-8 text-center text-sm font-bold"
            :class="modifierColor(row.adjustment)"
            :aria-label="`目前調整 ${formatModifier(row.adjustment)}`"
          >
            {{ formatModifier(row.adjustment) }}
          </span>
          <button
            type="button"
            :aria-label="`${row.name} 豁免 +1`"
            class="flex size-6 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content"
            @click="emit('adjust', row.key, 1)"
          >
            <Icon name="plus" :size="12" />
          </button>
        </div>
      </li>
    </ul>

    <div
      v-if="spellSaveRows.length > 0"
      class="mt-2 flex items-center gap-3 rounded-lg border border-border-soft bg-surface px-3 py-2"
    >
      <span class="text-sm font-semibold text-content-muted">法術豁免 DC</span>
      <ul class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <li v-for="row in spellSaveRows" :key="row.key" class="flex items-center gap-1.5 text-sm">
          <span class="text-content-muted">{{ row.name }}</span>
          <span class="font-bold text-content">{{ row.dc }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import { ABILITY_NAMES } from '~/constants/dnd'
import { getSpellSaveDc } from '~/helpers/character'
import type { TotalAbilityScores } from '~/types/business/character-form'
import { ABILITY_KEYS, type AbilityKey } from '@rolling-dice-app/core'

const props = defineProps<{
  abilityScores: TotalAbilityScores
  proficiencyBonus: number
  proficiencies: AbilityKey[]
  adjustments: Partial<Record<AbilityKey, number>>
  spellcastingAbilities: AbilityKey[]
  customSpellcastingBonuses: Partial<Record<AbilityKey, number>>
}>()

const emit = defineEmits<{
  adjust: [key: AbilityKey, delta: number]
}>()

const proficiencySet = computed(() => new Set(props.proficiencies))

const rows = computed(() =>
  ABILITY_KEYS.map((key) => {
    const score = props.abilityScores[key]
    const proficient = proficiencySet.value.has(key)
    const modifier = getAbilityModifier(score)
    const base = getSavingThrowBonus(modifier, proficient, props.proficiencyBonus)
    const adjustment = props.adjustments[key] ?? 0
    return {
      key,
      name: ABILITY_NAMES[key],
      score,
      proficient,
      bonus: base + adjustment,
      adjustment,
    }
  }),
)

const spellSaveRows = computed(() =>
  props.spellcastingAbilities.map((key) => ({
    key,
    name: ABILITY_NAMES[key],
    dc: getSpellSaveDc({
      abilityModifier: getAbilityModifier(props.abilityScores[key]),
      proficiencyBonus: props.proficiencyBonus,
      customBonus: props.customSpellcastingBonuses[key] ?? 0,
    }),
  })),
)

const modifierColor = (value: number): string => {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-content-muted'
}
</script>
