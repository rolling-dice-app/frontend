<template>
  <Button
    v-bind="{ ...variantProps, ...$attrs }"
    :size="size"
    :radius="6"
    :class="[minHeightClass, hasSurfaceHover ? 'hover:bg-surface' : '']"
  >
    <slot />
  </Button>
</template>

<script setup lang="ts">
import { Button } from '@ui'

defineOptions({ inheritAttrs: false })

type Variant = 'primary' | 'secondary' | 'neutral' | 'ghost' | 'danger'
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

// variant 對應 design-language §8：色彩交給 @ui Button 的 bg/text/border。
// 每個 variant 都帶 1px border（同底色＝隱形但佔位），確保所有 variant box model 等寬。
const variantProps = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return {
        outline: true,
        borderColor: 'var(--color-primary)',
        textColor: 'var(--color-primary)',
      }
    case 'neutral':
      return {
        bgColor: 'transparent',
        textColor: 'var(--color-content)',
        borderColor: 'var(--color-border)',
      }
    case 'ghost':
      return {
        bgColor: 'transparent',
        textColor: 'var(--color-content)',
        borderColor: 'transparent',
      }
    case 'danger':
      return {
        bgColor: 'var(--color-danger)',
        textColor: 'var(--color-content-inverse)',
        borderColor: 'var(--color-danger)',
      }
    default:
      return {
        bgColor: 'var(--color-primary)',
        textColor: 'var(--color-content-inverse)',
        borderColor: 'var(--color-primary)',
      }
  }
})

// ghost / neutral 透明底，hover 給淡底回饋
const hasSurfaceHover = computed(() => props.variant === 'ghost' || props.variant === 'neutral')

// @ui Button 的 size 只改 padding/字級，高度由此補：sm 36 / md 44 / lg 52。
const minHeightClass = computed(
  () => ({ sm: 'min-h-9', md: 'min-h-11', lg: 'min-h-13' })[props.size],
)
</script>
