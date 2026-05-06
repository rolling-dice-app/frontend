<template>
  <section class="space-y-4 bg-canvas-elevated px-2">
    <h2 class="font-display text-lg font-bold text-content">種族加值</h2>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div v-for="key in ABILITY_KEYS" :key="key">
        <label :for="`race-bonus-${key}`" class="mb-1 block text-xs text-content-muted">
          {{ ABILITY_NAMES[key] }}
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
import { ABILITY_KEYS, ABILITY_NAMES } from '~/constants/dnd'
import type { CharacterFormState } from '~/types/business/character-form'
import type { AbilityKey } from '@rolling-dice-app/core'

const formState = defineModel<CharacterFormState>('formState', { required: true })

const onUpdate = (key: AbilityKey, raw: string): void => {
  const num = Math.trunc(Number(raw))
  formState.value.abilities[key].race = Number.isFinite(num) ? num : 0
}
</script>
