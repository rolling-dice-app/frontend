<template>
  <div>
    <CommonPageHeader :title="t('dmSession.listTitle')" :show-back="true" back-to="/" />

    <!-- Loading：鏡像資料卡的 grid 骨架（劇本名 / 成員 pill / 建立日期）。 -->
    <div
      v-if="status === 'idle' || status === 'pending'"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span class="sr-only">{{ t('ui.state.loading') }}</span>
      <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="i in 6"
          :key="i"
          class="animate-pulse rounded-lg border border-border-soft bg-canvas-elevated p-4 motion-reduce:animate-none"
          aria-hidden="true"
        >
          <div class="h-6 w-2/3 rounded bg-surface" />
          <div class="mt-2 flex gap-1.5">
            <div class="h-5 w-14 rounded-full bg-surface" />
            <div class="h-5 w-14 rounded-full bg-surface" />
            <div class="h-5 w-10 rounded-full bg-surface" />
          </div>
          <div class="mt-3 h-4 w-24 rounded bg-surface" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="status === 'error'"
      class="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center text-content-muted"
      role="alert"
    >
      <p class="font-display text-2xl text-content">{{ t('dmSession.loadFailed') }}</p>
      <CommonAppButton variant="warning" class="mt-2" @click="refresh()">
        {{ t('ui.state.retry') }}
      </CommonAppButton>
    </div>

    <!-- 空狀態 -->
    <button
      v-else-if="containers.length === 0"
      type="button"
      class="group relative flex min-h-[50dvh] w-full cursor-pointer select-none flex-col items-center justify-center overflow-hidden rounded-lg border border-border text-center transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      :aria-label="t('dmSession.addContainer')"
      @click="onAdd"
    >
      <div
        class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,134,14,0.07),transparent_70%)]"
        aria-hidden="true"
      />
      <div class="relative z-10 flex flex-col items-center px-6 py-12">
        <h2 class="mt-6 font-display text-4xl font-bold text-content sm:text-6xl">
          {{ t('dmSession.empty') }}
        </h2>
        <p class="mt-3 font-display text-lg text-content-muted">{{ t('dmSession.emptyHint') }}</p>
        <span class="mt-6 inline-block text-primary" aria-hidden="true">
          <Icon name="plus" :size="36" />
        </span>
      </div>
    </button>

    <!-- 列表 grid -->
    <div v-else class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      <div
        v-for="container in containers"
        :key="container.id"
        class="relative flex flex-col rounded-lg border border-border-soft bg-canvas-elevated shadow-elev-1 transition-colors duration-150 hover:bg-surface"
      >
        <NuxtLink
          :to="`/dm/session/${container.id}`"
          class="flex flex-1 flex-col gap-2 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p class="truncate pr-8 font-display text-lg font-bold text-content">
            {{ container.title }}
          </p>
          <div v-if="container.members.length > 0" class="flex flex-wrap items-center gap-1.5">
            <span
              v-for="(member, index) in container.members.slice(0, MEMBER_PREVIEW_COUNT)"
              :key="index"
              class="inline-flex max-w-28 rounded-full border border-border-soft bg-surface-2 px-2 py-0.5 text-xs text-content"
            >
              <span class="truncate">{{ member.playerName }}</span>
            </span>
            <span
              v-if="container.members.length > MEMBER_PREVIEW_COUNT"
              class="text-xs text-content-muted tabular-nums"
            >
              +{{ container.members.length - MEMBER_PREVIEW_COUNT }}
            </span>
          </div>
          <p v-else class="text-xs text-content-faint">
            {{ t('dmSession.container.membersEmpty') }}
          </p>
          <p class="mt-1 text-xs text-content-muted tabular-nums">
            {{ container.createdAt.slice(0, 10) }}
          </p>
        </NuxtLink>
        <button
          type="button"
          :aria-label="`${t('ui.action.delete')} ${container.title}`"
          class="absolute right-2 top-2 flex size-11 items-center justify-center rounded-md text-content-faint transition-colors duration-150 hover:text-danger-hover"
          @click="onDeleteRequest(container)"
        >
          <Icon name="trash" :size="16" />
        </button>
      </div>

      <!-- 新增 tile -->
      <button
        type="button"
        class="flex min-h-28 cursor-pointer items-center justify-center rounded-lg border border-border bg-canvas-elevated text-content-muted transition-colors duration-200 hover:bg-surface hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        :aria-label="t('dmSession.addContainer')"
        @click="onAdd"
      >
        <Icon name="plus" :size="40" />
      </button>
    </div>

    <!-- quick-create：只填劇本名稱，建立後直進詳情 -->
    <BusinessDmSessionContainerTitleModal
      v-model:open="createOpen"
      mode="create"
      @confirm="onCreateConfirm"
    />

    <!-- 刪除確認 -->
    <Modal
      v-model="confirmOpen"
      :title="t('dmSession.deleteLabel')"
      bg-color="var(--color-canvas-elevated)"
      text-color="var(--color-content)"
      border-color="var(--color-border)"
    >
      <p class="text-content">{{ t('dmSession.deleteConfirm') }}</p>
      <p v-if="pendingDelete" class="mt-2 font-bold text-content">{{ pendingDelete.title }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <CommonAppButton type="button" variant="ghost" @click="onDeleteCancel">
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
import { Icon, Modal } from '@ui'
import type { DmSessionContainerSummaryDTO } from '@rolling-dice-app/core'

definePageMeta({ middleware: 'auth', noindex: true })

const { t } = useI18n()
const toast = useToast()
const apiErrorToast = useApiErrorToast()

useHead({ title: t('dmSession.listTitle') })

const dmSessionStore = useDmSessionStore()

/** 卡片上成員 pill 的預覽上限，其餘以 +N 收合 */
const MEMBER_PREVIEW_COUNT = 4

// server: false：SSR 階段不拉使用者資料，避免 edge cache 把私有列表共享給其他人（與 monster 列表同步）。
const { status, refresh } = useAsyncData('dm-session-containers', () => dmSessionStore.loadList(), {
  server: false,
  lazy: true,
})

const containers = computed<DmSessionContainerSummaryDTO[]>(() => dmSessionStore.list)

// ── 建立 ────────────────────────────────────────────────────────────────────
const createOpen = ref(false)

const onAdd = (): void => {
  if (dmSessionStore.isAtContainerLimit) {
    toast.error(t('dmSession.limitReached'))
    return
  }
  createOpen.value = true
}

const onCreateConfirm = async (title: string): Promise<void> => {
  try {
    const created = await dmSessionStore.createContainer(title)
    await navigateTo(`/dm/session/${created.id}`)
  } catch (err) {
    apiErrorToast.handle(err)
  }
}

// ── 刪除 ────────────────────────────────────────────────────────────────────
const pendingDelete = ref<DmSessionContainerSummaryDTO | null>(null)
const confirmOpen = ref(false)
const deleting = ref(false)

const onDeleteRequest = (container: DmSessionContainerSummaryDTO): void => {
  pendingDelete.value = container
  confirmOpen.value = true
}

const onDeleteCancel = (): void => {
  confirmOpen.value = false
  pendingDelete.value = null
}

const onDeleteConfirm = async (): Promise<void> => {
  if (!pendingDelete.value || deleting.value) return
  deleting.value = true
  try {
    await dmSessionStore.removeContainer(pendingDelete.value.id)
    confirmOpen.value = false
    pendingDelete.value = null
  } catch (err) {
    apiErrorToast.handle(err)
  } finally {
    deleting.value = false
  }
}
</script>
