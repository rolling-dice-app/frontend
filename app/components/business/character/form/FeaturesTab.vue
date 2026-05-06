<template>
  <div class="bg-canvas-elevated p-4 sm:p-6">
    <section aria-labelledby="section-features">
      <ul class="space-y-2">
        <li>
          <button
            type="button"
            aria-label="新增特性"
            class="flex w-full items-center justify-center rounded-lg border border-dashed border-border-soft py-4 text-content-muted transition-colors duration-150 hover:border-border hover:bg-surface hover:text-content"
            @click="openCreate"
          >
            <span class="text-xl leading-none">+</span>
          </button>
        </li>

        <li
          v-for="(feature, index) in formState.features"
          :key="feature.id"
          draggable="true"
          class="relative flex items-start justify-between gap-2 rounded-lg border border-border-soft bg-surface px-3 py-2"
          :class="{
            'opacity-50': draggingId === feature.id,
            'before:absolute before:inset-x-0 before:-top-1 before:h-0.5 before:rounded-full before:bg-primary':
              overId === feature.id && draggingId !== feature.id,
          }"
          @dragstart="onDragStart($event, feature.id, index)"
          @dragenter="onDragEnter(feature.id)"
          @dragover.prevent="onDragOver($event)"
          @drop.prevent="onDrop($event, index)"
          @dragend="onDragEnd"
        >
          <div
            class="flex shrink-0 cursor-grab items-center self-stretch text-content-muted active:cursor-grabbing"
            aria-hidden="true"
          >
            <Icon name="list" :size="14" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-semibold text-content">{{ feature.name }}</p>
              <Badge
                size="sm"
                :bg-color="FEATURE_SOURCE_BADGE_STYLES[feature.source].bgColor"
                :text-color="FEATURE_SOURCE_BADGE_STYLES[feature.source].textColor"
              >
                {{ FEATURE_SOURCE_LABELS[feature.source] }}
              </Badge>
              <Badge v-if="feature.usage.hasUses" size="sm" bg-color="var(--color-surface-3)">
                {{ FEATURE_RECOVERY_LABELS[feature.usage.recovery] }} / {{ feature.usage.max }} 次
              </Badge>
            </div>
            <p
              v-if="feature.description"
              class="mt-1 line-clamp-2 text-xs whitespace-pre-line text-content-muted"
            >
              {{ feature.description }}
            </p>
          </div>
          <div class="flex shrink-0 gap-1">
            <button
              type="button"
              :aria-label="`編輯 ${feature.name || '此特性'}`"
              class="flex size-8 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-raised hover:text-content"
              @click="openEdit(feature)"
            >
              <Icon name="edit" :size="16" />
            </button>
            <button
              type="button"
              :aria-label="`刪除 ${feature.name || '此特性'}`"
              class="flex size-8 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:text-danger-hover"
              @click="removeFeature(feature.id)"
            >
              <Icon name="trash" :size="16" />
            </button>
          </div>
        </li>
      </ul>
    </section>

    <Modal
      v-model="modalOpen"
      :title="`${editingId ? '編輯' : '新增'}特性`"
      size="md"
      bg-color="var(--color-canvas-elevated)"
      text-color="var(--color-content)"
      border-color="var(--color-border)"
    >
      <div class="space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-end gap-3">
          <div class="flex-1">
            <label for="feature-modal-name" class="mb-1 block text-xs text-content">名稱</label>
            <CommonAppInput
              id="feature-modal-name"
              :radius="0"
              :model-value="draft.name"
              size="sm"
              outline
              class="w-full"
              @update:model-value="draft.name = $event"
            />
          </div>
          <div>
            <label for="feature-modal-source" class="mb-1 block text-xs text-content">來源</label>
            <CommonAppSelect
              id="feature-modal-source"
              :model-value="draft.source"
              :options="sourceOptions"
              size="sm"
              class="w-28"
              @update:model-value="draft.source = $event as FeatureSource"
            />
          </div>
        </div>

        <div>
          <label for="feature-modal-description" class="mb-1 block text-xs text-content">
            描述
          </label>
          <div class="rounded-md border border-primary bg-canvas-inset">
            <TextArea
              id="feature-modal-description"
              class="w-full"
              :border="false"
              :model-value="draft.description ?? ''"
              :rows="3"
              :maxlength="DESCRIPTION_MAX_LENGTH"
              show-count
              placeholder="特性效果說明（選填）"
              @update:model-value="draft.description = $event ? $event : null"
            />
          </div>
        </div>

        <div class="rounded-lg border border-border-soft bg-canvas px-3 py-3">
          <label class="flex items-center gap-2">
            <Checkbox
              :model-value="draft.usage.hasUses"
              size="sm"
              color="var(--color-primary)"
              aria-label="此特性具有使用次數"
              @update:model-value="onToggleHasUses"
            />
            <span class="text-sm text-content">具有使用次數</span>
          </label>

          <div v-if="draft.usage.hasUses" class="mt-3 flex flex-wrap items-end gap-4">
            <div>
              <label for="feature-modal-max" class="mb-1 block text-xs text-content">
                最大次數
              </label>
              <CommonAppInput
                id="feature-modal-max"
                :radius="0"
                :model-value="String(draft.usage.max)"
                type="number"
                min="1"
                step="1"
                size="sm"
                outline
                class="w-20"
                @update:model-value="onUpdateMax"
              />
            </div>
            <div>
              <span class="mb-1 block text-xs text-content">恢復時機</span>
              <div
                role="radiogroup"
                aria-label="恢復時機"
                class="inline-flex rounded-md border border-border-soft bg-canvas-inset p-0.5"
              >
                <button
                  v-for="option in recoveryOptions"
                  :key="option.value"
                  type="button"
                  role="radio"
                  :aria-checked="draft.usage.hasUses && draft.usage.recovery === option.value"
                  class="rounded px-3 py-1 text-xs transition-colors duration-150"
                  :class="
                    draft.usage.hasUses && draft.usage.recovery === option.value
                      ? 'bg-primary text-content-inverse'
                      : 'text-content-muted hover:bg-surface hover:text-content'
                  "
                  @click="onUpdateRecovery(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button
          :radius="4"
          :disabled="!draft.name.trim()"
          bg-color="var(--color-primary)"
          @click="save"
        >
          確認
        </Button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { Badge, Button, Checkbox, Icon, Modal, TextArea } from '@ui'
