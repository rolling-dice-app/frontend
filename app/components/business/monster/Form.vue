<template>
  <div>
    <CommonPageHeader :title="pageTitle" :show-back="true">
      <template #actions>
        <CommonAppButton
          variant="primary"
          :disabled="!canSubmit"
          class="ml-auto min-w-22 whitespace-nowrap"
          data-testid="monster-save"
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

/**
 * 脫勾副本。用 JSON round-trip 而非 structuredClone(toRaw(...))：`toRaw` 只剝一層，
 * 子面板若整包替換（`{ ...formState, name }`），巢狀值仍是 reactive proxy，
 * structuredClone 會丟 DataCloneError 讓儲存整條靜默失敗。form state 契約本就是純 JSON。
 */
const cloneFormState = (source: MonsterTemplateFormState): MonsterTemplateFormState =>
  JSON.parse(JSON.stringify(source)) as MonsterTemplateFormState

const props = withDefaults(
  defineProps<{ monster: MonsterTemplateView; mode?: 'create' | 'edit' }>(),
  { mode: 'edit' },
)

const emit = defineEmits<{ save: [value: MonsterTemplateView] }>()

const { t } = useI18n()

// 從 view 深拷一份本地 form state；提交時回拋給頁面，由頁面呼叫 store 打後端。
// 必須是 ref 而非 reactive：子面板以 defineModel 綁 `v-model:form-state`，
// 編譯出的 `onUpdate:formState` 是 `_isRef(formState) ? formState.value = $event : null` ——
// 綁在 reactive 上時整包賦值會是編譯期 no-op，改動靜默消失且型別檢查照過。
const formState = ref<MonsterTemplateFormState>(cloneFormState(props.monster))

const pageTitle = computed(
  () =>
    formState.value.name.trim() ||
    (props.mode === 'create' ? t('monster.createTitle') : t('monster.editTitle')),
)

const canSubmit = computed(() => formState.value.name.trim().length > 0)

const onSave = (): void => {
  if (!canSubmit.value) return
  emit('save', cloneFormState(formState.value))
}
</script>
