<template>
  <div class="flex flex-wrap items-center gap-1">
    <button
      v-for="sides in RAW_DIE_SIDES"
      :key="sides"
      type="button"
      :aria-label="`d${sides}`"
      class="w-12 rounded-md border border-border-soft bg-surface px-2 py-1 text-center font-mono text-xs text-content transition-colors hover:border-info/30 hover:bg-info hover:text-content-inverse focus-visible:outline-2 focus-visible:outline-ring"
      @click="emit('roll', { kind: 'raw', sides })"
    >
      d{{ sides }}
    </button>
    <button
      type="button"
      aria-label="d100"
      class="w-12 rounded-md border border-border-soft bg-surface px-2 py-1 text-center font-mono text-xs text-content transition-colors hover:border-info/30 hover:bg-info hover:text-content-inverse focus-visible:outline-2 focus-visible:outline-ring"
      @click="emit('roll', { kind: 'd100' })"
    >
      d100
    </button>
  </div>
</template>

<script setup lang="ts">
import type { RawDieSides } from '~/types/business/dice'

export type AdHocRollRequest = { kind: 'raw'; sides: RawDieSides } | { kind: 'd100' }

const RAW_DIE_SIDES = [4, 6, 8, 10, 12, 20] as const satisfies readonly RawDieSides[]

const emit = defineEmits<{
  roll: [request: AdHocRollRequest]
}>()
</script>
