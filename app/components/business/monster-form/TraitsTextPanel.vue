<template>
  <section aria-labelledby="monster-section-traits" class="grid gap-4 lg:grid-cols-2">
    <h3
      id="monster-section-traits"
      class="font-display text-base font-bold text-content lg:col-span-2"
    >
      {{ t('monster.formGroup.defensesSenses') }}
    </h3>

    <div v-for="field in modifierFields" :key="field.modifier">
      <label :for="`monster-damage-${field.modifier}`" class="mb-1 block text-xs text-content">
        {{ t(field.labelKey) }}
      </label>
      <CommonAppSelect
        :id="`monster-damage-${field.modifier}`"
        class="w-full"
        :model-value="damageTypesFor(field.modifier)"
        :options="damageTypeOptionsFor(field.modifier)"
        multiple
        multiple-display="chips"
        placeholder="-"
        size="sm"
        @update:model-value="setDamageTypesFor(field.modifier, $event)"
      />
    </div>

    <div>
      <label for="monster-condition-immunities" class="mb-1 block text-xs text-content">
        {{ t('monster.field.conditionImmunities') }}
      </label>
      <CommonAppSelect
        id="monster-condition-immunities"
        class="w-full"
        :model-value="formState.conditionImmunityKeys"
        :options="conditionOptions"
        multiple
        multiple-display="chips"
        placeholder="-"
        size="sm"
        @update:model-value="setConditionImmunities($event)"
      />
    </div>

    <div v-for="field in textFields" :key="field.key">
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

    <div class="lg:col-span-2">
      <label for="monster-remark" class="mb-1 block text-xs text-content">
        {{ t('monster.field.remark') }}
      </label>
      <div class="rounded-md border border-primary bg-canvas-inset">
        <TextArea
          id="monster-remark"
          class="w-full"
          :border="false"
          :model-value="formState.remark ?? ''"
          :rows="2"
          max-height="8rem"
          :maxlength="CHARACTER_TEXT_LIMITS.MEDIUM"
          show-count
          :placeholder="t('monster.placeholder.remark')"
          @update:model-value="formState.remark = $event ? $event : null"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { TextArea } from '@ui'
import type { SelectOption, SelectProps } from '@ui'
import {
  CHARACTER_TEXT_LIMITS,
  CONDITION_KEYS,
  DAMAGE_TYPE_KEYS,
  type DamageModifierKey,
  type DamageTypeKey,
} from '@rolling-dice-app/core'
import type { MessagePath } from '~/i18n'
import type { MonsterTemplateFormState } from '~/types/business/monster'

const { t } = useI18n()

const formState = defineModel<MonsterTemplateFormState>('formState', { required: true })

const modifierFields: { modifier: DamageModifierKey; labelKey: MessagePath }[] = [
  { modifier: 'vulnerability', labelKey: 'monster.field.damageVulnerabilities' },
  { modifier: 'resistance', labelKey: 'monster.field.damageResistances' },
  { modifier: 'immunity', labelKey: 'monster.field.damageImmunities' },
]

/** 該修飾詞目前選中的傷害類型（依 DAMAGE_TYPE_KEYS 序） */
const damageTypesFor = (modifier: DamageModifierKey): DamageTypeKey[] =>
  DAMAGE_TYPE_KEYS.filter((key) => formState.value.damageModifiers[key] === modifier)

/** 已被其他修飾詞選走的類型 disabled，在輸入端維持三態互斥 */
const damageTypeOptionsFor = (modifier: DamageModifierKey): SelectOption[] =>
  DAMAGE_TYPE_KEYS.map((key) => {
    const assigned = formState.value.damageModifiers[key]
    return {
      value: key,
      label: t(`combat.damageType.${key}`),
      disabled: assigned !== undefined && assigned !== modifier,
    }
  })

/** 以 DAMAGE_TYPE_KEYS 序重建 record：選中的設本修飾詞，其餘保留原有指派 */
const setDamageTypesFor = (modifier: DamageModifierKey, value: SelectProps['modelValue']): void => {
  const chosen = new Set((Array.isArray(value) ? value : []).map(String))
  const next: Partial<Record<DamageTypeKey, DamageModifierKey>> = {}
  for (const key of DAMAGE_TYPE_KEYS) {
    if (chosen.has(key)) {
      next[key] = modifier
    } else {
      const current = formState.value.damageModifiers[key]
      if (current !== undefined && current !== modifier) next[key] = current
    }
  }
  formState.value.damageModifiers = next
}

const conditionOptions = computed<SelectOption[]>(() =>
  CONDITION_KEYS.map((key) => ({ value: key, label: t(`combat.condition.${key}`) })),
)

/** 以 CONDITION_KEYS 序正規化，避免點選順序造成 update patch 假 diff */
const setConditionImmunities = (value: SelectProps['modelValue']): void => {
  const chosen = new Set((Array.isArray(value) ? value : []).map(String))
  formState.value.conditionImmunityKeys = CONDITION_KEYS.filter((key) => chosen.has(key))
}

type TextField = 'senses' | 'languages'

const textFields: { key: TextField; labelKey: MessagePath }[] = [
  { key: 'senses', labelKey: 'monster.field.senses' },
  { key: 'languages', labelKey: 'monster.field.languages' },
]
</script>
