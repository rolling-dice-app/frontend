<template>
  <Card
    shadow="none"
    :bg-color="bgColor"
    :radius="RADIUS.lg"
    :padding="0"
    :class="extraClass"
    v-bind="$attrs"
  >
    <template v-if="$slots.cover" #cover>
      <slot name="cover" />
    </template>
    <template v-if="$slots.header" #header>
      <div class="p-4 sm:p-6">
        <slot name="header" />
      </div>
    </template>
    <div class="p-4 sm:p-6">
      <slot />
    </div>
    <template v-if="$slots.footer" #footer>
      <div class="p-4 sm:p-6">
        <slot name="footer" />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { Card } from '@ui'
import { RADIUS } from '~/constants/style'

defineOptions({ inheritAttrs: false })

type Variant = 'flat' | 'elevated' | 'inset'

const props = withDefaults(
  defineProps<{
    variant?: Variant
  }>(),
  {
    variant: 'flat',
  },
)

// design-language §8/§9：flat 無陰影 + 軟邊框；elevated 上浮 elev-1（清單卡 tier glow 不在此，§9）；
// inset 凹陷內陰影。陰影一律走 app token class（shadow-none + extraClass），不依賴 @ui 的 --rui-shadow-card-*。
const bgColor = computed(() => {
  switch (props.variant) {
    case 'elevated':
      return 'var(--color-canvas-elevated)'
    case 'inset':
      return 'var(--color-canvas-inset)'
    default:
      // flat：明確接深色 canvas-elevated，否則 @ui Card 會退回自身淺色預設
      return 'var(--color-canvas-elevated)'
  }
})

const extraClass = computed(() => {
  switch (props.variant) {
    case 'inset':
      return 'shadow-inset'
    case 'elevated':
      return 'shadow-elev-1'
    case 'flat':
      return 'border border-border-soft'
    default:
      return ''
  }
})
</script>
