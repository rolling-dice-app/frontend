<template>
  <section aria-labelledby="monster-section-skills">
    <h3 id="monster-section-skills" class="mb-3 font-display text-base font-bold text-content">
      {{ t('monster.field.skills') }}
    </h3>

    <div class="grid grid-cols-1 gap-x-6 gap-2 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-9">
      <div v-for="key in SKILL_KEYS" :key="key" class="flex items-center gap-2">
        <label :for="`monster-skill-${key}`" class="flex-1 text-xs text-content">
          {{ t(`skill.label.${key}`) }}
        </label>
        <CommonAppInput
          :id="`monster-skill-${key}`"
          :radius="0"
          :model-value="formState.skills[key] != null ? String(formState.skills[key]) : ''"
          type="number"
          size="sm"
          outline
          placeholder="±0"
          class="w-16"
          @update:model-value="onSkillInput(key, $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { CHARACTER_INT_LIMITS, SKILL_KEYS, type SkillKey } from '@rolling-dice-app/core'
import type { MonsterTemplateFormState } from '~/types/business/monster'

const { t } = useI18n()

const formState = defineModel<MonsterTemplateFormState>('formState', { required: true })

/** DTO 語意為「只列有的」：清空輸入時移除 key，而非留下 0 值。 */
const onSkillInput = (key: SkillKey, raw: string): void => {
  if (raw.trim() === '') {
    const { [key]: _removed, ...rest } = formState.value.skills
    formState.value.skills = rest
    return
  }
  formState.value.skills[key] = parseIntegerInput(raw, 0, CHARACTER_INT_LIMITS.SMALL_INT_MAX)
}
</script>
