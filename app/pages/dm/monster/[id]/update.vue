<template>
  <div>
    <!-- Loading -->
    <template v-if="status === 'idle' || status === 'pending'">
      <CommonPageHeader :title="''" :show-back="true" back-to="/dm/monster" />
      <div
        class="flex min-h-[50dvh] items-center justify-center text-content-muted"
        role="status"
        aria-live="polite"
      >
        {{ t('ui.state.loading') }}
      </div>
    </template>

    <!-- 真 404：模板不存在（或非擁有者） -->
    <template v-else-if="isNotFound">
      <CommonPageHeader :title="''" :show-back="true" back-to="/dm/monster" />
      <CommonNotFound
        :message="t('monster.notFound')"
        back-to="/dm/monster"
        :back-label="t('monster.backToList')"
      />
    </template>

    <!-- 暫時性錯誤：可重試 -->
    <template v-else-if="isTransientError">
      <CommonPageHeader :title="''" :show-back="true" back-to="/dm/monster" />
      <div
        class="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center"
        role="alert"
      >
        <p class="text-danger">{{ t('monster.loadFailed') }}</p>
        <CommonAppButton variant="warning" @click="retryDetail">
          {{ t('ui.state.retry') }}
        </CommonAppButton>
      </div>
    </template>

    <BusinessMonsterForm
      v-else-if="monsterView"
      :key="monsterView.id"
      :monster="monsterView"
      mode="edit"
      @save="onSave"
    />
  </div>
</template>

<script setup lang="ts">
import type { MonsterTemplateView } from '~/types/business/monster'

definePageMeta({
  middleware: 'auth',
  noindex: true,
  key: (route) => route.params.id as string,
})

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const id = getRouteParam(route.params.id)
const apiErrorToast = useApiErrorToast()
const monsterTemplateStore = useMonsterTemplateStore()

useHead({ title: t('monster.editTitle') })

// 與 detail 頁同步：私有資料不進 SSR HTML / payload；PATCH 需要的 updatedAt 由 store detailCache 保管。
const { status, error, refresh } = useAsyncData(
  () => `monster-template-update-${id}`,
  () => monsterTemplateStore.loadDetail(id),
  { server: false, lazy: true },
)

const monsterView = computed<MonsterTemplateView | undefined>(() => {
  const dto = monsterTemplateStore.getById(id)
  return dto ? monsterTemplateToView(dto) : undefined
})

// 真 404 走 NotFound；其餘暫時性錯誤走可重試三態（對齊 detail 頁）。
const isNotFound = computed(
  () =>
    (status.value === 'error' && isFetchError(error.value) && error.value.statusCode === 404) ||
    (status.value === 'success' && !monsterView.value),
)
const isTransientError = computed(() => status.value === 'error' && !isNotFound.value)
const retryDetail = (): void => {
  void refresh()
}

const isSaving = ref(false)

const onSave = async (next: MonsterTemplateView): Promise<void> => {
  if (isSaving.value) return
  isSaving.value = true
  try {
    await monsterTemplateStore.updateMonsterTemplate(id, next)
    toast.success(t('monster.savedHint'))
    await navigateTo('/dm/monster')
  } catch (err) {
    // 撞 STALE_MONSTER_TEMPLATE_VERSION（他端已改）等 race 由 ERROR_MESSAGE_MAP 出專屬 toast
    apiErrorToast.handle(err)
  } finally {
    isSaving.value = false
  }
}
</script>
