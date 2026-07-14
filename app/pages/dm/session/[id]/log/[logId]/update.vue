<template>
  <div>
    <!-- Loading -->
    <template v-if="status === 'idle' || status === 'pending'">
      <CommonPageHeader :title="''" :show-back="true" :back-to="`/dm/session/${id}/log/${logId}`" />
      <div
        class="flex min-h-[50dvh] items-center justify-center text-content-muted"
        role="status"
        aria-live="polite"
      >
        {{ t('ui.state.loading') }}
      </div>
    </template>

    <!-- 真 404：團務不存在（或不屬於此劇本） -->
    <template v-else-if="isNotFound">
      <CommonPageHeader :title="''" :show-back="true" :back-to="`/dm/session/${id}`" />
      <CommonNotFound
        :message="t('dmSession.log.notFound')"
        :back-to="`/dm/session/${id}`"
        :back-label="t('dmSession.log.backToContainer')"
      />
    </template>

    <!-- 暫時性錯誤：可重試 -->
    <template v-else-if="isTransientError">
      <CommonPageHeader :title="''" :show-back="true" :back-to="`/dm/session/${id}/log/${logId}`" />
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
      :key="logId"
      :log="draft"
      :container-members="container?.members ?? []"
      mode="edit"
      :back-to="`/dm/session/${id}/log/${logId}`"
      :submitting="isSaving"
      @save="onSave"
    />
  </div>
</template>

<script setup lang="ts">
import type { DmSessionLogDraft } from '~/types/business/dm-session'

definePageMeta({
  middleware: 'auth',
  noindex: true,
  key: (route) => `${route.params.id}-${route.params.logId}`,
})

const { t } = useI18n()
const route = useRoute()
const id = getRouteParam(route.params.id)
const logId = getRouteParam(route.params.logId)
const toast = useToast()
const apiErrorToast = useApiErrorToast()
const dmSessionStore = useDmSessionStore()

useHead({ title: t('dmSession.log.editTitle') })

// 表單同時需要紀錄本體與劇本常駐名單（出席 toggle chips）。
const { status, error, refresh } = useAsyncData(
  () => `dm-session-log-update-${logId}`,
  async () => {
    const [log] = await Promise.all([
      dmSessionStore.loadLog(id, logId),
      dmSessionStore.loadContainer(id),
    ])
    return log
  },
  { server: false, lazy: true },
)

const container = computed(() => dmSessionStore.getContainerById(id))

const draft = computed<DmSessionLogDraft | undefined>(() => {
  const dto = dmSessionStore.getLogById(logId)
  if (!dto || dto.containerId !== id) return undefined
  const { id: _id, containerId: _containerId, createdAt: _c, updatedAt: _u, ...rest } = dto
  return rest
})

// 真 404（紀錄或劇本不存在 / 不屬於此劇本 / 非擁有者，Promise.all 任一 GET 404 都進 error）
// 走 NotFound；其餘暫時性錯誤走可重試三態。
const isNotFound = computed(
  () =>
    (status.value === 'error' && isFetchError(error.value) && error.value.statusCode === 404) ||
    (status.value === 'success' && !draft.value),
)
const isTransientError = computed(() => status.value === 'error' && !isNotFound.value)

const isSaving = ref(false)

const onSave = async (next: DmSessionLogDraft): Promise<void> => {
  if (isSaving.value) return
  isSaving.value = true
  try {
    await dmSessionStore.updateLog(id, logId, next)
    toast.success(t('dmSession.savedHint'))
    await navigateTo(`/dm/session/${id}/log/${logId}`)
  } catch (err) {
    apiErrorToast.handle(err)
  } finally {
    isSaving.value = false
  }
}
</script>
