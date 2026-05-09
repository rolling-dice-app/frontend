<template>
  <Modal
    :model-value="modelValue"
    :title="editing ? t('character.editAdventureRecord') : t('character.addAdventureRecord')"
    size="md"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="flex-1">
          <label for="adventure-name" class="mb-1 block text-xs text-content">
            {{ t('character.adventureField.name') }}
          </label>
          <CommonAppInput
            id="adventure-name"
            :radius="0"
            :model-value="draft.name"
            size="sm"
            outline
            class="w-full"
            @update:model-value="draft.name = $event"
          />
        </div>
        <div>
          <label for="adventure-date" class="mb-1 block text-xs text-content">
            {{ t('character.adventureField.date') }}
          </label>
          <input
            id="adventure-date"
            v-model="draft.date"
            type="date"
            style="color-scheme: dark"
            class="h-8 rounded-md border border-primary bg-canvas-inset px-2 text-sm text-content transition-colors focus:outline-none focus-within:ring-1 focus-within:ring-primary"
          />
        </div>
      </div>

      <div>
        <label for="adventure-content" class="mb-1 block text-xs text-content">
          {{ t('character.adventureField.contentOptional') }}
        </label>
        <div class="rounded-md border border-primary bg-canvas-inset">
          <TextArea
            id="adventure-content"
            class="w-full"
            :border="false"
            :model-value="draft.content"
            :rows="4"
            :maxlength="2000"
            show-count
            :placeholder="t('character.adventureField.contentPlaceholder')"
            @update:model-value="draft.content = $event"
          />
        </div>
      </div>

      <div>
        <p class="mb-1 text-xs text-content">{{ t('character.adventureField.moneyEarning') }}</p>
        <div class="grid grid-cols-4 gap-2">
          <div v-for="key in CURRENCY_KEYS" :key="key">
            <label :for="`adventure-money-${key}`" class="mb-1 block text-xs text-content-muted">
              {{ currencyLabels[key] }}
            </label>
            <CommonAppInput
              :id="`adventure-money-${key}`"
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
        <label for="adventure-exp" class="mb-1 block text-xs text-content">
          {{ t('character.adventureField.expEarning') }}
        </label>
        <CommonAppInput
          id="adventure-exp"
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
        :disabled="!draft.name.trim()"
        bg-color="var(--color-primary)"
        @click="onSave"
      >
        {{ t('ui.action.confirm') }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Button, Modal, TextArea } from '@ui'
import { DEFAULT_CURRENCY, type CharacterCurrency } from '@rolling-dice-app/core'
import type { AdventureEntry, AdventureEntryDraft } from '~/types/business/adventure'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  editing: AdventureEntry | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [draft: AdventureEntryDraft, editingId: string | null]
}>()

const CURRENCY_KEYS = [
  'cp',
  'sp',
  'gp',
  'pp',
] as const satisfies readonly (keyof CharacterCurrency)[]

const currencyLabels = computed<Record<keyof CharacterCurrency, string>>(() => ({
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

const emptyDraft = (): AdventureEntryDraft => {
  return {
    name: '',
    date: todayISO(),
    content: '',
    moneyEarning: { ...DEFAULT_CURRENCY },
    expEarning: 0,
  }
}

const sanitizeNumber = (value: string): number => {
  const parsed = Math.floor(Number(value) || 0)
  return Math.max(0, parsed)
}

const draft = ref<AdventureEntryDraft>(emptyDraft())

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      draft.value = props.editing
        ? {
            name: props.editing.name,
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
  const payload: AdventureEntryDraft = {
    ...draft.value,
    name: draft.value.name.trim(),
    moneyEarning: { ...draft.value.moneyEarning },
  }
  emit('save', payload, props.editing?.id ?? null)
  emit('update:modelValue', false)
}
</script>
