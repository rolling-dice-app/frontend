<template>
  <div>
    <CommonPageHeader :title="container?.title || ''" :show-back="true" back-to="/dm/session">
      <template v-if="container" #actions>
        <div class="ml-auto flex gap-2">
          <CommonAppButton variant="primary" @click="onAddLog">
            {{ t('dmSession.log.addLog') }}
          </CommonAppButton>
          <CommonAppButton variant="danger" @click="confirmOpen = true">
            {{ t('ui.action.delete') }}
          </CommonAppButton>
        </div>
      </template>
    </CommonPageHeader>

    <!-- Loading：info card + 時間軸骨架 -->
    <div
      v-if="status === 'idle' || status === 'pending'"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span class="sr-only">{{ t('ui.state.loading') }}</span>
      <div
        class="animate-pulse rounded-lg border border-border-soft bg-canvas-elevated p-4 motion-reduce:animate-none sm:p-6"
        aria-hidden="true"
      >
        <div class="h-6 w-1/3 rounded bg-surface" />
        <div class="mt-4 flex gap-1.5">
          <div class="h-5 w-16 rounded-full bg-surface" />
          <div class="h-5 w-16 rounded-full bg-surface" />
        </div>
        <div class="mt-4 h-4 w-2/3 rounded bg-surface" />
      </div>
      <div class="mt-6 space-y-3" aria-hidden="true">
        <div
          v-for="i in 3"
          :key="i"
          class="h-12 animate-pulse rounded-lg border border-border-soft bg-canvas-elevated motion-reduce:animate-none"
        />
      </div>
    </div>

    <!-- 真 404：劇本不存在（或非擁有者） -->
    <CommonNotFound
      v-else-if="isNotFound"
      :message="t('dmSession.notFound')"
      back-to="/dm/session"
      :back-label="t('dmSession.backToList')"
    />

    <!-- 暫時性錯誤：可重試 -->
    <div
      v-else-if="status === 'error'"
      class="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center"
      role="alert"
    >
      <p class="text-danger">{{ t('dmSession.loadFailed') }}</p>
      <CommonAppButton variant="warning" @click="refresh()">
        {{ t('ui.state.retry') }}
      </CommonAppButton>
    </div>

    <template v-else-if="container">
      <!-- 劇本資訊卡：三列各自就地編輯 -->
      <div
        class="divide-y divide-divider rounded-lg border border-border-soft bg-canvas-elevated px-4 sm:px-6"
      >
        <div class="flex items-center justify-between gap-2 py-4">
          <div class="min-w-0">
            <p class="text-xs text-content-muted">{{ t('dmSession.container.field.title') }}</p>
            <p class="mt-1 truncate font-display text-base font-bold text-content">
              {{ container.title }}
            </p>
          </div>
          <button
            type="button"
            :aria-label="t('dmSession.container.editTitle')"
            class="flex size-11 shrink-0 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-raised hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="renameOpen = true"
          >
            <Icon name="edit" :size="18" />
          </button>
        </div>

        <div class="flex items-start justify-between gap-2 py-4">
          <div class="min-w-0 flex-1">
            <p class="text-xs text-content-muted">
              {{ t('dmSession.container.field.members') }}
              <span class="ml-1 tabular-nums">
                {{ container.members.length }}/{{ maxMembers }}
              </span>
            </p>
            <div class="mt-2">
              <BusinessDmSessionMemberChipList
                v-if="container.members.length > 0"
                :members="container.members"
              />
              <button
                v-else
                type="button"
                class="rounded-sm text-xs text-content-faint transition-colors hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                @click="membersOpen = true"
              >
                {{ t('dmSession.container.membersEmpty') }}
              </button>
            </div>
          </div>
          <button
            type="button"
            :aria-label="t('dmSession.container.editMembers')"
            class="flex size-11 shrink-0 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-raised hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="membersOpen = true"
          >
            <Icon name="edit" :size="18" />
          </button>
        </div>

        <div class="flex items-start justify-between gap-2 py-4">
          <div class="min-w-0 flex-1">
            <p class="text-xs text-content-muted">{{ t('dmSession.container.field.remark') }}</p>
            <p v-if="container.remark" class="mt-1 text-sm whitespace-pre-line text-content">
              {{ container.remark }}
            </p>
            <button
              v-else
              type="button"
              class="mt-1 rounded-sm text-xs text-content-faint transition-colors hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @click="remarkOpen = true"
            >
              {{ t('dmSession.container.remarkEmpty') }}
            </button>
          </div>
          <button
            type="button"
            :aria-label="t('dmSession.container.editRemark')"
            class="flex size-11 shrink-0 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-raised hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="remarkOpen = true"
          >
            <Icon name="edit" :size="18" />
          </button>
        </div>
      </div>

      <!-- 團務時間軸 -->
      <section :aria-label="t('dmSession.timeline.title')" class="mt-8">
        <div class="mb-4 flex items-baseline gap-2">
          <h3 class="font-display text-base font-bold text-content">
            {{ t('dmSession.timeline.title') }}
          </h3>
          <span class="text-xs text-content-muted tabular-nums">
            {{ container.sessions.length }}
          </span>
        </div>

        <BusinessDmSessionSessionTimeline
          v-if="container.sessions.length > 0"
          :sessions="container.sessions"
          :container-id="id"
        />

        <!-- 空狀態：這個劇本還沒有團務 -->
        <NuxtLink
          v-else
          :to="`/dm/session/${id}/log/create`"
          class="relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-border px-6 py-12 text-center transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div
            class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,134,14,0.06),transparent_70%)]"
            aria-hidden="true"
          />
          <p class="relative z-10 font-display text-2xl font-bold text-content">
            {{ t('dmSession.timeline.empty') }}
          </p>
          <p class="relative z-10 mt-2 font-display text-sm text-content-muted">
            {{ t('dmSession.timeline.emptyHint') }}
          </p>
          <span class="relative z-10 mt-4 inline-block text-primary" aria-hidden="true">
            <Icon name="plus" :size="28" />
          </span>
        </NuxtLink>
      </section>
    </template>

    <!-- 編輯 Modals -->
    <BusinessDmSessionContainerTitleModal
      v-model:open="renameOpen"
      mode="rename"
      :initial-title="container?.title ?? ''"
      @confirm="onRenameConfirm"
    />
    <BusinessDmSessionMemberEditModal
      v-model:open="membersOpen"
      :members="container?.members ?? []"
      @confirm="onMembersConfirm"
    />
    <BusinessDmSessionContainerRemarkModal
      v-model:open="remarkOpen"
      :remark="container?.remark ?? ''"
      @confirm="onRemarkConfirm"
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
      <p v-if="container" class="mt-2 font-bold text-content">{{ container.title }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <CommonAppButton type="button" variant="ghost" @click="confirmOpen = false">
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
import { VALIDATION_LIMITS } from '@rolling-dice-app/core'
import type { DmSessionMemberDTO } from '@rolling-dice-app/core'

definePageMeta({
  middleware: 'auth',
  noindex: true,
  key: (route) => route.params.id as string,
})

const { t } = useI18n()
const route = useRoute()
const id = getRouteParam(route.params.id)
const toast = useToast()
const apiErrorToast = useApiErrorToast()
const dmSessionStore = useDmSessionStore()

useHead({ title: t('dmSession.detailTitle') })

const maxMembers = VALIDATION_LIMITS.maxMembersPerDmSessionContainer

// 與列表同步：私有資料不進 SSR HTML / payload。id 在本次 mount 內恆定（route 變動走 page key remount）。
const { status, refresh } = useAsyncData(
  () => `dm-session-container-${id}`,
  () => dmSessionStore.loadContainer(id),
  { server: false, lazy: true },
)

const container = computed(() => dmSessionStore.getContainerById(id))

// mock 讀取不會拋錯，404 僅剩 success 但查無資料一種形態；串接後補 FetchError 404 分支。
const isNotFound = computed(() => status.value === 'success' && !container.value)

// ── 新增團務 ────────────────────────────────────────────────────────────────
const isAtLogLimit = computed(() => {
  const limits = useAuthStore().limits
  return (
    limits != null && (container.value?.sessions.length ?? 0) >= limits.maxDmSessionLogsPerContainer
  )
})

const onAddLog = (): void => {
  if (isAtLogLimit.value) {
    toast.error(t('dmSession.log.limitReached'))
    return
  }
  void navigateTo(`/dm/session/${id}/log/create`)
}

// ── 就地編輯（各自一次 PATCH） ───────────────────────────────────────────────
const renameOpen = ref(false)
const membersOpen = ref(false)
const remarkOpen = ref(false)

const patchContainer = async (
  patch: Partial<{ title: string; remark: string; members: DmSessionMemberDTO[] }>,
): Promise<void> => {
  try {
    await dmSessionStore.updateContainer(id, patch)
    toast.success(t('dmSession.savedHint'))
  } catch (err) {
    apiErrorToast.handle(err)
  }
}

const onRenameConfirm = (title: string): Promise<void> => patchContainer({ title })
const onMembersConfirm = (members: DmSessionMemberDTO[]): Promise<void> =>
  patchContainer({ members })
const onRemarkConfirm = (remark: string): Promise<void> => patchContainer({ remark })

// ── 刪除 ────────────────────────────────────────────────────────────────────
const confirmOpen = ref(false)
const deleting = ref(false)

const onDeleteConfirm = async (): Promise<void> => {
  if (deleting.value) return
  deleting.value = true
  try {
    await dmSessionStore.removeContainer(id)
    confirmOpen.value = false
    await navigateTo('/dm/session')
  } catch (err) {
    apiErrorToast.handle(err)
  } finally {
    deleting.value = false
  }
}
</script>
