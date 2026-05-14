<template>
  <div class="flex h-full flex-col space-y-2">
    <div class="flex items-center justify-between">
      <h2 class="font-display text-lg font-bold text-content">{{ t('inventory.asset') }}</h2>
      <button
        type="button"
        :aria-label="t('inventory.editCurrency')"
        class="flex size-7 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-raised hover:text-content"
        @click="modalOpen = true"
      >
        <Icon name="edit" :size="14" />
      </button>
    </div>
    <div class="grid flex-1 grid-cols-2 gap-3">
      <div
        v-for="coin in COIN_FIELDS"
        :key="coin.key"
        class="flex flex-col justify-center rounded-md border border-primary bg-canvas-inset px-2 py-1"
      >
        <div class="text-xs text-content-muted">{{ coin.label }}</div>
        <div class="text-content">{{ currency[coin.key] }}</div>
      </div>
    </div>
    <p class="text-xs text-content-muted">
      {{ t('inventory.coinWeight') }}：{{ coinWeight }} {{ t('inventory.unitWeight') }}
    </p>

    <BusinessCharacterFormInventoryCurrencyEditModal
      v-model:open="modalOpen"
      :currency="currency"
      @confirm="(value) => emit('update:currency', value)"
    />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
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

const modalOpen = ref(false)
</script>
