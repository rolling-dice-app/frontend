<template>
  <span class="inline-flex items-center gap-0.5">
    <button
      type="button"
      data-testid="battlefield-damage"
      :aria-label="t('battlefield.damageAria', { name })"
      :title="t('battlefield.damageTitle')"
      :disabled="amount <= 0"
      class="flex size-7 items-center justify-center rounded-md text-danger-hover hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      @click="onDamage"
    >
      <Icon name="hurt" :size="15" />
    </button>
    <CommonAppInput
      :model-value="String(amount)"
      data-testid="battlefield-hp-amount"
      :radius="0"
      type="number"
      size="sm"
      outline
      placeholder="0"
      :aria-label="t('battlefield.amountAria', { name })"
      class="w-11"
      @update:model-value="
        amount = parseIntegerInput($event, 0, CHARACTER_INT_LIMITS.GENERAL_INT_MAX)
      "
    />
    <button
      type="button"
      :aria-label="t('battlefield.healAria', { name })"
      :title="t('battlefield.healTitle')"
      :disabled="amount <= 0"
      class="flex size-7 items-center justify-center rounded-md text-success-hover hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      @click="onHeal"
    >
      <Icon name="heal" :size="18" />
    </button>
  </span>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import { CHARACTER_INT_LIMITS } from '@rolling-dice-app/core'

const { t } = useI18n()

defineProps<{
  /** 目標單位顯示名，供 aria-label 組句 */
  name: string
}>()

const emit = defineEmits<{
  damage: [amount: number]
  heal: [amount: number]
}>()

const amount = ref(0)

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
