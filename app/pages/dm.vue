<template>
  <div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
    <!-- DM 工具次導覽：segmented 切換各工具，底層是真路由。 -->
    <nav
      :aria-label="t('dm.toolsTitle')"
      class="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-border-soft bg-canvas-inset p-1"
    >
      <NuxtLink
        to="/dm/monster"
        class="shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :class="
          isActive('/dm/monster')
            ? 'bg-primary text-content-inverse'
            : 'text-content-muted hover:bg-surface hover:text-content'
        "
      >
        {{ t('dm.nav.monster') }}
      </NuxtLink>

      <span
        v-for="seg in disabledSegments"
        :key="seg.labelKey"
        :aria-disabled="true"
        class="flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-content-faint"
      >
        {{ t(seg.labelKey) }}
        <span
          class="rounded bg-canvas-inset px-1.5 py-0.5 text-[10px] tracking-wide text-content-muted"
        >
          {{ t('ui.nav.workInProgress') }}
        </span>
      </span>
    </nav>

    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import type { MessagePath } from '~/i18n'

definePageMeta({ middleware: 'auth', noindex: true })

const { t } = useI18n()
const route = useRoute()

const disabledSegments: { labelKey: MessagePath }[] = [
  { labelKey: 'dm.nav.campaignRecord' },
  { labelKey: 'dm.nav.battlefield' },
]

// 完全相等或落在該路徑的子段（/dm/monster → /dm/monster/123）。
const isActive = (to: string): boolean => route.path === to || route.path.startsWith(`${to}/`)
</script>
