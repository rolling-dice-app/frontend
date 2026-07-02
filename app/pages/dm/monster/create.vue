<template>
  <BusinessMonsterForm :monster="draft" mode="create" @save="onSave" />
</template>

<script setup lang="ts">
import { addMonsterTemplate, buildDefaultMonsterView } from '~/mocks/monster-templates'
import type { MonsterTemplateView } from '~/types/business/monster'

definePageMeta({ middleware: 'auth', noindex: true })

const { t } = useI18n()
const toast = useToast()

useHead({ title: t('monster.createTitle') })

// 本地草稿；存檔前不落 mock，中途離開不留空白怪物。
const draft = buildDefaultMonsterView()

const onSave = (next: MonsterTemplateView): void => {
  addMonsterTemplate(next)
  toast.success(t('monster.savedHint'))
  void navigateTo('/dm/monster')
}
</script>
