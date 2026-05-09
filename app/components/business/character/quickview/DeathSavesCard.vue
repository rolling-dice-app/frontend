<template>
  <section
    aria-labelledby="quickview-death-saves-label"
    :aria-disabled="!active"
    :class="{ 'opacity-60': !active }"
  >
    <div class="mb-2 flex items-center justify-between gap-2">
      <h3 id="quickview-death-saves-label" class="font-display text-sm font-bold text-content">
        {{ t('combat.deathSave') }}
      </h3>
      <Badge size="sm" :bg-color="statusBadgeColor">{{ statusLabel }}</Badge>
    </div>

    <div
      class="flex justify-between gap-2 rounded-lg border border-border-soft bg-surface px-3 py-3"
    >
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-content-muted">{{ t('combat.deathSaveSuccess') }}</span>
          <div class="flex items-center gap-1.5">
            <button
              v-for="n in 3"
              :key="`s-${n}`"
              type="button"
              :aria-label="`${t('combat.deathSaveSuccess')} ${n}`"
              :aria-pressed="successes >= n"
              :disabled="!active"
              class="size-5 rounded-full border-2 border-success transition-colors disabled:cursor-not-allowed"
              :class="successes >= n ? 'bg-success' : 'bg-transparent'"
              @click="onSuccessClick(n)"
            />
          </div>
        </div>

        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-content-muted">{{ t('combat.deathSaveFailure') }}</span>
          <div class="flex items-center gap-1.5">
            <button
              v-for="n in 3"
              :key="`f-${n}`"
              type="button"
              :aria-label="`${t('combat.deathSaveFailure')} ${n}`"
              :aria-pressed="failures >= n"
              :disabled="!active"
              class="size-5 rounded-full border-2 border-danger transition-colors disabled:cursor-not-allowed"
              :class="failures >= n ? 'bg-danger' : 'bg-transparent'"
              @click="onFailureClick(n)"
            />
          </div>
        </div>
      </div>

      <div class="mt-1 flex justify-end">
        <button
          type="button"
          :aria-label="t('combat.deathSaveRoll')"
          :disabled="!canRoll"
          class="flex items-center gap-1.5 rounded-md border border-border-soft bg-surface-raised px-3 py-1.5 text-xs font-medium text-content hover:bg-panel-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface-raised"
          @click="onRoll"
        >
          <Icon name="dice-20" :size="16" />
          <!-- 擲 d20 -->
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Badge, Icon } from '@ui'
import { rollD20 } from '~/helpers/dice'

const { t } = useI18n()

const props = defineProps<{
  active: boolean
  successes: number
  failures: number
}>()

const emit = defineEmits<{
  setSuccess: [value: number]
  setFailure: [value: number]
  rollNat20: []
}>()

const isStable = computed(() => props.successes >= 3)
const isDead = computed(() => props.failures >= 3)
const canRoll = computed(() => props.active && !isStable.value && !isDead.value)

const statusLabel = computed(() => {
  if (!props.active) return t('combat.deathStatusInactive')
  if (isDead.value) return t('combat.deathStatusDead')
  if (isStable.value) return t('combat.deathStatusStable')
  return t('combat.deathStatusInProgress')
})

const statusBadgeColor = computed(() => {
  if (!props.active) return 'var(--color-surface-2)'
  if (isDead.value) return 'var(--color-danger)'
  if (isStable.value) return 'var(--color-success)'
  return 'var(--color-warning)'
})

const onSuccessClick = (n: number): void => {
  if (!props.active) return
  emit('setSuccess', props.successes === n ? n - 1 : n)
}

const onFailureClick = (n: number): void => {
  if (!props.active) return
  emit('setFailure', props.failures === n ? n - 1 : n)
}

const onRoll = (): void => {
  if (!canRoll.value) return
  const { rolls, chosen } = rollD20('normal')
  const isCritical = chosen === 20
  const isFumble = chosen === 1

  useDiceRollLog().push({
    kind: 'saving-throw',
    label: t('combat.deathSave'),
    mode: 'normal',
    rolls,
    chosen,
    modifier: 0,
    total: chosen,
    isCritical,
    isFumble,
  })

  if (isCritical) {
    emit('rollNat20')
    return
  }
  if (isFumble) {
    emit('setFailure', Math.min(3, props.failures + 2))
    return
  }
  if (chosen >= 10) {
    emit('setSuccess', Math.min(3, props.successes + 1))
  } else {
    emit('setFailure', Math.min(3, props.failures + 1))
  }
}
</script>
