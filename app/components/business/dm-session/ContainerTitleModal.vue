<template>
  <Modal
    :model-value="open"
    :title="mode === 'create' ? t('dmSession.createTitle') : t('dmSession.renameTitle')"
    size="md"
    :close-on-click-outside="false"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
    @update:model-value="onOpenChange"
  >
    <label for="dm-session-container-title" class="mb-1 block text-xs text-content-muted">
      {{ t('dmSession.container.field.title') }}
    </label>
    <CommonAppInput
      id="dm-session-container-title"
      :model-value="draft"
      :maxlength="CHARACTER_TEXT_LIMITS.SHORT"
      :placeholder="t('dmSession.container.titlePlaceholder')"
      class="w-full"
      @update:model-value="(value: string) => (draft = value)"
    />

    <div v-if="mode === 'create'" class="mt-4">
      <label for="dm-session-container-create-remark" class="mb-1 block text-xs text-content-muted">
        {{ t('dmSession.container.field.remark') }}
      </label>
      <div class="rounded-md border border-primary bg-canvas-inset">
        <TextArea
          id="dm-session-container-create-remark"
          class="w-full"
          :border="false"
          :model-value="remarkDraft"
          :rows="4"
          max-height="12rem"
          :maxlength="CHARACTER_TEXT_LIMITS.LONG"
          show-count
          :placeholder="t('dmSession.container.remarkPlaceholder')"
          @update:model-value="(value: string) => (remarkDraft = value)"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <CommonAppButton
          type="button"
          variant="ghost"
          :disabled="submitting"
          @click="onOpenChange(false)"
        >
          {{ t('ui.action.cancel') }}
        </CommonAppButton>
        <CommonAppButton
          type="button"
          variant="primary"
          :disabled="!canSubmit"
          :loading="submitting"
          @click="onConfirm"
        >
          {{ t('ui.action.confirm') }}
        </CommonAppButton>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Modal, TextArea } from '@ui'
import { CHARACTER_TEXT_LIMITS } from '@rolling-dice-app/core'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'rename'
    /** rename 模式的現有名稱；open 當下快照進 draft */
    initialTitle?: string
    /** 父頁送出中：確認鈕轉 loading，並擋下所有關窗路徑 */
    submitting?: boolean
  }>(),
  { initialTitle: '', submitting: false },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [title: string, remark?: string]
}>()

const draft = ref('')
const remarkDraft = ref('')

watch(
  () => props.open,
  (next) => {
    if (!next) return
    draft.value = props.initialTitle
    remarkDraft.value = ''
  },
  { immediate: true },
)

const canSubmit = computed(() => draft.value.trim().length > 0)

/** 關窗單一入口：submitting 期間忽略（含 ESC / header X / 取消鈕） */
const onOpenChange = (value: boolean): void => {
  if (props.submitting) return
  emit('update:open', value)
}

// confirm 不自行關窗：成功後由父頁關閉，失敗保持開啟保留輸入
const onConfirm = (): void => {
  if (!canSubmit.value || props.submitting) return
  // remark 未填傳 undefined，不帶欄位交由 server 補預設
  const remark =
    props.mode === 'create' && remarkDraft.value.trim() !== '' ? remarkDraft.value : undefined
  emit('confirm', draft.value.trim(), remark)
}
</script>
