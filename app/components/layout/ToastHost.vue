<template>
  <Toast
    v-for="item in items"
    :key="item.id"
    :model-value="true"
    :x="item.x"
    :y="item.y"
    :duration="item.duration"
    :bg-color="bgColor(item)"
    text-color="white"
    @update:model-value="(open: boolean) => !open && remove(item.id)"
  >
    <div class="flex items-center gap-2">
      <Icon v-if="item.icon" :name="item.icon" :size="20" :color="accentColor(item.variant)" />
      <span>{{ item.message }}</span>
      <button
        v-if="item.action"
        type="button"
        data-testid="toast-action"
        class="ml-1 shrink-0 rounded-md border border-white/40 px-2 py-0.5 text-xs font-bold hover:bg-white/15"
        @click="onAction(item)"
      >
        {{ item.action.label }}
      </button>
    </div>
  </Toast>
</template>

<script setup lang="ts">
import { Icon, Toast } from '@ui'
import type { ToastItem, ToastVariant } from '~/composables/ui/useToast'

const { items, remove } = useToast()

/** 操作即關閉該則通知：動作本身的結果會另外以新的通知回報 */
const onAction = (item: ToastItem): void => {
  item.action?.onClick()
  remove(item.id)
}

const bgColor = (item: ToastItem): string => {
  if (item.kind === 'system') return 'var(--color-toast-system-bg)'
  if (item.variant === 'error') return 'var(--color-danger)'
  if (item.variant === 'success') return 'var(--color-success)'
  return 'var(--color-primary)'
}

const accentColor = (variant: ToastVariant): string => {
  if (variant === 'error') return 'var(--color-toast-system-accent-error)'
  if (variant === 'success') return 'var(--color-toast-system-accent-success)'
  return 'var(--color-toast-system-accent-info)'
}
</script>
