<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <span
      data-testid="battlefield-round-meta"
      :data-battle-sequence="battleSequence"
      :data-round="round"
      class="inline-flex min-h-7 items-center gap-1 rounded-lg border border-border-soft bg-canvas-inset px-2.5 text-sm font-bold tabular-nums"
    >
      <small class="text-xs font-medium text-content-muted">
        {{ t('battlefield.battleSeqChip', { seq: battleSequence }) }} |
      </small>
      {{ t('battlefield.roundMeta', { round }) }}
    </span>
    <CommonAppButton
      type="button"
      variant="neutral"
      size="xs"
      :disabled="disabled"
      @click="emit('prevTurn')"
    >
      ◂ {{ t('battlefield.prevTurn') }}
    </CommonAppButton>
    <CommonAppButton
      type="button"
      variant="primary"
      size="xs"
      data-testid="battlefield-next-turn"
      :disabled="disabled"
      @click="emit('nextTurn')"
    >
      {{ t('battlefield.nextTurn') }} ▸
    </CommonAppButton>
    <span class="flex-1" />
    <CommonAppButton type="button" variant="secondary" size="xs" @click="emit('rollEnemies')">
      {{ t('battlefield.rollAllEnemies') }}
    </CommonAppButton>
    <CommonAppButton
      type="button"
      variant="ghost"
      size="sm"
      data-testid="battlefield-sort-initiative"
      :title="t('battlefield.sortByInitiativeTitle')"
      @click="emit('sortInitiative')"
    >
      {{ t('battlefield.sortByInitiative') }}
    </CommonAppButton>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  battleSequence: number
  round: number
  /** 無參戰單位時停用回合推進 */
  disabled: boolean
}>()

const emit = defineEmits<{
  prevTurn: []
  nextTurn: []
  rollEnemies: []
  sortInitiative: []
}>()
</script>
