<template>
  <div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
    <!-- Page header -->
    <CommonPageHeader :title="t('character.characterListTitle')" show-back>
      <template v-if="status === 'success' && characters.length > 0" #actions>
        <div class="flex justify-end gap-2 w-full">
          <!-- 排序模式 -->
          <Select
            v-model="sortKey"
            :options="SORT_OPTIONS"
            :border="true"
            border-color="var(--color-border)"
            color="var(--color-content)"
            dropdown-bg="var(--color-canvas-elevated)"
            option-hover-color="var(--color-canvas-inset)"
            class="sort-select w-21 xs:w-28"
            :aria-label="t('character.sortBy')"
          />
          <!-- 顯示模式 -->
          <button
            type="button"
            :aria-pressed="isListMode"
            :aria-label="t('character.toggleViewMode')"
            class="relative flex h-11 cursor-pointer items-center overflow-hidden rounded-lg border border-border"
            @click="isListMode = !isListMode"
            @keydown.enter.prevent="isListMode = !isListMode"
            @keydown.space.prevent="isListMode = !isListMode"
          >
            <div
              class="absolute top-0 left-0 h-full w-11 rounded-md bg-primary transition-transform duration-200"
              :class="isListMode ? 'translate-x-11' : 'translate-x-0'"
              aria-hidden="true"
            />
            <span
              class="relative z-10 flex h-full w-11 items-center justify-center transition-colors duration-150"
              :class="!isListMode ? 'text-content-inverse' : 'text-content-muted'"
              aria-hidden="true"
            >
              <Icon name="grid" :size="24" />
            </span>
            <span
              class="relative z-10 flex h-full w-11 items-center justify-center transition-colors duration-150"
              :class="isListMode ? 'text-content-inverse' : 'text-content-muted'"
              aria-hidden="true"
            >
              <Icon name="list" :size="24" />
            </span>
          </button>
          <!-- 刪除模式 -->
          <button
            type="button"
            :aria-pressed="isDeleteMode"
            :aria-label="
              isDeleteMode ? t('ui.action.leaveDeleteMode') : t('ui.action.enterDeleteMode')
            "
            class="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-border transition-colors duration-150"
            :class="
              isDeleteMode
                ? 'bg-danger text-content-inverse'
                : 'text-content-muted hover:bg-surface'
            "
            @click="isDeleteMode = !isDeleteMode"
          >
            <Icon name="trash" :size="20" />
          </button>
        </div>
      </template>
    </CommonPageHeader>

    <!-- Loading skeleton：SSR idle + client pending 都顯示。
         佈局依 isListMode 跟隨偏好，但 auth 為 client-only（auth-init.client 於 boot 即 await
         refresh，首次 client render user 可能已載入）→ server 與 client 首幀的 isListMode 不一致。
         故用 ClientOnly：server / 掛載前一律 grid skeleton（與 edge cache 共用 HTML 一致），
         client 掛載後再切換成偏好佈局，由 ClientOnly 結構性消除 hydration mismatch。 -->
    <div
      v-if="status === 'idle' || status === 'pending'"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span class="sr-only">{{ t('ui.state.loading') }}</span>

      <ClientOnly>
        <!-- list skeleton：鏡像 Item（僅 client 偏好 list 時） -->
        <div v-if="isListMode" class="flex flex-col gap-2">
          <div
            v-for="i in 6"
            :key="i"
            class="flex animate-pulse motion-reduce:animate-none items-center gap-2"
            aria-hidden="true"
          >
            <div
              class="flex flex-1 items-center gap-3 rounded-lg border border-border bg-canvas-elevated px-3 py-2.5"
            >
              <div class="size-14 shrink-0 rounded-md bg-surface" />
              <div class="flex-1 space-y-2">
                <div class="h-4 w-1/3 rounded bg-surface" />
                <div class="h-3 w-1/4 rounded bg-surface" />
              </div>
            </div>
            <div class="size-11 shrink-0 rounded-md bg-surface" />
          </div>
        </div>

        <!-- grid skeleton：鏡像 Card（client 偏好 grid） -->
        <div
          v-else
          class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6"
        >
          <div
            v-for="i in 6"
            :key="i"
            class="animate-pulse motion-reduce:animate-none overflow-hidden rounded-lg border border-border bg-canvas-elevated"
            aria-hidden="true"
          >
            <div class="h-64 bg-surface" />
            <div class="px-4 pb-4 pt-3">
              <div class="h-6 w-2/3 rounded bg-surface" />
              <div class="mt-2 flex gap-2">
                <div class="h-5 w-12 rounded-full bg-surface" />
                <div class="h-4 w-20 rounded bg-surface" />
              </div>
            </div>
          </div>
        </div>

        <!-- server / 掛載前 fallback：統一用 card 樣式，edge cache HTML 對所有人一致；
             client 掛載後才依偏好換成 grid 卡 / list 列骨架。 -->
        <template #fallback>
          <div
            class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6"
          >
            <div
              v-for="i in 6"
              :key="i"
              class="animate-pulse motion-reduce:animate-none overflow-hidden rounded-lg border border-border bg-canvas-elevated"
              aria-hidden="true"
            >
              <div class="h-64 bg-surface" />
              <div class="px-4 pb-4 pt-3">
                <div class="h-6 w-2/3 rounded bg-surface" />
                <div class="mt-2 flex gap-2">
                  <div class="h-5 w-12 rounded-full bg-surface" />
                  <div class="h-4 w-20 rounded bg-surface" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </ClientOnly>
    </div>

    <!-- Error -->
    <div
      v-else-if="status === 'error'"
      class="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center text-content-muted"
      role="alert"
    >
      <p class="font-display text-2xl text-content">{{ t('character.loadFailed') }}</p>
      <p class="text-sm">{{ t('ui.state.networkErrorHint') }}</p>
      <CommonAppButton variant="warning" class="mt-2" @click="refresh()">
        {{ t('ui.state.retry') }}
      </CommonAppButton>
    </div>

    <!-- Character grid -->
    <div
      v-else-if="characters.length > 0 && !isListMode"
      class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6"
    >
      <BusinessCharacterListCard
        v-for="character in sortedCharacters"
        :key="character.id"
        :character="character"
        :is-delete-mode="isDeleteMode"
        @delete="onDeleteRequest"
        @share="onShareRequest"
      />
      <button
        type="button"
        class="flex min-h-84 cursor-pointer items-center justify-center rounded-lg border border-border bg-canvas-elevated text-content-muted transition-colors duration-200 hover:bg-surface hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        :aria-label="t('character.addCharacter')"
        @click="onAddCharacter"
      >
        <Icon name="plus" :size="48" />
      </button>
    </div>

    <!-- Character list -->
    <div v-else-if="characters.length > 0 && isListMode" class="flex flex-col gap-2">
      <BusinessCharacterListItem
        v-for="character in sortedCharacters"
        :key="character.id"
        :character="character"
        :is-delete-mode="isDeleteMode"
        @delete="onDeleteRequest"
        @share="onShareRequest"
      />
      <button
        type="button"
        class="flex min-h-19 cursor-pointer items-center justify-center rounded-lg border border-border bg-canvas-elevated px-3 py-2.5 text-content-muted transition-colors duration-200 hover:bg-surface hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        :aria-label="t('character.addCharacter')"
        @click="onAddCharacter"
      >
        <Icon name="plus" :size="28" />
      </button>
    </div>

    <!-- Empty state -->
    <NuxtLink
      v-else
      to="/character/build"
      class="group relative flex min-h-[60dvh] cursor-pointer select-none flex-col items-center justify-center overflow-hidden rounded-lg border border-border text-center transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      :aria-label="t('character.createCharacter')"
    >
      <!-- Dark scrim -->
      <div
        class="absolute inset-0 bg-overlay transition-opacity duration-200 group-hover:opacity-75"
        aria-hidden="true"
      />
      <!-- 氛圍漸層（沉浸區 1 漸層，低飽和暖調，靜態）-->
      <div
        class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,134,14,0.07),transparent_70%)]"
        aria-hidden="true"
      />

      <!-- Content -->
      <div class="relative z-10 flex flex-col items-center px-6 py-12">
        <div class="relative inline-flex items-center justify-center" aria-hidden="true">
          <span
            class="empty-glow absolute size-40 rounded-full bg-[radial-gradient(circle,rgba(184,134,14,0.20),transparent_70%)] blur-2xl"
          />
          <Icon name="double-sword" :size="72" class="relative text-content-faint" />
        </div>
        <h2 class="mt-6 font-display text-5xl font-bold text-content sm:text-6xl">
          {{ t('character.empty') }}
        </h2>
        <p class="mt-3 font-display text-lg text-content-muted sm:text-xl">
          {{ t('character.emptyCampaignHint') }}
        </p>
        <p
          class="mt-6 inline-block text-primary transition-[transform,color] duration-200 group-hover:text-primary-hover"
          aria-hidden="true"
        >
          <Icon name="plus" :size="40" />
        </p>
      </div>
    </NuxtLink>

    <!-- Delete confirmation -->
    <Modal
      v-model="confirmOpen"
      :title="t('character.deleteLabel')"
      bg-color="var(--color-canvas-elevated)"
      text-color="var(--color-content)"
      border-color="var(--color-border)"
    >
      <p class="text-content">{{ t('character.deleteConfirm') }}</p>
      <p v-if="pendingDelete" class="mt-2 font-bold text-content">
        {{ pendingDelete.name }}
      </p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <CommonAppButton
            type="button"
            variant="ghost"
            :disabled="deleting"
            @click="onDeleteCancel"
          >
            {{ t('ui.action.cancel') }}
          </CommonAppButton>
          <CommonAppButton
            type="button"
            variant="danger"
            :disabled="deleting"
            @click="onDeleteConfirm"
          >
            {{ t('ui.action.delete') }}
          </CommonAppButton>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { Icon, Modal, Select } from '@ui'
