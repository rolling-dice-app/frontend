<template>
  <Modal
    :model-value="modelValue"
    :title="editing ? '編輯冒險紀錄' : '新增冒險紀錄'"
    size="md"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="flex-1">
          <label for="adventure-name" class="mb-1 block text-xs text-content">名稱</label>
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
          <label for="adventure-date" class="mb-1 block text-xs text-content">日期</label>
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
        <label for="adventure-content" class="mb-1 block text-xs text-content">內容（選填）</label>
        <div class="rounded-md border border-primary bg-canvas-inset">
          <TextArea
            id="adventure-content"
            class="w-full"
            :border="false"
            :model-value="draft.content"
            :rows="4"
            :maxlength="2000"
            show-count
            placeholder="記錄這場團務的事件、戰利品、重要決策…"
            @update:model-value="draft.content = $event"
          />
        </div>
      </div>

      <div>
        <p class="mb-1 text-xs text-content">獲得金錢</p>
        <div class="grid grid-cols-4 gap-2">
          <div v-for="key in CURRENCY_KEYS" :key="key">
            <label :for="`adventure-money-${key}`" class="mb-1 block text-xs text-content-muted">
              {{ CURRENCY_LABELS[key] }}
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
        <label for="adventure-exp" class="mb-1 block text-xs text-content">獲得經驗值</label>
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
        確認
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Button, Modal, TextArea } from '@ui'
import { DEFAULT_CURRENCY } from '~/constants/inventory'
import type { AdventureEntry, AdventureEntryDraft } from '~/types/business/adventure'
import type { CharacterCurrency } from '@rolling-dice-app/types'

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
const CURRENCY_LABELS: Record<keyof CharacterCurrency, string> = {
  cp: '銅幣',
  sp: '銀幣',
  gp: '金幣',
  pp: '鉑金',
}

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
