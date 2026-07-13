<template>
  <Input
    class="bg-canvas-inset rounded-md"
    :model-value="modelValue"
    :border-color="borderColor"
    v-bind="$attrs"
    @update:model-value="onInput"
    @focus="onFocus"
  >
    <template v-if="$slots.suffix" #suffix><slot name="suffix" /></template>
  </Input>
</template>

<script setup lang="ts">
import { Input } from '@ui'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string
    borderColor?: string
    /**
     * 僅去除「前導」空白（`/^\s+/`），不裁切尾端 —— 讓使用者仍能在字詞間、暫時的尾端打空白。
     * 命名沿用 `trim` 以相容既有 caller；語意非完整 `String.prototype.trim`。
     */
    trim?: boolean
    selectOnFocus?: boolean
  }>(),
  {
    modelValue: '',
    borderColor: 'var(--color-primary)',
    trim: true,
    selectOnFocus: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: [event: FocusEvent]
}>()

const onFocus = (event: FocusEvent) => {
  if (props.selectOnFocus) {
    const target = event.target as HTMLInputElement
    requestAnimationFrame(() => target.select())
  }
  emit('focus', event)
}

const onInput = (value: string) =>
  emit('update:modelValue', props.trim ? value.replace(/^\s+/, '') : value)
</script>

<style scoped>
/* @ui Input 對 disabled / readonly 套 bg-(--rui-color-disabled-bg) + 對 disabled 額外
   opacity-60，會把內容糊掉。覆寫成透明背景 + 不降透明度；disabled 改以文字色暗示。 */
:deep(.bg-\(--rui-color-disabled-bg\)) {
  background-color: transparent;
  opacity: 1;
}
:deep(input:disabled) {
  color: var(--color-content-muted);
}
</style>
