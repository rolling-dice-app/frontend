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

    <template v-else-if="status === 'error' || !character">
      <CommonPageHeader :title="character?.name || ''" :show-back="true" />
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
const spellsStore = useCharacterSpellsStore()
const character = computed(() => characterStore.getById(id))

// 與 list / detail 同步：私有資料不進 SSR HTML / payload。
// spells 一併在此預載，讓 child 收到 character + spells 兩個 contract 都「必有值」。
const { status } = useAsyncData(
  () => `character-update-${id}`,
  async () => {
    await Promise.all([characterStore.loadDetail(id), spellsStore.load(id)])
  },
  { server: false, lazy: true, watch: [() => id] },
)
</script>
