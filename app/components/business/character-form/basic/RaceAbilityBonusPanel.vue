<template>
  <section class="space-y-4 bg-canvas-elevated px-2">
    <h2 class="font-display text-lg font-bold text-content">{{ t('character.racial') }}</h2>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div v-for="key in ABILITY_KEYS" :key="key">
        <label :for="`race-bonus-${key}`" class="mb-1 block text-xs text-content-muted">
          {{ t(`ability.${key}`) }}
        </label>
        <CommonAppInput
          :id="`race-bonus-${key}`"
          type="number"
          step="1"
          size="sm"
          outline
          :model-value="String(formState.abilities[key].race)"
          class="w-full"
          @update:model-value="(v: string) => onUpdate(key, v)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CharacterFormState } from '~/types/business/character-form'
import { ABILITY_KEYS, CHARACTER_INT_LIMITS, type AbilityKey } from '@rolling-dice-app/core'

const { t } = useI18n()

const formState = defineModel<CharacterFormState>('formState', { required: true })

const onUpdate = (key: AbilityKey, raw: string): void => {
  formState.value.abilities[key].race = parseIntegerInput(
    raw,
    0,
    CHARACTER_INT_LIMITS.SMALL_INT_MAX,
  )
}
</script>
