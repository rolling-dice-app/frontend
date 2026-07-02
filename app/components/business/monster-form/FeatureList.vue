<template>
  <div>
    <section aria-labelledby="monster-section-features">
      <h3 id="monster-section-features" class="mb-3 font-display text-base font-bold text-content">
        {{ t('monster.field.features') }}
      </h3>

      <ul class="space-y-2">
        <li>
          <button
            type="button"
            :aria-label="t('monster.addFeature')"
            class="flex w-full items-center justify-center rounded-lg border border-dashed border-border-soft py-4 text-content-muted transition-colors duration-150 hover:border-border hover:bg-surface hover:text-content"
            @click="openCreate"
          >
            <span class="text-xl leading-none">+</span>
          </button>
        </li>

        <li
          v-for="feature in formState.features"
          :key="feature.id"
          class="flex items-start justify-between gap-2 rounded-lg border border-border-soft bg-surface px-3 py-2"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-content">{{ feature.name }}</p>
            <p
              v-if="feature.description"
              class="mt-1 line-clamp-2 text-xs whitespace-pre-line text-content-muted"
            >
              {{ feature.description }}
            </p>
          </div>
          <div class="flex shrink-0 gap-2">
            <button
              type="button"
              :aria-label="`${t('ui.action.edit')} ${feature.name || t('monster.thisFeature')}`"
              class="flex size-8 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-raised hover:text-content"
              @click="openEdit(feature)"
            >
              <Icon name="edit" :size="16" />
            </button>
            <button
              type="button"
              :aria-label="`${t('ui.action.delete')} ${feature.name || t('monster.thisFeature')}`"
              class="flex size-8 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:text-danger-hover"
              @click="removeFeature(feature.id)"
            >
              <Icon name="trash" :size="16" />
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- 新增 / 編輯 特性 Modal -->
    <Modal
      v-model="modalOpen"
      :title="`${editingId ? t('ui.action.edit') : t('ui.action.add')}${t('monster.field.features')}`"
      size="md"
      bg-color="var(--color-canvas-elevated)"
      text-color="var(--color-content)"
      border-color="var(--color-border)"
    >
      <div class="space-y-5">
        <div>
          <label for="monster-feature-name" class="mb-1 block text-xs text-content">
            {{ t('monster.featureName') }}
            <span class="text-danger">*</span>
          </label>
          <CommonAppInput
            id="monster-feature-name"
            :radius="0"
            :model-value="draft.name"
            :maxlength="CHARACTER_TEXT_LIMITS.SHORT"
            size="sm"
            outline
            class="w-full"
            @update:model-value="draft.name = $event"
          />
        </div>

        <div>
          <label for="monster-feature-description" class="mb-1 block text-xs text-content">
            {{ t('monster.featureDescription') }}
          </label>
          <div class="rounded-md border border-primary bg-canvas-inset">
            <TextArea
              id="monster-feature-description"
              class="w-full"
              :border="false"
              :model-value="draft.description ?? ''"
              :rows="4"
              max-height="10rem"
              :maxlength="CHARACTER_TEXT_LIMITS.MEDIUM"
              show-count
              :placeholder="t('monster.featureDescriptionPlaceholder')"
              @update:model-value="draft.description = $event ? $event : null"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <CommonAppButton variant="primary" :disabled="!draft.name.trim()" @click="save">
          {{ t('ui.action.confirm') }}
        </CommonAppButton>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { Icon, Modal, TextArea } from '@ui'
import { CHARACTER_TEXT_LIMITS } from '@rolling-dice-app/core'
import type {
  MonsterFeature,
  MonsterFeatureDraft,
  MonsterTemplateFormState,
} from '~/types/business/monster'

const { t } = useI18n()
const toast = useToast()

const formState = defineModel<MonsterTemplateFormState>('formState', { required: true })

// TODO(串接階段): 改用 VALIDATION_LIMITS.maxFeaturesPerMonsterTemplate。
const MAX_FEATURES = 10

const modalOpen = ref(false)
const editingId = ref<string | null>(null)

const createEmptyDraft = (): MonsterFeatureDraft => ({ name: '', description: null })

const draft = ref<MonsterFeatureDraft>(createEmptyDraft())

watch(modalOpen, (open) => {
  if (!open) {
    editingId.value = null
    draft.value = createEmptyDraft()
  }
})

const openCreate = (): void => {
  if (formState.value.features.length >= MAX_FEATURES) {
    toast.info(t('monster.featureLimitReached'), { kind: 'hint' })
    return
  }
  editingId.value = null
  draft.value = createEmptyDraft()
  modalOpen.value = true
}

const openEdit = (feature: MonsterFeature): void => {
  editingId.value = feature.id
  draft.value = { name: feature.name, description: feature.description }
  modalOpen.value = true
}

const removeFeature = (id: string): void => {
  const index = formState.value.features.findIndex((f) => f.id === id)
  if (index !== -1) formState.value.features.splice(index, 1)
}

const save = (): void => {
  const payload: MonsterFeatureDraft = {
    name: cleanText(draft.value.name),
    description: cleanTextOrNull(draft.value.description),
  }
  if (editingId.value) {
    const index = formState.value.features.findIndex((f) => f.id === editingId.value)
    if (index !== -1) formState.value.features[index] = { id: editingId.value, ...payload }
  } else {
    formState.value.features.push({ id: crypto.randomUUID(), ...payload })
  }
  modalOpen.value = false
}
</script>
