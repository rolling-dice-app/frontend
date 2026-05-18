<template>
  <div class="my-6 flex flex-col xs:flex-row items-center justify-between gap-2 sm:gap-4">
    <div class="flex w-full min-w-0 items-center xs:w-auto">
      <button
        v-if="showBack"
        class="flex size-11 shrink-0 items-center justify-center rounded text-content-soft transition-colors hover:text-content cursor-pointer"
        :aria-label="t('ui.aria.backToParent')"
        @click="handleBack"
      >
        <Icon name="chevron-left" :size="20" />
      </button>
      <h2 class="truncate font-display text-xl font-bold text-primary">
        {{ title }}
      </h2>
    </div>
    <div class="flex w-full shrink-0 xs:w-auto xs:flex-1">
      <slot name="actions" />
    </div>
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
