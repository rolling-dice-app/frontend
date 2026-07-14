<template>
  <Modal
    :model-value="open"
    :title="mode === 'create' ? t('dmSession.createTitle') : t('dmSession.renameTitle')"
    size="md"
    :close-on-click-outside="false"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
    @update:model-value="(value: boolean) => emit('update:open', value)"
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
        <CommonAppButton type="button" variant="ghost" @click="emit('update:open', false)">
          {{ t('ui.action.cancel') }}
        </CommonAppButton>
        <CommonAppButton type="button" variant="primary" :disabled="!canSubmit" @click="onConfirm">
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
  }>(),
  { initialTitle: '' },
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

const onConfirm = (): void => {
  if (!canSubmit.value) return
  // remark 未填傳 undefined，不帶欄位交由 server 補預設
  const remark =
    props.mode === 'create' && remarkDraft.value.trim() !== '' ? remarkDraft.value : undefined
  emit('confirm', draft.value.trim(), remark)
  emit('update:open', false)
}
</script>
