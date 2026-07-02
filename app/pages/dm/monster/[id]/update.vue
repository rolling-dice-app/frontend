<template>
  <div>
    <template v-if="!monster">
      <CommonPageHeader :title="''" :show-back="true" back-to="/dm/monster" />
      <CommonNotFound
        :message="t('monster.notFound')"
        back-to="/dm/monster"
        :back-label="t('monster.backToList')"
      />
    </template>

    <BusinessMonsterForm v-else :key="monster.id" :monster="monster" mode="edit" @save="onSave" />
  </div>
</template>

<script setup lang="ts">
import { getMonsterTemplate, saveMonsterTemplate } from '~/mocks/monster-templates'
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

useHead({ title: t('monster.editTitle') })

const monster = computed(() => getMonsterTemplate(id))

// 本階段不送後端：示意寫回 mock，提示後導回列表。
const onSave = (next: MonsterTemplateView): void => {
  saveMonsterTemplate(next)
  toast.success(t('monster.savedHint'))
  void navigateTo('/dm/monster')
}
</script>
