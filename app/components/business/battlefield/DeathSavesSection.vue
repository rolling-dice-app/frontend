<template>
  <section
    aria-labelledby="battlefield-death-saves-label"
    class="flex flex-col gap-2 rounded-lg border border-panel-border bg-panel-2 px-3 py-2"
  >
    <div class="flex items-center justify-between gap-2">
      <h3 id="battlefield-death-saves-label" class="text-sm font-bold text-content">
        {{ t('combat.deathSave') }}
      </h3>
      <CommonAppBadge variant="status" size="sm" :bg-color="statusBadgeColor">{{
        statusLabel
      }}</CommonAppBadge>
    </div>

    <div class="flex items-center justify-between gap-2">
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-3">
          <span class="w-8 text-xs text-content-muted">{{ t('combat.deathSaveSuccess') }}</span>
          <div class="flex items-center gap-1.5">
            <button
              v-for="n in 3"
              :key="`s-${n}`"
              type="button"
              :aria-label="`${t('combat.deathSaveSuccess')} ${n}`"
              :aria-pressed="successes >= n"
              class="size-5 rounded-full border-2 border-success transition-colors"
              :class="successes >= n ? 'bg-success' : 'bg-transparent'"
              @click="emit('setSuccess', successes === n ? n - 1 : n)"
            />
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="w-8 text-xs text-content-muted">{{ t('combat.deathSaveFailure') }}</span>
          <div class="flex items-center gap-1.5">
            <button
              v-for="n in 3"
              :key="`f-${n}`"
              type="button"
              :aria-label="`${t('combat.deathSaveFailure')} ${n}`"
              :aria-pressed="failures >= n"
              class="size-5 rounded-full border-2 border-danger transition-colors"
              :class="failures >= n ? 'bg-danger' : 'bg-transparent'"
              @click="emit('setFailure', failures === n ? n - 1 : n)"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        :aria-label="t('combat.deathSaveRoll')"
        :disabled="!canRoll"
        class="flex items-center gap-1.5 rounded-md border border-panel-border bg-panel-3 px-3 py-1.5 text-xs font-medium text-content hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-panel-3"
        @click="emit('roll')"
      >
        <Icon name="dice-20" :size="16" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@ui'

const { t } = useI18n()

// HP 0 gating 由父層 v-if 控（比照 combat：HP ≥ 1 歸零由 store 負責）
const props = defineProps<{
  successes: number
  failures: number
}>()

const emit = defineEmits<{
  setSuccess: [value: number]
  setFailure: [value: number]
  roll: []
}>()

const isStable = computed(() => props.successes >= 3)
const isDead = computed(() => props.failures >= 3)
const canRoll = computed(() => !isStable.value && !isDead.value)

const statusLabel = computed(() => {
  if (isDead.value) return t('combat.deathStatusDead')
  if (isStable.value) return t('combat.deathStatusStable')
  return t('combat.deathStatusInProgress')
})

const statusBadgeColor = computed(() => {
  if (isDead.value) return 'var(--color-danger)'
  if (isStable.value) return 'var(--color-success)'
  return 'var(--color-warning)'
})
</script>
