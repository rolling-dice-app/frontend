<template>
  <div class="space-y-4 px-2">
    <img src="~/assets/images/dnd.png" alt="" loading="lazy" aria-hidden="true" />

    <!-- Ability table -->
    <div>
      <!-- Header -->
      <div class="flex items-center justify-between gap-1 border-b border-border pb-1 mb-1">
        <span class="w-20"></span>
        <span class="w-10 text-center text-[10px] text-content-muted">
          {{ t('character.origin') }}
        </span>
        <span class="w-10 text-center text-[10px] text-content-muted">
          {{ t('character.raceShort') }}
        </span>
        <span class="w-17 text-[10px] text-content-muted text-center">
          {{ t('character.bonus') }}
        </span>
        <span class="w-12 text-[10px] text-content-muted text-center">
          {{ t('character.totalValue') }}
        </span>
      </div>

      <!-- Rows -->
      <div
        v-for="key in ABILITY_KEYS"
        :key="key"
        class="flex items-center justify-between gap-1 py-1"
      >
        <label :for="`ability-${key}`" class="w-20 text-xs text-content truncate">
          {{ t(`ability.${key}`) }}（{{
            formatModifier(getAbilityModifier(getTotalScore(formState.abilities[key])))
          }}）
        </label>

        <!-- origin (read-only) -->
        <span class="w-10 text-center font-mono text-sm text-content-muted">
          {{ formState.abilities[key].origin }}
        </span>

        <!-- race (read-only) -->
        <span class="w-10 text-center font-mono text-sm text-content-muted">
          {{ formatSigned(formState.abilities[key].race) }}
        </span>

        <!-- bonusScore (editable stepper) -->
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="flex items-center justify-center size-6 transition-colors hover:bg-surface-hover disabled:opacity-30"
            :disabled="formState.abilities[key].bonusScore <= 0"
            :aria-label="t('character.decreaseBonus')"
            @click="adjustBonus(key, -1)"
          >
            <Icon name="minus" :size="16" />
          </button>
          <span class="w-4 text-center font-mono text-sm font-bold">
            {{ formState.abilities[key].bonusScore }}
          </span>
          <button
            type="button"
            class="flex items-center justify-center size-6 transition-colors hover:bg-surface-hover disabled:opacity-30"
            :disabled="getTotalScore(formState.abilities[key]) >= ABILITY_HARD_MAX"
            :aria-label="t('character.increaseBonus')"
            @click="adjustBonus(key, 1)"
          >
            <Icon name="plus" :size="16" />
          </button>
        </div>
        <!-- Total -->
        <span
          class="w-12 text-sm text-center"
          :class="
            getTotalScore(formState.abilities[key]) > 20
              ? 'text-danger font-bold'
              : 'text-content-muted'
          "
        >
          {{ getTotalScore(formState.abilities[key]) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import { ABILITY_HARD_MAX } from '~/constants/dnd'
import type { CharacterUpdateFormState } from '~/types/business/character-form'
import { ABILITY_KEYS, type AbilityKey } from '@rolling-dice-app/core'

const { t } = useI18n()

const formState = defineModel<CharacterUpdateFormState>('formState', { required: true })

const formatSigned = (value: number): string => {
  return value > 0 ? `+${value}` : `${value}`
}

const adjustBonus = (key: AbilityKey, delta: number): void => {
  const entry = formState.value.abilities[key]
  const nextBonus = Math.max(0, entry.bonusScore + delta)
  const nextTotal = entry.origin + entry.race + nextBonus
  if (nextBonus === entry.bonusScore || nextTotal > ABILITY_HARD_MAX) return
  entry.bonusScore = nextBonus
}
</script>
