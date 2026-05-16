<template>
  <div class="my-6 flex items-center justify-between gap-2 sm:gap-4">
    <div class="flex min-w-0 items-center gap-2">
      <button
        v-if="showBack"
        class="flex size-11 shrink-0 items-center justify-center rounded text-content-soft transition-colors hover:text-content cursor-pointer"
        :aria-label="t('ui.aria.backToParent')"
        @click="handleBack"
      >
        <Icon name="chevron-left" :size="20" />
      </button>
      <h2 class="truncate font-display text-lg font-bold text-primary sm:text-xl">
        {{ title }}
      </h2>
    </div>
    <slot name="actions" />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@ui'

interface PageHeaderProps {
  title: string
  showBack?: boolean
  backTo?: string
}

const props = withDefaults(defineProps<PageHeaderProps>(), {
  showBack: false,
  backTo: undefined,
})

const { t } = useI18n()
const route = useRoute()

const handleBack = () => {
  if (props.backTo) {
    navigateTo(props.backTo)
    return
  }
  const parentPath = route.path.replace(/\/[^/]+$/, '') || '/'
  navigateTo(parentPath)
}
</script>
