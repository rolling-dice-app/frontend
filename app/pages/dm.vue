<template>
  <div
    class="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8"
    :class="
      isBattlefieldWorkspace
        ? 'lg:flex lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden'
        : ''
    "
  >
    <!-- DM 工具次導覽：segmented 切換各工具，底層是真路由。 -->
    <nav
      :aria-label="t('dm.toolsTitle')"
      class="scrollbar-hidden mb-4 flex w-fit max-w-full shrink-0 gap-1 overflow-x-auto rounded-lg border border-border-soft bg-canvas-inset p-1"
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

      <NuxtLink
        to="/dm/session"
        class="shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :class="
          isActive('/dm/session')
            ? 'bg-primary text-content-inverse'
            : 'text-content-muted hover:bg-surface hover:text-content'
        "
      >
        {{ t('dm.nav.campaignRecord') }}
      </NuxtLink>

      <NuxtLink
        to="/dm/battlefield"
        class="shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :class="
          isActive('/dm/battlefield')
            ? 'bg-primary text-content-inverse'
            : 'text-content-muted hover:bg-surface hover:text-content'
        "
      >
        {{ t('dm.nav.battlefield') }}
      </NuxtLink>
    </nav>

    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth', noindex: true })

const { t } = useI18n()
const route = useRoute()

// 完全相等或落在該路徑的子段（/dm/monster → /dm/monster/123）。
const isActive = (to: string): boolean => route.path === to || route.path.startsWith(`${to}/`)

// 戰場工作區在 lg 以上改為固定視口高度的 flex 鏈（header h-14 = 3.5rem），
// 讓三欄各自捲動、底部不被裁切；其他 DM 路由維持整頁文流。
const isBattlefieldWorkspace = computed(() => route.name === 'dm-battlefield-id')
</script>
