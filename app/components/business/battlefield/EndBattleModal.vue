<template>
  <Modal
    :model-value="open"
    :title="t('battlefield.endBattleTitle', { seq: battleSequence })"
    size="md"
    :close-on-click-outside="false"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
    @update:model-value="(value: boolean) => emit('update:open', value)"
  >
    <p class="text-[13px] text-content-muted">{{ t('battlefield.endBattleBody') }}</p>

    <template #footer>
      <div class="flex justify-end gap-2">
        <CommonAppButton type="button" variant="ghost" @click="emit('update:open', false)">
          {{ t('ui.action.cancel') }}
        </CommonAppButton>
        <CommonAppButton
          type="button"
          variant="primary"
          data-testid="battlefield-end-battle-confirm"
          @click="emit('confirm')"
        >
          {{ t('battlefield.endBattle') }}
        </CommonAppButton>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Modal } from '@ui'

const { t } = useI18n()

defineProps<{
  open: boolean
  battleSequence: number
}>()

// 單純確認：保留與否由 D-2 的規則（依 kind）決定，勾選已失去作用對象。
// confirm 由父頁關窗（與 ContainerTitleModal 同一慣例）
const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()
</script>
