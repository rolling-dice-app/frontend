<template>
  <Button
    v-bind="{ ...variantProps, ...$attrs }"
    :size="size"
    :radius="6"
    :class="[minHeightClass, variant === 'ghost' ? 'hover:bg-surface' : '']"
  >
    <slot />
  </Button>
</template>

<script setup lang="ts">
import { Button } from '@ui'

defineOptions({ inheritAttrs: false })

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
  }>(),
  {
    variant: 'primary',
    size: 'md',
  },
)

// variant 對應 design-language §8：色彩交給 @ui Button 的 bg/text/border/outline。
const variantProps = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return {
        outline: true,
        borderColor: 'var(--color-primary)',
        textColor: 'var(--color-primary)',
      }
    case 'ghost':
      return {
        bgColor: 'transparent',
        textColor: 'var(--color-content)',
      }
    case 'danger':
      return {
        bgColor: 'var(--color-danger)',
        textColor: 'var(--color-content-inverse)',
      }
    default:
      return {
        bgColor: 'var(--color-primary)',
        textColor: 'var(--color-content-inverse)',
      }
  }
})

// @ui Button 的 size 只改 padding/字級，高度由此補：sm 36 / md 44 / lg 52。
const minHeightClass = computed(
  () => ({ sm: 'min-h-9', md: 'min-h-11', lg: 'min-h-13' })[props.size],
)
</script>
