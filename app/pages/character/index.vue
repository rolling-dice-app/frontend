<template>
  <div class="mx-auto max-w-6xl px-4 pb-6">
    <!-- Page header -->
    <CommonPageHeader title="Characters" show-back>
      <template v-if="characterStore.characters.length > 0" #actions>
        <div class="flex flex-col items-end gap-2 xs:flex-row xs:items-center">
          <!-- 測試用按鈕 -->
          <Button
            v-if="isDev"
            bg-color="var(--color-danger)"
            @click="characterStore.resetCharacters"
          >
            重設 mock 資料
          </Button>
          <!-- 排序模式 -->
          <Select
            v-model="sortKey"
            :options="SORT_OPTIONS"
            :border="true"
            border-color="var(--rd--color-border)"
            color="var(--rd--color-text)"
            dropdown-bg="var(--rd--color-bg-elevated)"
            class="sort-select w-21 xs:w-28"
            aria-label="排序方式"
          />
          <!-- 顯示模式 -->
          <button
            type="button"
            :aria-pressed="isListMode"
            aria-label="切換顯示模式"
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

          <button
            type="button"
            :aria-label="deleteMode ? '離開刪除模式' : '進入刪除模式'"
            :aria-pressed="deleteMode"
            class="size-10 flex items-center justify-center bg-danger rounded-md cursor-pointer hover:bg-danger-hover transition-colors duration-150 text-text-inverse"
            @click="toggleDeleteMode"
          >
            <Icon name="trash" :size="24" />
          </button>
        </div>
      </template>
    </CommonPageHeader>

    <!-- Character grid -->
    <div
      v-if="characterStore.characters.length > 0 && !isListMode"
      class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6"
    >
      <BusinessCharacterCard
        v-for="character in sortedCharacters"
        :key="character.id"
        :character="character"
        :is-delete-mode="deleteMode"
        @delete="handleDeleteRequest"
      />
      <NuxtLink
        to="/character/build"
        class="flex min-h-68 cursor-pointer items-center justify-center rounded-lg border border-border bg-bg-elevated text-content-muted transition-colors duration-200 hover:bg-surface hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        aria-label="新增角色卡"
      >
        <Icon name="plus" :size="48" />
      </NuxtLink>
    </div>

    <!-- Character list -->
    <div v-else-if="characterStore.characters.length > 0 && isListMode" class="flex flex-col gap-2">
      <BusinessCharacterListItem
        v-for="character in sortedCharacters"
        :key="character.id"
        :character="character"
        :is-delete-mode="deleteMode"
        @delete="handleDeleteRequest"
      />
      <NuxtLink
        to="/character/build"
        class="flex min-h-19 items-center justify-center rounded-lg border border-border bg-bg-elevated px-3 py-2.5 text-content-muted transition-colors duration-200 hover:bg-surface hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        aria-label="新增角色卡"
      >
        <Icon name="plus" :size="28" />
      </NuxtLink>
    </div>

    <!-- Empty state -->
    <NuxtLink
      v-else
      to="/character/build"
      class="group relative flex min-h-[60dvh] cursor-pointer select-none flex-col items-center justify-center overflow-hidden rounded-xl border border-border text-center transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      aria-label="建立角色卡"
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
        <h2 class="mt-4 font-display text-2xl font-bold text-content">尚無角色卡</h2>
        <p class="mt-2 text-sm">一場偉大的冒險，往往從踏出第一步開始</p>
        <p
          class="mt-4 inline-block transition-[transform,color] duration-200 text-success group-hover:text-success-hover"
        >
          <Icon name="plus" :size="40" />
        </p>
      </div>
    </NuxtLink>

    <!-- Delete confirm modal -->
    <Modal
      v-model="showDeleteModal"
      :title="`刪除角色卡 ${deleteTarget?.name}？`"
      :show-close-button="false"
      :close-on-escape="false"
      :close-on-click-outside="false"
      size="sm"
      bg-color="var(--color-canvas-elevated)"
      text-color="var(--color-content)"
      border-color="var(--color-border)"
    >
      <p class="text-md text-content-muted">刪除後無法復原，確定要刪除這張角色卡嗎？</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            outline
            size="sm"
            border-color="var(--color-border)"
            text-color="var(--color-content)"
            :radius="8"
            @click="showDeleteModal = false"
          >
            取消
          </Button>
          <Button bg-color="var(--color-danger)" size="sm" :radius="8" @click="handleDeleteConfirm">
            確認刪除
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { Icon, Select, Button, Modal } from '@ui'
import type { SelectOption } from '@ui'
import { CHARACTER_VIEW_MODE_KEY } from '~/constants/storage'
import type { Character } from '@rolling-dice-app/types'

useHead({ title: '角色卡' })

const isDev = import.meta.dev
const characterStore = useCharacterStore()

const storedMode = getLocalStorage<string>(CHARACTER_VIEW_MODE_KEY)
const isListMode = ref(storedMode === 'list')
const deleteMode = ref(false)
const showDeleteModal = ref(false)
const deleteTarget = ref<{ id: string; name: string } | null>(null)

watch(isListMode, (val) => {
  setLocalStorage(CHARACTER_VIEW_MODE_KEY, val ? 'list' : 'grid')
  deleteMode.value = false
})

const toggleDeleteMode = () => {
  deleteMode.value = !deleteMode.value
}

const handleDeleteRequest = (character: Character) => {
  deleteTarget.value = { id: character.id, name: character.name }
  showDeleteModal.value = true
}

const handleDeleteConfirm = () => {
  if (deleteTarget.value) {
    const name = deleteTarget.value.name
    if (characterStore.removeCharacter(deleteTarget.value.id)) {
      useToast().success(`已刪除「${name}」`)
    } else {
      useToast().error('刪除失敗，請稍後再試')
    }
  }
  showDeleteModal.value = false
  deleteTarget.value = null
}

// ── Sort ──────────────────────────────────────────────────────────────────────

type SortKey = 'default' | 'level-asc' | 'level-desc'

const SORT_OPTIONS: SelectOption[] = [
  { value: 'default', label: '預設' },
  { value: 'level-asc', label: '等級 ↑' },
  { value: 'level-desc', label: '等級 ↓' },
]

const sortKey = ref<SortKey>('default')

const sortedCharacters = computed(() => {
  const list = [...characterStore.characters]
  const getLevel = (c: Character) => calculateTotalLevel(c.professions)
  const byCreated = (a: Character, b: Character) => a.createdAt.localeCompare(b.createdAt)
  if (sortKey.value === 'level-asc')
    return list.sort((a, b) => getLevel(a) - getLevel(b) || byCreated(a, b))
  if (sortKey.value === 'level-desc')
    return list.sort((a, b) => getLevel(b) - getLevel(a) || byCreated(a, b))
  return list.sort(byCreated)
})
</script>
