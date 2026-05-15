<template>
  <div class="flex flex-col gap-4 bg-canvas-elevated p-4 sm:p-6 md:flex-row">
    <div class="w-full space-y-6 md:w-2/3">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <label for="char-age" class="mb-1 block text-xs text-content">
            {{ t('character.age') }}
          </label>
          <CommonAppInput
            id="char-age"
            type="number"
            min="0"
            max="9999"
            step="1"
            class="w-full"
            :radius="0"
            :model-value="formState.age !== null ? String(formState.age) : ''"
            size="sm"
            outline
            @update:model-value="
              formState.age = parseIntegerInput(
                $event,
                undefined,
                CHARACTER_INT_LIMITS.GENERAL_INT_MAX,
              )
            "
          />
        </div>
        <div>
          <label for="char-height" class="mb-1 block text-xs text-content">
            {{ t('character.height') }}
          </label>
          <CommonAppInput
            id="char-height"
            class="w-full"
            :radius="0"
            :model-value="formState.height ?? ''"
            size="sm"
            outline
            @update:model-value="formState.height = $event || null"
          />
        </div>
        <div>
          <label for="char-weight" class="mb-1 block text-xs text-content">
            {{ t('character.weight') }}
          </label>
          <CommonAppInput
            id="char-weight"
            class="w-full"
            :radius="0"
            :model-value="formState.weight ?? ''"
            size="sm"
            outline
            @update:model-value="formState.weight = $event || null"
          />
        </div>
      </div>

      <div>
        <label for="char-appearance" class="mb-1 block text-xs text-content">
          {{ t('character.appearance') }}
        </label>
        <div class="border border-primary rounded-md bg-canvas-inset">
          <TextArea
            id="char-appearance"
            class="w-full"
            :border="false"
            :model-value="formState.appearance ?? ''"
            :placeholder="`${t('character.appearancePlaceholder')}${CHARACTER_TEXT_LIMITS.MEDIUM} ${t('character.storyPlaceholderUnit')}`"
            :rows="2"
            :maxlength="CHARACTER_TEXT_LIMITS.MEDIUM"
            show-count
            @update:model-value="formState.appearance = $event || null"
          />
        </div>
      </div>

      <div>
        <label for="char-story" class="mb-1 block text-xs text-content">
          {{ t('character.story') }}
        </label>
        <div class="border border-primary rounded-md bg-canvas-inset">
          <TextArea
            id="char-story"
            class="w-full"
            :border="false"
            :model-value="formState.story ?? ''"
            :placeholder="`${t('character.storyPlaceholder')}${CHARACTER_TEXT_LIMITS.LONG} ${t('character.storyPlaceholderUnit')}`"
            :rows="10"
            :maxlength="CHARACTER_TEXT_LIMITS.LONG"
            show-count
            @update:model-value="formState.story = $event || null"
          />
        </div>
      </div>
    </div>
    <div class="w-full md:w-1/3">
      <BusinessCharacterFormPortraitUploader v-model="formState.avatar" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { TextArea } from '@ui'
import { CHARACTER_INT_LIMITS, CHARACTER_TEXT_LIMITS } from '@rolling-dice-app/core'
import type { CharacterFormStateBase } from '~/types/business/character-form'

const { t } = useI18n()

const formState = defineModel<CharacterFormStateBase>('formState', { required: true })
</script>
