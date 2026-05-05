<template>
  <div class="space-y-2">
    <h2 class="font-display text-lg font-bold text-content">資產</h2>
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
    <p class="text-xs text-content-muted">硬幣重量：{{ coinWeight }} 磅</p>
  </div>
</template>

<script setup lang="ts">
import type { CharacterCurrency } from '@rolling-dice-app/types'
import { calculateCurrencyWeight } from '~/helpers/inventory'

type CoinKey = keyof CharacterCurrency

const COIN_FIELDS: { key: CoinKey; label: string }[] = [
  { key: 'pp', label: '鉑金幣 (pp)' },
  { key: 'gp', label: '金幣 (gp)' },
  { key: 'sp', label: '銀幣 (sp)' },
  { key: 'cp', label: '銅幣 (cp)' },
]

const props = defineProps<{
  currency: CharacterCurrency
}>()

const emit = defineEmits<{
  'update:currency': [value: CharacterCurrency]
}>()

const coinWeight = computed(() => {
  const raw = calculateCurrencyWeight(props.currency)
  return raw % 1 === 0 ? raw.toString() : raw.toFixed(2)
})

const onUpdate = (key: CoinKey, value: string): void => {
  const num = Math.max(0, Math.floor(Number(value) || 0))
  emit('update:currency', { ...props.currency, [key]: num })
}
</script>
