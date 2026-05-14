<template>
  <div class="mx-auto max-w-6xl px-4 pb-6">
    <template v-if="status === 'idle' || status === 'pending'">
      <CommonPageHeader title="Edit Character" :show-back="true" />
      <div
        class="flex min-h-[60dvh] items-center justify-center text-content-muted"
        role="status"
        aria-live="polite"
      >
        {{ t('ui.state.loading') }}
      </div>
    </template>

    <template v-else-if="status === 'error' || !character">
      <CommonPageHeader title="Edit Character" :show-back="true" />
      <CommonNotFound
        :message="t('character.notFound')"
        back-to="/character"
        :back-label="t('character.backToList')"
      />
    </template>

    <BusinessCharacterUpdateForm v-else :key="character.id" :character="character" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const route = useRoute()
const id = getRouteParam(route.params.id)

useHead({ title: t('character.editCharacter') })

const characterStore = useCharacterStore()
const character = computed(() => characterStore.getById(id))

// 與 list / detail 同步：私有資料不進 SSR HTML / payload。
const { status } = await useAsyncData(
  () => `character-${id}`,
  () => characterStore.loadDetail(id),
  { server: false, lazy: false, watch: [() => id] },
)
</script>
