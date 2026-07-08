<template>
  <BusinessMonsterForm :monster="draft" mode="create" @save="onSave" />
</template>

<script setup lang="ts">
import type { MonsterTemplateView } from '~/types/business/monster'

definePageMeta({ middleware: ['auth', 'monster-template-limit'], noindex: true })

const { t } = useI18n()
const toast = useToast()
const apiErrorToast = useApiErrorToast()
const monsterTemplateStore = useMonsterTemplateStore()

useHead({ title: t('monster.createTitle') })

// 本地草稿；存檔成功前不落 API，中途離開不留空白怪物。
const draft = buildDefaultMonsterView()

const isSaving = ref(false)

const onSave = async (next: MonsterTemplateView): Promise<void> => {
  if (isSaving.value) return
  isSaving.value = true
  try {
    await monsterTemplateStore.createMonsterTemplate(next)
    toast.success(t('monster.savedHint'))
    await navigateTo('/dm/monster')
  } catch (err) {
    // plan-limit race（入口攔截後仍被搶滿）與 validation 漏網走統一 toast
    apiErrorToast.handle(err)
  } finally {
    isSaving.value = false
  }
}
</script>
