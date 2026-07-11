<template>
  <Modal
    :model-value="open"
    :title="t('dmSession.container.editRemark')"
    size="md"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
    @update:model-value="(value: boolean) => emit('update:open', value)"
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
        <CommonAppButton type="button" variant="ghost" @click="emit('update:open', false)">
          {{ t('ui.action.cancel') }}
        </CommonAppButton>
        <CommonAppButton type="button" variant="primary" @click="onConfirm">
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

const props = defineProps<{
  open: boolean
  remark: string
}>()

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

const onConfirm = (): void => {
  emit('confirm', draft.value)
  emit('update:open', false)
}
</script>