import type { SelectOption } from '@ui'
import type { CharacterListItem } from '~/types/business/character-list'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const toast = useToast()

useHead({ title: t('character.card') })

const characterStore = useCharacterStore()
const authStore = useAuthStore()
const apiErrorToast = useApiErrorToast()
// server: false：SSR 階段不拉使用者資料，輸出對所有人一致的 skeleton HTML，
// 避免 Vercel edge cache 把某使用者的角色列表共享給其他人。
const { status, refresh } = useAsyncData('characters', () => characterStore.loadList(), {
  server: false,
  lazy: true,
})

const characters = computed<CharacterListItem[]>(() => characterStore.characters)

// 達上限時列表入口前置攔截；build 頁另有 character-limit guard，判斷統一由 store 提供。
const onAddCharacter = () => {
  if (characterStore.isAtCharacterLimit) {
    toast.error(t('character.characterLimitReached'))
    return
  }
  void navigateTo('/character/build')
}

// 顯示模式：以 user.preference.characterListLayout 為單一來源；
// 整頁 auth-gated，未登入看不到滑塊，不需要 localStorage fallback。
const setListMode = async (next: boolean): Promise<void> => {
  try {
    await authStore.updatePreference({ characterListLayout: next ? 'list' : 'grid' })
  } catch (err) {
    // store 未更新 → 滑塊透過 computed 自然 rerender 回原值，視覺自動 rollback
    apiErrorToast.handle(err)
  }
}

