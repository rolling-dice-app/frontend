<template>
  <div class="flex flex-col gap-4 bg-canvas-elevated p-4 sm:p-6 md:flex-row">
    <div class="w-full space-y-6 md:w-2/3">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <label for="char-age" class="mb-1 block text-xs text-content"> 年齡 </label>
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
            @update:model-value="formState.age = parseIntegerInput($event)"
          />
        </div>
        <div>
          <label for="char-height" class="mb-1 block text-xs text-content">身高</label>
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
          <label for="char-weight" class="mb-1 block text-xs text-content">體重</label>
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
        <label for="char-appearance" class="mb-1 block text-xs text-content">外貌</label>
        <div class="border border-primary rounded-md bg-canvas-inset">
          <TextArea
            id="char-appearance"
            class="w-full"
            :border="false"
            :model-value="formState.appearance ?? ''"
            :placeholder="`簡述角色的外貌特，上限 ${APPEARANCE_MAX_LENGTH} 字`"
            :rows="2"
            :maxlength="APPEARANCE_MAX_LENGTH"
            show-count
            @update:model-value="formState.appearance = $event || null"
          />
        </div>
      </div>

      <div>
        <label for="char-story" class="mb-1 block text-xs text-content">故事</label>
        <div class="border border-primary rounded-md bg-canvas-inset">
          <TextArea
            id="char-story"
            class="w-full"
            :border="false"
            :model-value="formState.story ?? ''"
            :placeholder="`角色背景故事設定，上限 ${STORY_MAX_LENGTH} 字`"
            :rows="10"
            :maxlength="STORY_MAX_LENGTH"
            show-count
            @update:model-value="formState.story = $event || null"
          />
        </div>
      </div>
    </div>
    <!-- TODO: F2-M2 角色頭像上傳尚未實作 -->
    <div
      class="w-full flex flex-col items-center justify-center border border-primary rounded-md md:w-1/3 px-1 gap-2"
    >
      <img src="~/assets/images/imbad.png" alt="" loading="lazy" aria-hidden="true" />
      <span class="text-xs text-content-muted">角色圖片上傳（即將推出）</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TextArea } from '@ui'
import type { CharacterFormStateBase } from '~/types/business/character-form'

const APPEARANCE_MAX_LENGTH = 200
const STORY_MAX_LENGTH = 2000

const formState = defineModel<CharacterFormStateBase>('formState', { required: true })
</script>
