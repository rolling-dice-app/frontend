<template>
  <div class="relative">
    <button
      ref="triggerRef"
      type="button"
      :aria-label="`${t('character.share.menuLabel')} ${character.name}`"
      aria-haspopup="menu"
      :aria-expanded="open"
      class="size-11 flex items-center justify-center rounded-md border border-border text-content-muted cursor-pointer hover:bg-surface hover:text-content transition-colors duration-150"
      @click.prevent.stop="toggle"
      @keydown.down.prevent="openAndFocusFirst"
    >
      <Icon name="external-link" :size="20" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="menuRef"
        role="menu"
        :aria-label="t('character.share.menuLabel')"
        class="fixed z-50 min-w-48 rounded-md border border-border bg-canvas-elevated py-1 shadow-lg"
        :style="menuStyle"
        @keydown.esc.prevent="closeAndRestoreFocus"
        @keydown.down.prevent="focusNext"
        @keydown.up.prevent="focusPrev"
      >
        <button
          v-for="(item, index) in menuItems"
          :key="item.key"
          :ref="(el) => setItemRef(el, index)"
          type="button"
          role="menuitem"
          :data-testid="item.key === 'toggle-share' ? 'character-share-toggle' : undefined"
          tabindex="-1"
          class="block w-full px-3 py-2 text-left text-sm text-content cursor-pointer hover:bg-surface focus-visible:bg-surface focus-visible:outline-none transition-colors duration-150"
          @click="select(item.key)"
          @keydown.enter.prevent="select(item.key)"
          @keydown.space.prevent="select(item.key)"
          @focus="activeIndex = index"
        >
          {{ item.label }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { Icon } from '@ui'
import type { CharacterListItem } from '~/types/business/character-list'

const { t } = useI18n()

const props = defineProps<{
  character: CharacterListItem
}>()

const emit = defineEmits<{
  'copy-link': [CharacterListItem]
  'open-page': [CharacterListItem]
  'toggle-share': [CharacterListItem]
}>()

type MenuKey = 'copy-link' | 'open-page' | 'toggle-share'

const open = ref(false)
const triggerRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const itemRefs = ref<HTMLButtonElement[]>([])
const menuStyle = ref<Record<string, string>>({})
const activeIndex = ref(0)

// v-for 函式 ref：以 index 定位寫入，順序與 menuItems 對齊（string ref 不保證順序）。
const setItemRef = (el: Element | ComponentPublicInstance | null, index: number): void => {
  if (el instanceof HTMLButtonElement) itemRefs.value[index] = el
}

const menuItems = computed<{ key: MenuKey; label: string }[]>(() => [
  {
    key: 'toggle-share',
    label: props.character.shareable
      ? t('character.share.disablePublic')
      : t('character.share.enablePublic'),
  },
  { key: 'copy-link', label: t('character.share.copyLink') },
  { key: 'open-page', label: t('character.share.openPage') },
])

// 以觸發鈕的視窗座標右對齊定位；用 fixed 避開 Card overflow-hidden 裁切。
const positionMenu = (): void => {
  const rect = triggerRef.value?.getBoundingClientRect()
  if (!rect) return
  menuStyle.value = {
    top: `${rect.bottom + 4}px`,
    right: `${window.innerWidth - rect.right}px`,
  }
}

const focusItem = (index: number): void => {
  activeIndex.value = index
  void nextTick(() => itemRefs.value[index]?.focus())
}

const onOutsidePointer = (event: PointerEvent): void => {
  const target = event.target as Node
  if (menuRef.value?.contains(target) || triggerRef.value?.contains(target)) return
  close()
}

const openMenu = (): void => {
  positionMenu()
  open.value = true
  window.addEventListener('pointerdown', onOutsidePointer, true)
  window.addEventListener('scroll', close, true)
  window.addEventListener('resize', close, true)
}

const close = (): void => {
  if (!open.value) return
  open.value = false
  activeIndex.value = 0
  window.removeEventListener('pointerdown', onOutsidePointer, true)
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('resize', close, true)
}

const closeAndRestoreFocus = (): void => {
  close()
  void nextTick(() => triggerRef.value?.focus())
}

const toggle = (): void => {
  if (open.value) close()
  else openMenu()
}

const openAndFocusFirst = (): void => {
  if (!open.value) openMenu()
  focusItem(0)
}

const focusNext = (): void => {
  focusItem((activeIndex.value + 1) % menuItems.value.length)
}

const focusPrev = (): void => {
  focusItem((activeIndex.value - 1 + menuItems.value.length) % menuItems.value.length)
}

const select = (key: MenuKey): void => {
  if (key === 'copy-link') emit('copy-link', props.character)
  else if (key === 'open-page') emit('open-page', props.character)
  else emit('toggle-share', props.character)
  closeAndRestoreFocus()
}

onScopeDispose(close)
</script>
