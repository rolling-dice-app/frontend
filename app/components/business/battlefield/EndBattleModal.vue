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

    <div class="mt-3 flex flex-col gap-1.5">
      <label
        v-for="item in items"
        :key="item.key"
        class="flex cursor-pointer items-center gap-2 text-[13px] text-content"
      >
        <input v-model="draft[item.key]" type="checkbox" class="size-4 shrink-0 accent-primary" />
        {{ t(`battlefield.${item.labelKey}`) }}
      </label>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <CommonAppButton type="button" variant="ghost" @click="emit('update:open', false)">
          {{ t('ui.action.cancel') }}
        </CommonAppButton>
        <CommonAppButton type="button" variant="primary" @click="onConfirm">
          {{ t('battlefield.endBattle') }}
        </CommonAppButton>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Modal } from '@ui'
import type { EndBattleKeepFlags } from '~/types/business/battlefield'

const { t } = useI18n()

const props = defineProps<{
  open: boolean
  battleSequence: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [flags: EndBattleKeepFlags]
}>()

const items = [
  { key: 'keepCurrentHp', labelKey: 'keepCurrentHp' },
  { key: 'keepTempHp', labelKey: 'keepTempHp' },
  { key: 'keepConditions', labelKey: 'keepConditions' },
  { key: 'keepAdjustments', labelKey: 'keepAdjustments' },
] as const

const draft = reactive<EndBattleKeepFlags>({
  keepCurrentHp: true,
  keepTempHp: true,
  keepConditions: true,
  keepAdjustments: true,
})

// 每次開窗回到預設全保留
watch(
  () => props.open,
  (next) => {
    if (!next) return
    draft.keepCurrentHp = true
    draft.keepTempHp = true
    draft.keepConditions = true
    draft.keepAdjustments = true
  },
  { immediate: true },
)

// confirm 由父頁關窗（與 ContainerTitleModal 同一慣例）
const onConfirm = (): void => {
  emit('confirm', { ...draft })
}
</script>
