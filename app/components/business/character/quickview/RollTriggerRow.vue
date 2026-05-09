<template>
  <li
    class="flex items-center justify-between gap-2 rounded-lg border border-border-soft bg-surface px-3 py-1.5"
  >
    <div class="flex flex-wrap items-center gap-1 text-sm">
      <span class="text-content">{{ label }}</span>
      <span class="text-sm font-bold" :class="modifierColor(modifier)">
        {{ formatModifier(modifier) }}
      </span>
    </div>
    <div class="flex items-center gap-0.5">
      <button
        type="button"
        :aria-label="`${label} ${t('combat.rollNormal')}`"
        class="flex size-7 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-surface-raised hover:text-content focus-visible:outline-2 focus-visible:outline-ring"
        @click="emit('roll', 'normal')"
      >
        <Icon name="dice" :size="18" />
      </button>
      <div class="flex flex-col sm:flex-row items-center">
        <button
          type="button"
          :aria-label="`${label} ${t('combat.rollAdvantage')}`"
          class="flex size-7 items-center justify-center rounded-md text-success transition-colors hover:text-success-hover focus-visible:outline-2 focus-visible:outline-ring"
          @click="emit('roll', 'advantage')"
        >
          <Icon name="double-triangle-up" :size="12" />
        </button>
        <button
          type="button"
          :aria-label="`${label} ${t('combat.rollDisadvantage')}`"
          class="flex size-7 items-center justify-center rounded-md text-danger transition-colors hover:text-danger-hover focus-visible:outline-2 focus-visible:outline-ring"
          @click="emit('roll', 'disadvantage')"
        >
          <Icon name="double-triangle-down" :size="12" />
        </button>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import type { RollMode } from '~/types/business/dice'

const { t } = useI18n()

defineProps<{
  label: string
  modifier: number
}>()

const emit = defineEmits<{
  roll: [mode: RollMode]
}>()

const modifierColor = (value: number): string => {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-content-muted'
}
</script>
