<template>
  <Select
    class="app-select bg-canvas-inset rounded-md"
    color="var(--color-content)"
    :border-color="borderColor"
    :dropdown-bg="dropdownBg"
    :option-hover-color="optionHoverColor"
    :option-selected-color="optionSelectedColor"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { Select } from '@ui'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    borderColor?: string
    dropdownBg?: string
    optionHoverColor?: string
    optionSelectedColor?: string
  }>(),
  {
    borderColor: 'var(--color-primary)',
    dropdownBg: 'var(--color-canvas-elevated)',
    optionHoverColor: 'var(--color-canvas-inset)',
    optionSelectedColor: 'var(--color-canvas-muted)',
  },
)
</script>

<style scoped>
.app-select {
  --rui-color-disabled-bg: var(--color-disabled-border);
}
</style>
