<template>
  <Modal
    :model-value="open"
    :title="t('inventory.editCurrency')"
    size="md"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
    @update:model-value="(value: boolean) => emit('update:open', value)"
  >
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div v-for="coin in COIN_FIELDS" :key="coin.key">
        <label :for="`currency-edit-${coin.key}`" class="mb-1 block text-xs text-content-muted">
          {{ coin.label }}
        </label>
        <CommonAppInput
          :id="`currency-edit-${coin.key}`"
          type="number"
          min="0"
          step="1"
          size="sm"
          outline
          :model-value="String(draft[coin.key])"
          class="w-full"
          @update:model-value="(value: string) => onUpdate(coin.key, value)"
        />
      </div>
    </div>

    <template #footer>
      <CommonAppButton variant="primary" data-testid="currency-edit-confirm" @click="onConfirm">
        {{ t('ui.action.confirm') }}
      </CommonAppButton>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Modal } from '@ui'
import { CHARACTER_INT_LIMITS, CURRENCY_KEYS } from '@rolling-dice-app/core'
import type { CharacterCurrencyDTO, CurrencyKey } from '@rolling-dice-app/core'

const { t } = useI18n()

const props = defineProps<{
  open: boolean
  currency: CharacterCurrencyDTO
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [value: CharacterCurrencyDTO]
}>()

const COIN_FIELDS = useCoinFields()

const draft = reactive<Record<CurrencyKey, number>>({ cp: 0, sp: 0, gp: 0, pp: 0 })
const initialSnapshot = reactive<Record<CurrencyKey, number>>({ cp: 0, sp: 0, gp: 0, pp: 0 })
// open 當下的 currency 快照（含樂觀鎖 updatedAt）。confirm 以此快照送出，
// 避免 modal 開啟期間 props.currency 被旁路刷新而以新 updatedAt 蓋過衝突偵測。
let openedCurrency: CharacterCurrencyDTO | null = null

watch(
  () => props.open,
  (next) => {
    if (!next) return
    openedCurrency = { ...props.currency }
    for (const key of CURRENCY_KEYS) {
      initialSnapshot[key] = props.currency[key]
      draft[key] = props.currency[key]
    }
  },
  { immediate: true },
)

const onUpdate = (key: CurrencyKey, value: string): void => {
  draft[key] = Math.max(0, parseIntegerInput(value, 0, CHARACTER_INT_LIMITS.LARGE_INT_MAX))
}

const isDirty = (): boolean => CURRENCY_KEYS.some((k) => draft[k] !== initialSnapshot[k])

const onConfirm = (): void => {
  if (isDirty() && openedCurrency) {
    const amounts = Object.fromEntries(CURRENCY_KEYS.map((k) => [k, draft[k]])) as Record<
      CurrencyKey,
      number
    >
    emit('confirm', { ...openedCurrency, ...amounts })
  }
  emit('update:open', false)
}
</script>
