<template>
  <section aria-labelledby="monster-section-abilities">
    <h3 id="monster-section-abilities" class="mb-3 font-display text-base font-bold text-content">
      {{ t('monster.formGroup.abilitiesSaves') }}
    </h3>
    <div class="grid grid-cols-3 gap-3">
      <div
        v-for="key in ABILITY_KEYS"
        :key="key"
        class="rounded-lg border border-border-soft bg-surface px-3 py-2 text-center"
      >
        <label :for="`monster-ability-${key}`" class="mb-1 block text-xs text-content-muted">
          {{ t(`ability.${key}`) }}
          <span
            class="font-bold tabular-nums"
            :class="getModifierColorClass(getAbilityModifier(formState.abilities[key]))"
          >
            （{{ formatModifier(getAbilityModifier(formState.abilities[key])) }}）
          </span>
        </label>
        <CommonAppInput
          :id="`monster-ability-${key}`"
          :radius="0"
          :model-value="String(formState.abilities[key])"
          type="number"
          size="sm"
          outline
          class="w-full text-center"
          @update:model-value="
            formState.abilities[key] = Math.max(
              0,
              parseIntegerInput($event, 10, CHARACTER_INT_LIMITS.SMALL_INT_MAX),
            )
          "
        />

        <div class="mt-2 border-t border-divider pt-2">
          <label :for="`monster-save-${key}`" class="mb-1 block text-xs text-content-muted">
            {{ t('monster.field.savingThrows') }}
          </label>
          <CommonAppInput
            :id="`monster-save-${key}`"
            :radius="0"
            :model-value="String(formState.savingThrows[key] ?? 0)"
            type="number"
            size="sm"
            outline
            placeholder="±0"
            class="w-full text-center"
            @update:model-value="
              formState.savingThrows[key] = parseIntegerInput(
                $event,
                0,
                CHARACTER_INT_LIMITS.SMALL_INT_MAX,
              )
            "
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ABILITY_KEYS, CHARACTER_INT_LIMITS } from '@rolling-dice-app/core'
import type { MonsterTemplateFormState } from '~/types/business/monster'

const { t } = useI18n()

const formState = defineModel<MonsterTemplateFormState>('formState', { required: true })
</script>
