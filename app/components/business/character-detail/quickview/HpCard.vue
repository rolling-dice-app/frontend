<template>
  <section aria-labelledby="quickview-hp-label">
    <h3 id="quickview-hp-label" class="mb-2 font-display text-sm font-bold text-content">
      {{ t('combat.hp') }}
    </h3>

    <div class="grid grid-cols-3 gap-2 tabular">
      <div
        class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3 gap-1"
      >
        <span class="text-xs text-content-muted">{{ t('combat.hpMax') }}</span>
        <span class="mt-1 flex items-baseline gap-1">
          <span class="text-2xl font-bold text-content">{{ maxHp }}</span>
          <span v-if="maxAdjustment !== 0" class="text-xs" :class="adjustmentColor(maxAdjustment)">
            ({{ formatModifier(maxAdjustment) }})
          </span>
        </span>
        <div class="mt-2 flex gap-1">
          <button
            type="button"
            :aria-label="`${t('combat.hpMax')} -1`"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content"
            @click="emit('adjustMax', -1)"
          >
            <Icon name="minus" :size="14" />
          </button>
          <button
            type="button"
            data-testid="combat-hp-max-increment"
            :aria-label="`${t('combat.hpMax')} +1`"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content"
            @click="emit('adjustMax', 1)"
          >
            <Icon name="plus" :size="14" />
          </button>
        </div>
      </div>

      <div
        class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3 gap-1"
      >
        <span class="text-xs text-content-muted">{{ t('combat.hpTemp') }}</span>
        <span class="mt-1 text-2xl font-bold text-content">{{ tempHp }}</span>
        <div class="mt-2 flex gap-1">
          <button
            type="button"
            :aria-label="`${t('combat.hpTemp')} -1`"
            :disabled="tempHp <= 0"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-content-muted"
            @click="emit('adjustTemp', -1)"
          >
            <Icon name="minus" :size="14" />
          </button>
          <button
            type="button"
            :aria-label="`${t('combat.hpTemp')} +1`"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content"
            @click="emit('adjustTemp', 1)"
          >
            <Icon name="plus" :size="14" />
          </button>
        </div>
      </div>

      <div
        class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3 gap-1"
      >
        <span class="text-xs text-content-muted">{{ t('combat.hpCurrent') }}</span>
        <span class="mt-1 text-2xl font-bold" :class="currentHpColor">{{ currentHp }}</span>
        <div class="mt-2 flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            :aria-label="t('combat.hurt')"
            :disabled="amount <= 0"
            class="flex size-7 items-center justify-center rounded-md text-danger hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            @click="onDamage"
          >
            <Icon name="hurt" :size="16" />
          </button>
          <CommonAppInput
            :model-value="String(amount)"
            :radius="0"
            type="number"
            size="sm"
            outline
            placeholder="0"
            :aria-label="t('combat.adjust')"
            class="w-9 sm:w-12"
            @update:model-value="
              amount = parseIntegerInput($event, 0, CHARACTER_INT_LIMITS.GENERAL_INT_MAX)
            "
          />
          <button
            type="button"
            :aria-label="t('combat.heal')"
            :disabled="amount <= 0"
            class="flex size-7 items-center justify-center rounded-md text-success hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            @click="onHeal"
          >
            <Icon name="heal" :size="20" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import { CHARACTER_INT_LIMITS } from '@rolling-dice-app/core'

const { t } = useI18n()

const props = defineProps<{
  currentHp: number
  maxHp: number
  maxAdjustment: number
  tempHp: number
}>()

const emit = defineEmits<{
  damage: [amount: number]
  heal: [amount: number]
  adjustTemp: [delta: number]
  adjustMax: [delta: number]
}>()

const amount = ref(0)

const currentHpColor = computed(() => {
  if (props.maxHp === 0) return 'text-content'
  const ratio = props.currentHp / props.maxHp
  if (ratio <= 0.25) return 'text-danger'
  if (ratio <= 0.5) return 'text-warning'
  return 'text-content'
})

const adjustmentColor = (value: number): string => {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-content-muted'
}

const onDamage = (): void => {
  if (amount.value <= 0) return
  emit('damage', amount.value)
  amount.value = 0
}

const onHeal = (): void => {
  if (amount.value <= 0) return
  emit('heal', amount.value)
  amount.value = 0
}
</script>
