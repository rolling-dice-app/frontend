<template>
  <div class="space-y-2">
    <h2 class="font-display text-lg font-bold text-content">{{ t('inventory.asset') }}</h2>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div v-for="coin in COIN_FIELDS" :key="coin.key">
        <label :for="`currency-${coin.key}`" class="mb-1 block text-xs text-content-muted">
          {{ coin.label }}
        </label>
        <CommonAppInput
          :id="`currency-${coin.key}`"
          type="number"
          min="0"
          step="1"
          size="sm"
          outline
          :model-value="String(currency[coin.key])"
          class="w-full"
          @update:model-value="onUpdate(coin.key, $event)"
        />
      </div>
    </div>
    <p class="text-xs text-content-muted">
      {{ t('inventory.coinWeight') }}：{{ coinWeight }} {{ t('inventory.unitWeight') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { CharacterCurrencyDTO, CurrencyKey } from '@rolling-dice-app/core'
import { calculateCurrencyWeight } from '~/helpers/inventory'

const { t } = useI18n()

const COIN_FIELDS = computed<{ key: CurrencyKey; label: string }[]>(() => [
  { key: 'pp', label: t('inventory.pp') },
  { key: 'gp', label: t('inventory.gp') },
  { key: 'sp', label: t('inventory.sp') },
  { key: 'cp', label: t('inventory.cp') },
])

const props = defineProps<{
  currency: CharacterCurrencyDTO
}>()

const emit = defineEmits<{
  'update:currency': [value: CharacterCurrencyDTO]
}>()

const coinWeight = computed(() => {
  const raw = calculateCurrencyWeight(props.currency)
  return raw % 1 === 0 ? raw.toString() : raw.toFixed(2)
})

const onUpdate = (key: CurrencyKey, value: string): void => {
  const num = Math.max(0, Math.floor(Number(value) || 0))
  emit('update:currency', { ...props.currency, [key]: num })
}
</script>