import type { SelectOption } from '@ui'
import {
  FEATURE_RECOVERY_LABELS,
  FEATURE_SOURCE_BADGE_STYLES,
  FEATURE_SOURCE_LABELS,
} from '~/constants/features'
import type { CharacterFeature, FeatureSource, FeatureUsageRecovery } from '@rolling-dice-app/core'
import type { CharacterUpdateFormState, FeatureDraft } from '~/types/business/character-form'

const DESCRIPTION_MAX_LENGTH = 500

const sourceOptions: SelectOption[] = (
  Object.entries(FEATURE_SOURCE_LABELS) as [FeatureSource, string][]
).map(([value, label]) => ({ value, label }))

const recoveryOptions: Array<{ value: FeatureUsageRecovery; label: string }> = (
  Object.entries(FEATURE_RECOVERY_LABELS) as [FeatureUsageRecovery, string][]
).map(([value, label]) => ({ value, label }))

const formState = defineModel<CharacterUpdateFormState>('formState', { required: true })
const { addFeature, removeFeature, updateFeature, moveFeature } = useCharacterFeaturesForm(
  formState.value,
)

const draggingId = ref<string | null>(null)
const overId = ref<string | null>(null)

const onDragStart = (event: DragEvent, id: string, index: number): void => {
  draggingId.value = id
  event.dataTransfer?.setData('application/json', JSON.stringify({ id, index }))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

const onDragEnter = (id: string): void => {
  overId.value = id
}

const onDragOver = (event: DragEvent): void => {
  event.preventDefault()
}

const onDrop = (event: DragEvent, targetIndex: number): void => {
  const raw = event.dataTransfer?.getData('application/json')
  draggingId.value = null
  overId.value = null
  if (!raw) return
  let payload: { id: string; index: number }
  try {
    payload = JSON.parse(raw) as { id: string; index: number }
  } catch {
    return
  }
  if (typeof payload?.index !== 'number') return
  if (payload.index === targetIndex) return
  moveFeature(payload.index, targetIndex)
}

const onDragEnd = (): void => {
  draggingId.value = null
  overId.value = null
}

const modalOpen = ref(false)
const editingId = ref<string | null>(null)

const createEmptyDraft = (): FeatureDraft => {
  return {
    name: '',
    description: null,
    source: 'class',
    usage: { hasUses: false },
  }
}

const draft = ref<FeatureDraft>(createEmptyDraft())

watch(modalOpen, (open) => {
  if (!open) {
    editingId.value = null
    draft.value = createEmptyDraft()
  }
})

const openCreate = (): void => {
  editingId.value = null
  draft.value = createEmptyDraft()
  modalOpen.value = true
}

const openEdit = (feature: CharacterFeature): void => {
  editingId.value = feature.id
  draft.value = {
    name: feature.name,
    description: feature.description,
    source: feature.source,
    usage: { ...feature.usage },
  }
  modalOpen.value = true
}

const onToggleHasUses = (checked: boolean): void => {
  draft.value.usage = checked
    ? { hasUses: true, max: 1, recovery: 'shortRest' }
    : { hasUses: false }
}

const onUpdateMax = (value: string): void => {
  if (!draft.value.usage.hasUses) return
  draft.value.usage.max = Math.max(1, parseIntegerInput(value, 1))
}

const onUpdateRecovery = (value: FeatureUsageRecovery): void => {
  if (!draft.value.usage.hasUses) return
  draft.value.usage.recovery = value
}

const save = (): void => {
  const payload: FeatureDraft = {
    name: draft.value.name.trim(),
    description: draft.value.description,
    source: draft.value.source,
    usage: { ...draft.value.usage },
  }
  if (editingId.value) {
    updateFeature(editingId.value, payload)
  } else {
    addFeature(payload)
  }
  modalOpen.value = false
}
</script>
