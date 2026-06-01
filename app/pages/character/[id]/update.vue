<template>
  <div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
    <template v-if="status === 'idle' || status === 'pending'">
      <CommonPageHeader :title="character?.name || ''" :show-back="true" />
      <div
        class="flex min-h-[60dvh] items-center justify-center text-content-muted"
        role="status"
        aria-live="polite"
      >
        {{ t('ui.state.loading') }}
      </div>
    </template>

    <template v-else-if="isNotFound">
      <CommonPageHeader :title="character?.name || ''" :show-back="true" />
      <CommonNotFound
        :message="t('character.notFound')"
        back-to="/character"
        :back-label="t('character.backToList')"
      />
    </template>

    <template v-else-if="isTransientError">
      <CommonPageHeader :title="character?.name || ''" :show-back="true" />
      <div
        class="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center"
        role="alert"
      >
        <p class="text-danger">{{ t('ui.state.loadFailed') }}</p>
        <CommonAppButton variant="warning" @click="retryDetail">
          {{ t('ui.state.retry') }}
        </CommonAppButton>
      </div>
    </template>

    <BusinessCharacterUpdateForm v-else-if="character" :key="character.id" :character="character" />
  </div>
</template>

<script setup lang="ts">
// key 綁 route.params.id：與 detail 頁同步，route 變動走整頁 remount，id 在本次 mount 內恆定。
definePageMeta({
  middleware: 'auth',
  noindex: true,
  key: (route) => route.params.id as string,
})

const { t } = useI18n()
const route = useRoute()
const id = getRouteParam(route.params.id)

useHead({ title: t('character.editCharacter') })

const characterStore = useCharacterStore()
const spellsStore = useCharacterSpellsStore()
const character = computed(() => characterStore.getById(id))

// 與 list / detail 同步：私有資料不進 SSR HTML / payload。
// spells 一併在此預載，讓 child 收到 character + spells 兩個 contract 都「必有值」。
const { status, error, refresh } = useAsyncData(
  () => `character-update-${id}`,
  async () => {
    await Promise.all([characterStore.loadDetail(id), spellsStore.load(id)])
  },
  { server: false, lazy: true },
)

// 真 404 走 NotFound；其餘暫時性錯誤走可重試三態（對齊 detail 頁）。
const isNotFound = computed(
  () =>
    (status.value === 'error' && isFetchError(error.value) && error.value.statusCode === 404) ||
    (status.value === 'success' && !character.value),
)
const isTransientError = computed(() => status.value === 'error' && !isNotFound.value)
const retryDetail = (): void => {
  void refresh()
}
</script>
