<template>
  <div style="display: contents">
    <Modal
      :model-value="modelValue"
      :title="editing ? t('character.editCampaignRecord') : t('character.addCampaignRecord')"
      size="md"
      bg-color="var(--color-canvas-elevated)"
      text-color="var(--color-content)"
      border-color="var(--color-border)"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <div class="space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div class="flex-1">
            <label for="campaign-title" class="mb-1 block text-xs text-content">
              {{ t('character.campaignField.name') }}
              <span class="text-danger">*</span>
            </label>
            <CommonAppInput
              id="campaign-title"
              :radius="0"
              :model-value="draft.title"
              size="sm"
              outline
              class="w-full"
              @update:model-value="draft.title = $event"
            />
          </div>
          <div>
            <label for="campaign-date" class="mb-1 block text-xs text-content">
              {{ t('character.campaignField.date') }}
            </label>
            <input
              id="campaign-date"
              v-model="draft.date"
              type="date"
              style="color-scheme: dark"
              class="h-8 rounded-md border border-primary bg-canvas-inset px-2 text-sm text-content transition-colors focus:outline-none focus-within:ring-1 focus-within:ring-primary"
            />
          </div>
        </div>

        <div>
          <label for="campaign-content" class="mb-1 block text-xs text-content">
            {{ t('character.campaignField.content') }}
            <span class="text-danger">*</span>
          </label>
          <div class="rounded-md border border-primary bg-canvas-inset">
            <TextArea
              id="campaign-content"
              class="w-full"
              :border="false"
              :model-value="draft.content"
              :rows="4"
              :maxlength="VALIDATION_LIMITS.maxCampaignRecordContentLength"
              show-count
              :placeholder="t('character.campaignField.contentPlaceholder')"
              @update:model-value="draft.content = $event"
            />
          </div>
        </div>

        <div>
          <p class="mb-1 text-xs text-content">{{ t('character.campaignField.moneyEarning') }}</p>
          <div class="grid grid-cols-4 gap-2">
            <div v-for="key in COIN_KEYS" :key="key">
              <label :for="`campaign-money-${key}`" class="mb-1 block text-xs text-content-muted">
                {{ currencyLabels[key] }}
              </label>
              <CommonAppInput
                :id="`campaign-money-${key}`"
                type="number"
                min="0"
                step="1"
                size="sm"
                outline
                :model-value="String(draft.moneyEarning[key])"
                class="w-full"
                @update:model-value="draft.moneyEarning[key] = sanitizeNumber($event)"
              />
            </div>
          </div>
        </div>

        <div class="w-32">
          <label for="campaign-exp" class="mb-1 block text-xs text-content">
            {{ t('character.campaignField.expEarning') }}
          </label>
          <CommonAppInput
            id="campaign-exp"
            type="number"
            min="0"
            step="1"
            size="sm"
            outline
            :model-value="String(draft.expEarning)"
            class="w-full"
            @update:model-value="draft.expEarning = sanitizeNumber($event)"
          />
        </div>
      </div>

      <template #footer>
        <Button
          :radius="4"
          :disabled="!draft.title.trim() || !draft.content.trim() || submitting"
          bg-color="var(--color-primary)"
          @click="onSave"
        >
          {{ t('ui.action.confirm') }}
        </Button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { Button, Modal, TextArea } from '@ui'
import { CHARACTER_INT_LIMITS, DEFAULT_CURRENCY, VALIDATION_LIMITS } from '@rolling-dice-app/core'
import type { CurrencyKey } from '@rolling-dice-app/core'
import type { CampaignDraft, CampaignEntry } from '~/types/business/campaign'

const { t } = useI18n()

const COIN_KEYS: readonly CurrencyKey[] = ['pp', 'gp', 'sp', 'cp']

const props = defineProps<{
  modelValue: boolean
  editing: CampaignEntry | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [draft: CampaignDraft, editingId: string | null]
}>()

const currencyLabels = computed<Record<CurrencyKey, string>>(() => ({
  cp: t('inventory.cpName'),
  sp: t('inventory.spName'),
  gp: t('inventory.gpName'),
  pp: t('inventory.ppName'),
}))

const todayISO = (): string => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const emptyDraft = (): CampaignDraft => {
  return {
    title: '',
    date: todayISO(),
    content: '',
    moneyEarning: { ...DEFAULT_CURRENCY },
    expEarning: 0,
  }
}

const sanitizeNumber = (value: string): number => {
  return Math.max(0, parseIntegerInput(value, 0, CHARACTER_INT_LIMITS.LARGE_INT_MAX))
}

const draft = ref<CampaignDraft>(emptyDraft())

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      draft.value = props.editing
        ? {
            title: props.editing.title,
            date: props.editing.date,
            content: props.editing.content,
            moneyEarning: { ...props.editing.moneyEarning },
            expEarning: props.editing.expEarning,
          }
        : emptyDraft()
    }
  },
)

const onSave = (): void => {
  const payload: CampaignDraft = {
    ...draft.value,
    title: draft.value.title.trim(),
    moneyEarning: { ...draft.value.moneyEarning },
  }
  emit('save', payload, props.editing?.id ?? null)
}
</script>
