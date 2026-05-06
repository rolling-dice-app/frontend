<template>
  <section :aria-labelledby="headingId" class="rounded-lg border border-border-soft bg-canvas p-3">
    <header class="mb-2 flex items-center justify-between">
      <label :id="headingId" :for="selectId" class="font-display text-sm font-bold text-content">
        施法主屬性
      </label>
      <span class="text-xs text-content-muted">兼職施法者可選多項</span>
    </header>

    <CommonAppSelect
      :id="selectId"
      v-model="abilities"
      :options="options"
      multiple
      placeholder="尚未設定"
      size="sm"
      class="w-full"
    />
  </section>
</template>

<script setup lang="ts">
import { ABILITY_KEYS, ABILITY_NAMES } from '~/constants/dnd'
import type { AbilityKey } from '@rolling-dice-app/core'

const abilities = defineModel<AbilityKey[]>('abilities', { required: true })

const headingId = useId()
const selectId = useId()

const options = ABILITY_KEYS.map((key) => ({ value: key, label: ABILITY_NAMES[key] }))
</script>
