<template>
  <div>
    <!-- Loading：表單需要常駐名單做出席預填，先等劇本載入 -->
    <template v-if="status === 'idle' || status === 'pending'">
      <CommonPageHeader :title="''" :show-back="true" :back-to="`/dm/session/${id}`" />
      <div
        class="flex min-h-[50dvh] items-center justify-center text-content-muted"
        role="status"
        aria-live="polite"
      >
        {{ t('ui.state.loading') }}
      </div>
    </template>

    <!-- 真 404：劇本不存在（或非擁有者） -->
    <template v-else-if="isNotFound">
      <CommonPageHeader :title="''" :show-back="true" back-to="/dm/session" />
      <CommonNotFound
        :message="t('dmSession.notFound')"
        back-to="/dm/session"
        :back-label="t('dmSession.backToList')"
      />
    </template>

    <!-- 暫時性錯誤：可重試 -->
    <template v-else-if="isTransientError">
      <CommonPageHeader :title="''" :show-back="true" :back-to="`/dm/session/${id}`" />
      <div
        class="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center"
        role="alert"
      >
        <p class="text-danger">{{ t('dmSession.loadFailed') }}</p>
        <CommonAppButton variant="warning" @click="refresh()">
          {{ t('ui.state.retry') }}
        </CommonAppButton>
      </div>
    </template>

    <BusinessDmSessionLogForm
      v-else-if="draft"
      :log="draft"
      :container-members="container?.members ?? []"
      mode="create"
      :back-to="`/dm/session/${id}`"
      :submitting="isSaving"
      @save="onSave"
    />
  </div>
</template>

<script setup lang="ts">
import { buildDmSessionLogCreateDefaults } from '@rolling-dice-app/core'
import type { DmSessionLogDraft } from '~/types/business/dm-session'

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

useHead({ title: t('dmSession.log.createTitle') })

const { status, error, refresh } = useAsyncData(
  () => `dm-session-log-create-${id}`,
  () => dmSessionStore.loadContainer(id),
  { server: false, lazy: true },
)

const container = computed(() => dmSessionStore.getContainerById(id))

// 真 404（劇本不存在 / 非擁有者）走 NotFound；其餘暫時性錯誤走可重試三態。
const isNotFound = computed(
  () =>
    (status.value === 'error' && isFetchError(error.value) && error.value.statusCode === 404) ||
    (status.value === 'success' && !container.value),
)
const isTransientError = computed(() => status.value === 'error' && !isNotFound.value)

// ── log 上限守門（per-container，直連 URL 也適用；詳情頁 onAddLog 已前置擋一次） ──
const isAtLogLimit = computed(() => {
  const limits = useAuthStore().limits
  return (
    limits != null && (container.value?.sessions.length ?? 0) >= limits.maxDmSessionLogsPerContainer
  )
})

watch(status, (value) => {
  if (value !== 'success' || !isAtLogLimit.value) return
  toast.error(t('dmSession.log.limitReached'))
  void navigateTo(`/dm/session/${id}`, { replace: true })
})

/**
 * 日期由 client 預填今日（契約：defaults 不碰時間）。
 * Known divergence: "today" here is client-local time, while backend nextSession
 * derivation is fixed to Asia/Taipei (product decision, zh-TW single market).
 * Accepted — the prefill is editable and off-by-one only matters near midnight abroad.
 */
const todayISO = (): string => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// 出席預填常駐名單全員（缺席者由 DM 反選）；container 讀取已是防禦性 clone。
const draft = computed<DmSessionLogDraft | undefined>(() => {
  const loaded = container.value
  if (!loaded) return undefined
  return {
    ...buildDmSessionLogCreateDefaults(),
    title: '',
    date: todayISO(),
    members: loaded.members,
  }
})

const isSaving = ref(false)

const onSave = async (next: DmSessionLogDraft): Promise<void> => {
  if (isSaving.value) return
  isSaving.value = true
  try {
    const created = await dmSessionStore.createLog(id, next)
    toast.success(t('dmSession.savedHint'))
    // 存檔後落在剛寫的紀錄上（非跳回劇本），與 monster 回列表為刻意差異
    await navigateTo(`/dm/session/${id}/log/${created.id}`)
  } catch (err) {
    apiErrorToast.handle(err)
  } finally {
    isSaving.value = false
  }
}
</script>
