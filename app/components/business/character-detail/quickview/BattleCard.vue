<template>
  <section aria-labelledby="quickview-battle-label" class="flex h-full flex-col">
    <h3 id="quickview-battle-label" class="mb-2 font-display text-sm font-bold text-content">
      {{ t('combat.battleSection') }}
    </h3>
    <div class="flex flex-1 flex-col gap-2 tabular">
      <div class="grid grid-cols-2 gap-2">
        <div
          class="flex flex-col gap-1 items-center justify-center rounded-lg border border-border-soft bg-surface p-3"
        >
          <span class="text-xs text-content-muted">{{ t('combat.acValue') }}</span>
          <span class="flex items-baseline gap-1">
            <span class="text-2xl font-bold text-content">
              {{ baseArmorClass + acAdjustment }}
            </span>
            <span v-if="acAdjustment !== 0" class="text-xs" :class="adjustmentColor(acAdjustment)">
              ({{ formatModifier(acAdjustment) }})
            </span>
          </span>
          <div class="flex gap-1">
            <button
              type="button"
              aria-label="AC -1"
              :disabled="acAdjustment <= -COMBAT_STATE_LIMITS.AC_ADJUSTMENT_ABS_MAX"
              class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-content-muted"
              @click="emit('adjustAc', -1)"
            >
              <Icon name="minus" :size="14" />
            </button>
            <button
              type="button"
              aria-label="AC +1"
              :disabled="acAdjustment >= COMBAT_STATE_LIMITS.AC_ADJUSTMENT_ABS_MAX"
              class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-content-muted"
              @click="emit('adjustAc', 1)"
            >
              <Icon name="plus" :size="14" />
            </button>
          </div>
        </div>

        <div
          class="flex flex-col gap-1 items-center justify-center rounded-lg border border-border-soft bg-surface p-3"
        >
          <span class="text-xs text-content-muted">
            {{ t('combat.speed') }}（{{ t('combat.unitFeet') }}）
          </span>
          <span class="flex items-baseline gap-1">
            <span class="text-2xl font-bold text-content">
              {{ baseSpeed + speedAdjustment }}
            </span>
            <span
              v-if="speedAdjustment !== 0"
              class="text-xs"
              :class="adjustmentColor(speedAdjustment)"
            >
              ({{ formatModifier(speedAdjustment) }})
            </span>
          </span>
          <div class="flex gap-1">
            <button
              type="button"
              :aria-label="`${t('combat.speed')} -5`"
              :disabled="speedAdjustment <= -COMBAT_STATE_LIMITS.SPEED_ADJUSTMENT_ABS_MAX"
              class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-content-muted"
              @click="emit('adjustSpeed', -5)"
            >
              <Icon name="minus" :size="14" />
            </button>
            <button
              type="button"
              :aria-label="`${t('combat.speed')} +5`"
              :disabled="speedAdjustment >= COMBAT_STATE_LIMITS.SPEED_ADJUSTMENT_ABS_MAX"
              class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-content-muted"
              @click="emit('adjustSpeed', 5)"
            >
              <Icon name="plus" :size="14" />
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div
          class="flex flex-col gap-1 items-center justify-center rounded-lg border border-border-soft bg-surface p-3"
        >
          <span class="text-xs text-content-muted">{{ t('combat.passivePerception') }}</span>
          <span class="mt-1 text-2xl font-bold text-content">{{ passivePerception }}</span>
        </div>

        <div
          class="flex flex-col gap-1 items-center justify-center rounded-lg border border-border-soft bg-surface p-3"
        >
          <span class="text-xs text-content-muted">{{ t('combat.passiveInsight') }}</span>
          <span class="mt-1 text-2xl font-bold text-content">{{ passiveInsight }}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div
          class="flex flex-col gap-1 items-center justify-center rounded-lg border border-border-soft bg-surface p-3"
        >
          <span class="text-xs text-content-muted">{{ t('combat.initiative') }}</span>
          <span class="mt-1 text-2xl font-bold" :class="initiativeColor">
            {{ formatModifier(initiative) }}
          </span>
        </div>

        <div
          class="flex flex-col gap-1 items-center justify-center rounded-lg border border-border-soft bg-surface p-3"
        >
          <span class="text-xs text-content-muted">{{ t('combat.proficiencyBonus') }}</span>
          <span class="mt-1 text-2xl font-bold text-content">
            {{ formatModifier(proficiencyBonus) }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import { COMBAT_STATE_LIMITS } from '@rolling-dice-app/core'

const { t } = useI18n()

const props = defineProps<{
  baseArmorClass: number
  acAdjustment: number
  baseSpeed: number
  speedAdjustment: number
  initiative: number
  passivePerception: number
  passiveInsight: number
  proficiencyBonus: number
}>()

const emit = defineEmits<{
  adjustAc: [delta: number]
  adjustSpeed: [delta: number]
}>()

const initiativeColor = computed(() => {
  if (props.initiative > 0) return 'text-success'
  if (props.initiative < 0) return 'text-danger'
  return 'text-content-muted'
})

const adjustmentColor = (value: number): string => {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-content-muted'
}
</script>
