<template>
  <div class="mx-auto max-w-6xl px-4 pb-6">
    <!-- Page header -->
    <CommonPageHeader title="Characters" show-back>
      <template v-if="status === 'success' && characters.length > 0" #actions>
        <div class="flex flex-col items-end gap-2 xs:flex-row xs:items-center">
          <!-- 排序模式 -->
          <Select
            v-model="sortKey"
            :options="SORT_OPTIONS"
            :border="true"
            border-color="var(--rd--color-border)"
            color="var(--rd--color-text)"
            dropdown-bg="var(--rd--color-bg-elevated)"
            class="sort-select w-21 xs:w-28"
            :aria-label="t('character.sortBy')"
          />
          <!-- 顯示模式 -->
          <button
            type="button"
            :aria-pressed="isListMode"
            :aria-label="t('character.toggleViewMode')"
            class="relative flex cursor-pointer items-center rounded-lg border border-border p-1"
            @click="isListMode = !isListMode"
            @keydown.enter.prevent="isListMode = !isListMode"
            @keydown.space.prevent="isListMode = !isListMode"
          >
            <div
              class="absolute top-1 left-1 size-8 rounded-md bg-primary transition-transform duration-200"
              :class="isListMode ? 'translate-x-8' : 'translate-x-0'"
              aria-hidden="true"
            />
            <span
              class="relative z-10 flex size-8 items-center justify-center transition-colors duration-150"
              :class="!isListMode ? 'text-text-inverse' : 'text-content-muted'"
              aria-hidden="true"
            >
              <Icon name="grid" :size="24" />
            </span>
            <span
              class="relative z-10 flex size-8 items-center justify-center transition-colors duration-150"
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
            class="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border transition-colors duration-150"
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

    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="flex min-h-[60dvh] items-center justify-center text-content-muted"
      role="status"
      aria-live="polite"
    >
      {{ t('ui.state.loading') }}
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
      class="group relative flex min-h-[60dvh] cursor-pointer select-none flex-col items-center justify-center overflow-hidden rounded-xl border border-border text-center transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      :aria-label="t('character.createCharacter')"
    >
      <!-- Background image -->
      <div class="absolute inset-0 bg-cover bg-center" aria-hidden="true" />
      <div
        class="absolute inset-0 bg-[rgba(19,16,17,0.8)] transition-opacity duration-200 group-hover:opacity-75"
        aria-hidden="true"
      />

      <!-- Content -->
      <div class="relative z-10 px-6 py-12 text-content-muted">
        <p class="font-display text-5xl text-content-faint" aria-hidden="true">⚔</p>
        <h2 class="mt-4 font-display text-2xl font-bold text-content">
          {{ t('character.empty') }}
        </h2>
        <p class="mt-2 text-sm">{{ t('character.emptyCampaignHint') }}</p>
        <p
          class="mt-4 inline-block transition-[transform,color] duration-200 text-success group-hover:text-success-hover"
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
          <Button
            type="button"
            :radius="4"
            bg-color="var(--color-surface-2)"
            :disabled="deleting"
            @click="onDeleteCancel"
          >
            {{ t('ui.action.cancel') }}
          </Button>
          <Button
            type="button"
            :radius="4"
            bg-color="var(--color-danger)"
            :disabled="deleting"
            @click="onDeleteConfirm"
          >
            {{ t('ui.action.delete') }}
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { Button, Icon, Modal, Select } from '@ui'
import type { SelectOption } from '@ui'
import { CHARACTER_VIEW_MODE_KEY } from '~/constants/storage'
import type { CharacterListItem } from '~/types/business/character-list'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const toast = useToast()

useHead({ title: t('character.card') })

const characterStore = useCharacterStore()
const { status, refresh } = await useAsyncData('characters', () => characterStore.loadList(), {
  lazy: false,
})

const characters = computed<CharacterListItem[]>(() => characterStore.characters)

const isListMode = ref(false)

onMounted(() => {
  const storedMode = getLocalStorage<string>(CHARACTER_VIEW_MODE_KEY)
  if (storedMode === 'list') isListMode.value = true
})

watch(isListMode, (val) => {
  setLocalStorage(CHARACTER_VIEW_MODE_KEY, val ? 'list' : 'grid')
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
