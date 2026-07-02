<template>
  <div>
    <CommonPageHeader :title="pageTitle" :show-back="true">
      <template #actions>
        <CommonAppButton
          variant="primary"
          :disabled="!canSubmit"
          class="ml-auto min-w-22 whitespace-nowrap"
          @click="onSave"
        >
          {{ t('ui.action.save') }}
        </CommonAppButton>
      </template>
    </CommonPageHeader>

    <div
      class="divide-y divide-divider rounded-lg border border-border-soft bg-canvas-elevated p-4 sm:p-6"
    >
      <div class="py-6 first:pt-0 last:pb-0">
        <BusinessMonsterFormBasicTab v-model:form-state="formState" />
      </div>
      <div class="py-6 first:pt-0 last:pb-0">
        <div class="grid gap-6 lg:grid-cols-2">
          <BusinessMonsterFormAbilitiesPanel v-model:form-state="formState" />
          <BusinessMonsterFormSkillsPanel v-model:form-state="formState" />
        </div>
      </div>
      <div class="py-6 first:pt-0 last:pb-0">
        <BusinessMonsterFormTraitsTextPanel v-model:form-state="formState" />
      </div>
      <div class="py-6 first:pt-0 last:pb-0">
        <BusinessMonsterFormAttackList v-model:form-state="formState" />
      </div>
      <div class="py-6 first:pt-0 last:pb-0">
        <BusinessMonsterFormFeatureList v-model:form-state="formState" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MonsterTemplateFormState, MonsterTemplateView } from '~/types/business/monster'

const props = withDefaults(
  defineProps<{ monster: MonsterTemplateView; mode?: 'create' | 'edit' }>(),
  { mode: 'edit' },
)

const emit = defineEmits<{ save: [value: MonsterTemplateView] }>()

const { t } = useI18n()

// 從 view 深拷一份本地 form state；本階段不接後端，提交只回拋給頁面做示意。
const formState = reactive<MonsterTemplateFormState>(structuredClone(toRaw(props.monster)))

const pageTitle = computed(
  () =>
    formState.name.trim() ||
    (props.mode === 'create' ? t('monster.createTitle') : t('monster.editTitle')),
)

const canSubmit = computed(() => formState.name.trim().length > 0)

const onSave = (): void => {
  if (!canSubmit.value) return
  emit('save', structuredClone(toRaw(formState)))
}
</script>
