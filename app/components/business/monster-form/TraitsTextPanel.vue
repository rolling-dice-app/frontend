<template>
  <section aria-labelledby="monster-section-traits" class="grid gap-4 lg:grid-cols-2">
    <h3
      id="monster-section-traits"
      class="font-display text-base font-bold text-content lg:col-span-2"
    >
      {{ t('monster.formGroup.defensesSenses') }}
    </h3>

    <div v-for="field in fields" :key="field.key">
      <label :for="`monster-${field.key}`" class="mb-1 block text-xs text-content">
        {{ t(field.labelKey) }}
      </label>
      <div class="rounded-md border border-primary bg-canvas-inset">
        <TextArea
          :id="`monster-${field.key}`"
          class="w-full"
          :border="false"
          :model-value="formState[field.key] ?? ''"
          :rows="2"
          max-height="8rem"
          :maxlength="CHARACTER_TEXT_LIMITS.MEDIUM"
          show-count
          :placeholder="t('monster.placeholder.freeText')"
          @update:model-value="formState[field.key] = $event ? $event : null"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { TextArea } from '@ui'
import { CHARACTER_TEXT_LIMITS } from '@rolling-dice-app/core'
import type { MessagePath } from '~/i18n'
import type { MonsterTemplateFormState } from '~/types/business/monster'

const { t } = useI18n()

const formState = defineModel<MonsterTemplateFormState>('formState', { required: true })

type TextField =
  | 'damageVulnerabilities'
  | 'damageResistances'
  | 'damageImmunities'
  | 'conditionImmunities'
  | 'senses'
  | 'languages'

const fields: { key: TextField; labelKey: MessagePath }[] = [
  { key: 'damageVulnerabilities', labelKey: 'monster.field.damageVulnerabilities' },
  { key: 'damageResistances', labelKey: 'monster.field.damageResistances' },
  { key: 'damageImmunities', labelKey: 'monster.field.damageImmunities' },
  { key: 'conditionImmunities', labelKey: 'monster.field.conditionImmunities' },
  { key: 'senses', labelKey: 'monster.field.senses' },
  { key: 'languages', labelKey: 'monster.field.languages' },
]
</script>
