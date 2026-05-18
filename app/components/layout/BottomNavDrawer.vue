<template>
  <!-- Swipe-up hint above footer -->
  <div
    v-show="!isLocked"
    ref="hintRef"
    role="button"
    tabindex="0"
    :aria-expanded="isNavOpen"
    aria-haspopup="dialog"
    class="relative flex w-full cursor-pointer select-none items-center justify-center gap-2 border-t border-surface bg-panel-2 px-4 py-2 text-content-muted transition-colors hover:bg-panel hover:text-content focus-visible:outline-2 focus-visible:outline-ring"
    @click="toggleNav"
    @keydown.enter.prevent="toggleNav"
    @keydown.space.prevent="toggleNav"
  >
    <Icon name="swipe-up" class="w-12 absolute animate-bounce motion-reduce:animate-none -top-4" />
    <span class="text-xs font-medium tracking-wide sm:text-sm">{{ t('ui.nav.swipeUp') }}</span>
  </div>

  <!-- Scoped teleport target：讓 drawer 繼承此元素的 CSS custom property -->
  <div ref="drawerPortal" class="nav-drawer-portal" />

  <!-- Bottom Drawer -->
  <Drawer
    v-model="isNavOpen"
    placement="bottom"
    size="sm"
    :show-close-button="false"
    :teleport-to="drawerPortal ?? 'body'"
    bg-color="var(--color-panel)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
  >
    <template #header>
      <div class="bg-panel-2 w-full py-1 text-center text-primary font-display">
        Embark On Your Adventure
      </div>
    </template>
    <nav :aria-label="t('ui.aria.nav')" class="grid grid-cols-3 py-2">
      <template v-for="item in navItems" :key="item.to">
        <div class="flex justify-center">
          <div
            v-if="item.disabled"
            :aria-disabled="true"
            class="inline-flex w-24 flex-col items-center gap-1 rounded-lg px-2 py-2 text-content-faint cursor-not-allowed"
          >
            <Icon v-if="item.icon" :name="item.icon" :size="48" />
            <span class="text-sm font-medium tracking-wide">{{ t(item.labelKey) }}</span>
            <span
              class="rounded px-1.5 py-0.5 text-[10px] tracking-wide text-content-muted bg-canvas-inset"
            >
              {{ t('ui.nav.workInProgress') }}
            </span>
          </div>
          <NuxtLink
            v-else
            :to="item.to"
            class="inline-flex w-24 flex-col items-center gap-1 rounded-lg px-2 py-2 focus:outline-primary transition-colors duration-150"
            :class="isActive(item.to) ? 'text-primary' : 'text-content-muted hover:text-content'"
            @click="closeNav"
          >
            <Icon v-if="item.icon" :name="item.icon" :size="48" />
            <span class="text-sm font-medium tracking-wide">{{ t(item.labelKey) }}</span>
          </NuxtLink>
        </div>
      </template>
    </nav>
  </Drawer>
</template>

<script setup lang="ts">
import { Drawer, Icon } from '@ui'
import { navItems } from '~/constants/navigation'

const DRAWER_DISABLED_ROUTE_NAMES = [
  'character-build',
  'character-id-update',
  'character-id',
] as const

const { t } = useI18n()
const navStore = useNavigationStore()
const { isNavOpen } = storeToRefs(navStore)
const { toggleNav, closeNav } = navStore

const hintRef = useTemplateRef<HTMLElement>('hintRef')
const drawerPortal = useTemplateRef<HTMLElement>('drawerPortal')
useSwipeUpTrigger(hintRef, {
  disabledRouteNames: DRAWER_DISABLED_ROUTE_NAMES,
})

const route = useRoute()
const isLocked = computed(() =>
  DRAWER_DISABLED_ROUTE_NAMES.includes(
    String(route.name) as (typeof DRAWER_DISABLED_ROUTE_NAMES)[number],
  ),
)

const isActive = (to: string): boolean => {
  return route.path.startsWith(to)
}
</script>

<style scoped>
.nav-drawer-portal {
  --rui-drawer-header-padding: 0;
}
</style>
