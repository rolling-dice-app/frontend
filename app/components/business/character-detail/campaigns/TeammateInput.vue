<template>
  <div class="space-y-2">
    <div class="flex items-end gap-2">
      <div class="flex-1">
        <label :for="inputId" class="mb-1 block text-xs text-content">
          {{ t('character.campaignField.teammates') }}
          <span class="ml-1 text-content-muted">{{ modelValue.length }}/{{ max }}</span>
        </label>
        <CommonAppInput
          :id="inputId"
          v-model="linkInput"
          :radius="0"
          size="sm"
          outline
          :aria-label="t('character.campaignField.teammatesAria')"
          :placeholder="t('character.campaignField.teammatesInputPlaceholder')"
          :disabled="atMax || submitting"
          class="w-full"
          @keydown.enter.prevent="onAdd"
        />
      </div>
      <CommonAppButton
        type="button"
        variant="primary"
        size="sm"
        :disabled="!canAdd || submitting"
        @click="onAdd"
      >
        {{ t('character.campaignField.teammatesAdd') }}
      </CommonAppButton>
    </div>

    <ul v-if="modelValue.length > 0" role="list" class="flex flex-wrap items-center gap-1.5">
      <li
        v-for="(teammate, index) in modelValue"
        :key="teammate.shareId"
        role="listitem"
        :class="[
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs',
          teammate.available
            ? 'border-border-soft bg-surface-2 text-content'
            : 'border-border-soft bg-surface text-content-muted',
        ]"
      >
        <img
          v-if="teammate.available && teammate.avatar"
          :src="teammate.avatar"
          :alt="teammate.name ?? ''"
          class="size-4 rounded-full object-cover"
          loading="lazy"
        />
        <span
          v-else
          aria-hidden="true"
          class="flex size-4 items-center justify-center rounded-full bg-surface-raised text-content-muted"
        >
          <Icon name="user" :size="10" />
        </span>

        <span class="max-w-32 truncate">
          {{
            teammate.available
              ? (teammate.name ?? teammate.shareId)
              : t('character.campaignField.teammateUnavailable')
          }}
        </span>
        <span v-if="teammate.available && teammate.ownerDisplayName" class="text-content-muted">
          · {{ teammate.ownerDisplayName }}
        </span>

        <button
          type="button"
          :aria-label="`${t('ui.action.delete')} ${teammate.name ?? teammate.shareId}`"
          class="flex size-4 items-center justify-center rounded-full text-content-muted hover:text-danger"
          @click="onRemove(index)"
        >
          <Icon name="close" :size="10" />
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import type { SharedCharacterPreviewDTO } from '@rolling-dice-app/core'
import { parseShareIdFromLink } from '~/utils/parseShareId'

const { t } = useI18n()
const toast = useToast()
const apiErrorToast = useApiErrorToast()

const props = defineProps<{
  modelValue: SharedCharacterPreviewDTO[]
  max: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SharedCharacterPreviewDTO[]]
}>()

const inputId = useId()
const linkInput = ref('')
const submitting = ref(false)

const atMax = computed(() => props.modelValue.length >= props.max)
const canAdd = computed(() => !atMax.value && linkInput.value.trim() !== '')

const onAdd = async (): Promise<void> => {
  if (!canAdd.value || submitting.value) return

  const shareId = parseShareIdFromLink(linkInput.value)
  if (!shareId) {
    toast.error(t('character.campaignField.teammatesInvalidLink'), { kind: 'hint' })
    return
  }
  if (props.modelValue.some((t2) => t2.shareId === shareId)) {
    toast.info(t('character.campaignField.teammatesDuplicate'), { kind: 'hint' })
    return
  }
  if (atMax.value) {
    toast.info(t('character.campaignField.teammatesLimitReached'), { kind: 'hint' })
    return
  }

  submitting.value = true
  try {
    const { previews } = await share().resolveSharedCharacters([shareId])
    const preview = previews[0]
    if (!preview) return
    emit('update:modelValue', [...props.modelValue, preview])
    linkInput.value = ''
  } catch (err) {
    apiErrorToast.handle(err)
  } finally {
    submitting.value = false
  }
}

const onRemove = (index: number): void => {
  const next = props.modelValue.slice()
  next.splice(index, 1)
  emit('update:modelValue', next)
}
</script>
