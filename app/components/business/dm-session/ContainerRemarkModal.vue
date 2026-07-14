<template>
  <Modal
    :model-value="open"
    :title="t('dmSession.container.editRemark')"
    size="md"
    :close-on-click-outside="false"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
    @update:model-value="onOpenChange"
  >
    <label for="dm-session-container-remark" class="mb-1 block text-xs text-content-muted">
      {{ t('dmSession.container.field.remark') }}
    </label>
    <div class="rounded-md border border-primary bg-canvas-inset">
      <TextArea
        id="dm-session-container-remark"
        class="w-full"
        :border="false"
        :model-value="draft"
        :rows="6"
        max-height="16rem"
        :maxlength="CHARACTER_TEXT_LIMITS.LONG"
        show-count
        :placeholder="t('dmSession.container.remarkPlaceholder')"
        @update:model-value="(value: string) => (draft = value)"
      />
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
        <CommonAppButton type="button" variant="primary" :loading="submitting" @click="onConfirm">
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
    remark: string
    /** 父頁送出中：確認鈕轉 loading，並擋下所有關窗路徑 */
    submitting?: boolean
  }>(),
  { submitting: false },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [remark: string]
}>()

const draft = ref('')

watch(
  () => props.open,
  (next) => {
    if (!next) return
    draft.value = props.remark
  },
  { immediate: true },
)

/** 關窗單一入口：submitting 期間忽略（含 ESC / header X / 取消鈕） */
const onOpenChange = (value: boolean): void => {
  if (props.submitting) return
  emit('update:open', value)
}

// confirm 不自行關窗：成功後由父頁關閉，失敗保持開啟保留輸入
const onConfirm = (): void => {
  if (props.submitting) return
  emit('confirm', draft.value)
}
</script>
