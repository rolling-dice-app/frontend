<template>
  <section aria-labelledby="quickview-saves-label" class="flex h-full flex-col">
    <h3 id="quickview-saves-label" class="mb-2 font-display text-sm font-bold text-content">
      {{ t('combat.savingThrowSection') }}
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
          :aria-label="row.proficient ? `${row.name}（${t('combat.proficient')}）` : row.name"
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
            :aria-label="`${row.name} ${t('combat.savingThrow')} -1`"
            :disabled="row.adjustment <= -COMBAT_STATE_LIMITS.SAVING_THROW_ADJUSTMENT_ABS_MAX"
            class="flex size-6 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-content-muted"
            @click="emit('adjust', row.key, -1)"
          >
            <Icon name="minus" :size="12" />
          </button>
          <span
            class="min-w-8 text-center text-sm font-bold"
            :class="modifierColor(row.adjustment)"
            :aria-label="`${t('combat.currentAdjustment')} ${formatModifier(row.adjustment)}`"
          >
            {{ formatModifier(row.adjustment) }}
          </span>
          <button
            type="button"
            :aria-label="`${row.name} ${t('combat.savingThrow')} +1`"
            :disabled="row.adjustment >= COMBAT_STATE_LIMITS.SAVING_THROW_ADJUSTMENT_ABS_MAX"
            class="flex size-6 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-content-muted"
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
      <span class="text-sm font-semibold text-content-muted">{{ t('combat.spellSaveDc') }}</span>
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
import { getSpellSaveDc } from '~/helpers/character'
import type { TotalAbilityScores } from '~/types/business/character-form'
import { ABILITY_KEYS, COMBAT_STATE_LIMITS, type AbilityKey } from '@rolling-dice-app/core'

const { t } = useI18n()

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

const savingThrowBonuses = computed(() =>
  calculateSavingThrowBonuses({
    abilityScores: props.abilityScores,
    proficiencies: props.proficiencies,
    proficiencyBonus: props.proficiencyBonus,
    adjustments: props.adjustments,
  }),
)

const rows = computed(() =>
  ABILITY_KEYS.map((key) => ({
    key,
    name: t(`ability.${key}`),
    score: props.abilityScores[key],
    proficient: proficiencySet.value.has(key),
    bonus: savingThrowBonuses.value[key],
    adjustment: props.adjustments[key] ?? 0,
  })),
)

const spellSaveRows = computed(() =>
  props.spellcastingAbilities.map((key) => ({
    key,
    name: t(`ability.${key}`),
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