const isListMode = computed({
  get: () => authStore.user?.preference.characterListLayout === 'list',
  set: (val) => {
    void setListMode(val)
  },
})

// ── Share ─────────────────────────────────────────────────────────────────────

// 先同步開新分頁（保住 user gesture 不被擋彈窗），再 await 複製連結。
const onShareRequest = (character: CharacterListItem): void => {
  const url = `${window.location.origin}/character/${character.id}/share`
  window.open(url, '_blank', 'noopener')
  void copyShareLink(url)
}

const copyShareLink = async (url: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(url)
    toast.success(t('character.share.linkCopied'))
  } catch {
    toast.info(t('character.share.copyFailed'))
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

const isDeleteMode = ref(false)
const pendingDelete = ref<CharacterListItem | null>(null)
const confirmOpen = ref(false)
const deleting = ref(false)

const onDeleteRequest = (character: CharacterListItem) => {
  pendingDelete.value = character
  confirmOpen.value = true
}

const onDeleteCancel = () => {
  confirmOpen.value = false
  pendingDelete.value = null
}

const onDeleteConfirm = async () => {
  if (!pendingDelete.value || deleting.value) return
  deleting.value = true
  try {
    await characterStore.removeCharacter(pendingDelete.value.id)
    confirmOpen.value = false
    pendingDelete.value = null
  } catch {
    toast.error(t('ui.message.deleteFailed'))
  } finally {
    deleting.value = false
  }
}

// ── Sort ──────────────────────────────────────────────────────────────────────

type SortKey = 'default' | 'level-asc' | 'level-desc'

const SORT_OPTIONS: SelectOption[] = [
  { value: 'default', label: t('character.default') },
  { value: 'level-asc', label: t('class.levelUp') },
  { value: 'level-desc', label: t('class.levelDown') },
]

const sortKey = ref<SortKey>('default')

const sortedCharacters = computed(() => {
  const list = [...characters.value]
  const byUpdated = (a: CharacterListItem, b: CharacterListItem) =>
    b.updatedAt.localeCompare(a.updatedAt)
  if (sortKey.value === 'level-asc')
    return list.sort((a, b) => a.level - b.level || byUpdated(a, b))
  if (sortKey.value === 'level-desc')
    return list.sort((a, b) => b.level - a.level || byUpdated(a, b))
  return list.sort(byUpdated)
})
</script>

<style scoped>
/* @ui Select 沒有 44px size（sm32/md40/lg48），把內層 trigger 撐到 44 對齊 toggle / trash */
.sort-select :deep([role='combobox']) {
  height: 2.75rem;
}

/* empty state hero glow：沉浸區 1 動畫，緩慢呼吸（非 animate-pulse） */
.empty-glow {
  animation: empty-glow-breathe 7s ease-in-out infinite alternate;
}
@keyframes empty-glow-breathe {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .empty-glow {
    animation: none;
    opacity: 0.7;
  }
}
</style>
