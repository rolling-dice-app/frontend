<template>
  <div class="mx-auto max-w-6xl px-4 pb-6">
    <!-- Page header -->
    <CommonPageHeader title="Characters" show-back>
      <template v-if="status === 'success' && characters.length > 0" #actions>
        <div class="flex justify-center xs:justify-end gap-2 w-full">
          <!-- 排序模式 -->
          <Select
            v-model="sortKey"
            :options="SORT_OPTIONS"
            :border="true"
            border-color="var(--rd--color-border)"
            color="var(--rd--color-text)"
            dropdown-bg="var(--rd--color-bg-elevated)"
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
              :class="!isListMode ? 'text-text-inverse' : 'text-content-muted'"
              aria-hidden="true"
            >
              <Icon name="grid" :size="24" />
            </span>
            <span
              class="relative z-10 flex h-full w-11 items-center justify-center transition-colors duration-150"
              :class="isListMode ? 'text-text-inverse' : 'text-content-muted'"
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
              isDeleteMode ? 'bg-danger text-text-inverse' : 'text-content-muted hover:bg-surface'
            "
            @click="isDeleteMode = !isDeleteMode"
          >
            <Icon name="trash" :size="20" />
          </button>
        </div>
      </template>
    </CommonPageHeader>

    <!-- Loading skeleton：SSR idle + client pending 都顯示 -->
    <div
      v-if="status === 'idle' || status === 'pending'"
      class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span class="sr-only">{{ t('ui.state.loading') }}</span>
      <div
        v-for="i in 6"
        :key="i"
        class="min-h-68 animate-pulse rounded-lg border border-border bg-bg-elevated"
        aria-hidden="true"
      />
    </div>

    <!-- Error -->
    <div
      v-else-if="status === 'error'"
      class="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center text-content-muted"
      role="alert"
    >
      <p class="font-display text-2xl text-content">{{ t('character.loadFailed') }}</p>
      <p class="text-sm">{{ t('ui.state.networkErrorHint') }}</p>
      <button
        type="button"
        class="mt-2 rounded-md border border-border bg-surface px-4 py-2 text-content transition-colors hover:bg-surface-2"
        @click="refresh()"
      >
        {{ t('ui.state.retry') }}
      </button>
    </div>

    <!-- Character grid -->
    <div
      v-else-if="characters.length > 0 && !isListMode"
      class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6"
    >
      <BusinessCharacterCard
        v-for="character in sortedCharacters"
        :key="character.id"
        :character="character"
        :is-delete-mode="isDeleteMode"
        @delete="onDeleteRequest"
      />
      <NuxtLink
        to="/character/build"
        class="flex min-h-68 cursor-pointer items-center justify-center rounded-lg border border-border bg-bg-elevated text-content-muted transition-colors duration-200 hover:bg-surface hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        :aria-label="t('character.addCharacter')"
      >
        <Icon name="plus" :size="48" />
      </NuxtLink>
    </div>

    <!-- Character list -->
    <div v-else-if="characters.length > 0 && isListMode" class="flex flex-col gap-2">
      <BusinessCharacterListItem
        v-for="character in sortedCharacters"
        :key="character.id"
        :character="character"
        :is-delete-mode="isDeleteMode"
        @delete="onDeleteRequest"
      />
      <NuxtLink
        to="/character/build"
        class="flex min-h-19 items-center justify-center rounded-lg border border-border bg-bg-elevated px-3 py-2.5 text-content-muted transition-colors duration-200 hover:bg-surface hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        :aria-label="t('character.addCharacter')"
      >
        <Icon name="plus" :size="28" />
      </NuxtLink>
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
const { status, refresh } = await useAsyncData('characters', () => characterStore.loadList(), {
  server: false,
  lazy: false,
})

const characters = computed<CharacterListItem[]>(() => characterStore.characters)

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
