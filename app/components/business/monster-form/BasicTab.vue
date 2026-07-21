<template>
  <section aria-labelledby="monster-section-identity">
    <h3 id="monster-section-identity" class="mb-3 font-display text-base font-bold text-content">
      {{ t('monster.formGroup.identity') }}
    </h3>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <!-- 名稱 -->
      <div>
        <label for="monster-name" class="mb-1 block text-xs text-content">
          {{ t('monster.field.name') }}
          <span class="text-danger">*</span>
        </label>
        <CommonAppInput
          id="monster-name"
          :radius="0"
          :model-value="formState.name"
          :maxlength="CHARACTER_TEXT_LIMITS.SHORT"
          size="sm"
          outline
          class="w-full"
          @update:model-value="formState.name = $event"
        />
      </div>

      <!-- 體型 -->
      <div>
        <label for="monster-size" class="mb-1 block text-xs text-content">
          {{ t('monster.field.size') }}
        </label>
        <CommonAppSelect
          id="monster-size"
          :model-value="formState.size ?? ''"
          :options="sizeOptions"
          size="sm"
          class="w-full"
          @update:model-value="formState.size = ($event || null) as SizeKey | null"
        />
      </div>

      <!-- 陣營 -->
      <div>
        <label for="monster-alignment" class="mb-1 block text-xs text-content">
          {{ t('monster.field.alignment') }}
        </label>
        <CommonAppSelect
          id="monster-alignment"
          :model-value="formState.alignment ?? ''"
          :options="alignmentOptions"
          size="sm"
          class="w-full"
          @update:model-value="formState.alignment = ($event || null) as AlignmentKey | null"
        />
      </div>

      <!-- 挑戰等級 -->
      <div>
        <label for="monster-cr" class="mb-1 block text-xs text-content">
          {{ t('monster.field.challengeRating') }}
        </label>
        <CommonAppInput
          id="monster-cr"
          :radius="0"
          :model-value="formState.challengeRating ?? ''"
          :maxlength="CHARACTER_TEXT_LIMITS.TINY"
          size="sm"
          outline
          class="w-full"
          :placeholder="t('monster.placeholder.challengeRating')"
          @update:model-value="formState.challengeRating = $event ? $event : null"
        />
      </div>

      <!-- 生命值 -->
      <div>
        <label for="monster-hp" class="mb-1 block text-xs text-content">
          {{ t('monster.field.hp') }}
        </label>
        <CommonAppInput
          id="monster-hp"
          :radius="0"
          :model-value="String(formState.hp)"
          type="number"
          size="sm"
          outline
          class="w-full"
          @update:model-value="
            formState.hp = Math.max(
              0,
              parseIntegerInput($event, 0, CHARACTER_INT_LIMITS.GENERAL_INT_MAX),
            )
          "
        />
      </div>

      <!-- 先攻加值 -->
      <div>
        <label for="monster-initiative" class="mb-1 block text-xs text-content">
          {{ t('monster.field.initiative') }}
        </label>
        <CommonAppInput
          id="monster-initiative"
          :radius="0"
          :model-value="String(formState.initiativeBonus)"
          type="number"
          size="sm"
          outline
          class="w-full"
          placeholder="0"
          @update:model-value="
            formState.initiativeBonus = parseIntegerInput(
              $event,
              0,
              CHARACTER_INT_LIMITS.SMALL_INT_MAX,
            )
          "
        />
      </div>

      <!-- 護甲等級 -->
      <div>
        <label for="monster-ac" class="mb-1 block text-xs text-content">
          {{ t('monster.field.ac') }}
        </label>
        <CommonAppInput
          id="monster-ac"
          :radius="0"
          :model-value="String(formState.ac)"
          type="number"
          size="sm"
          outline
          class="w-full"
          @update:model-value="
            formState.ac = Math.max(
              0,
              parseIntegerInput($event, 0, CHARACTER_INT_LIMITS.SMALL_INT_MAX),
            )
          "
        />
      </div>

      <!-- 速度 -->
      <div>
        <label for="monster-speed" class="mb-1 block text-xs text-content">
          {{ t('monster.field.speed') }}（{{ t('combat.unitFeet') }}）
        </label>
        <CommonAppInput
          id="monster-speed"
          :radius="0"
          :model-value="String(formState.speed)"
          type="number"
          size="sm"
          outline
          class="w-full"
          @update:model-value="
            formState.speed = Math.max(
              0,
              parseIntegerInput($event, 0, CHARACTER_INT_LIMITS.SMALL_INT_MAX),
            )
          "
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { SelectOption } from '@ui'
import {
  ALIGNMENT_KEYS,
  CHARACTER_INT_LIMITS,
  CHARACTER_TEXT_LIMITS,
  SIZE_KEYS,
  type AlignmentKey,
  type SizeKey,
} from '@rolling-dice-app/core'
import type { MonsterTemplateFormState } from '~/types/business/monster'

const { t } = useI18n()

const formState = defineModel<MonsterTemplateFormState>('formState', { required: true })

const sizeOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('monster.emptyDash') },
  ...SIZE_KEYS.map((key) => ({ value: key, label: t(`character.size.${key}`) })),
])

const alignmentOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('monster.emptyDash') },
  ...ALIGNMENT_KEYS.map((key) => ({ value: key, label: t(`character.alignment.${key}`) })),
])
</script>
