<template>
  <Badge v-bind="{ ...variantProps, ...$attrs }">
    <slot />
  </Badge>
</template>

<script setup lang="ts">
import { Badge } from '@ui'

defineOptions({ inheritAttrs: false })

type Variant = 'default' | 'tier' | 'status'

const props = withDefaults(
  defineProps<{
    variant?: Variant
  }>(),
  {
    variant: 'default',
  },
)

// design-language §8：default 中性 surface-2 角 4；tier/status 顏色由呼叫端傳（透過 $attrs 覆寫）。
const variantProps = computed(() => {
  switch (props.variant) {
    case 'tier':
      return { radius: 'full' as const }
    case 'status':
      return { radius: 4 }
    default:
      return {
        radius: 4,
        bgColor: 'var(--color-surface-2)',
        textColor: 'var(--color-content-muted)',
      }
  }
})
</script>
