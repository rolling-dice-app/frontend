<template>
  <section aria-labelledby="section-combat-stats">
    <h2 id="section-combat-stats" class="mb-4 font-display text-lg font-bold text-content">
      {{ t('combat.basicStats') }}
    </h2>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col rounded-lg border border-border-soft bg-surface p-3">
        <div class="flex items-center justify-between gap-2">
          <span id="hp-label" class="text-xs text-content-muted">{{ t('combat.hp') }}</span>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-content-muted">{{ t('combat.tough') }}</span>
            <Toggle
              :model-value="formState.isTough"
              size="sm"
              :aria-label="t('combat.toughToggleAria')"
              color="var(--color-success)"
              @update:model-value="formState.isTough = $event"
            />
          </div>
        </div>
        <output aria-labelledby="hp-label" class="mt-1 text-2xl font-bold text-content">
          {{ totalHp }}
        </output>
        <div class="mt-2">
          <label for="custom-hp-bonus" class="block text-xs text-content">
            {{ t('combat.extraBonus') }}
          </label>
          <CommonAppInput
            id="custom-hp-bonus"
            :radius="0"
            :model-value="String(formState.customHpBonus)"
            type="number"
            size="sm"
            outline
            placeholder="0"
            class="mt-1 w-full"
            @update:model-value="formState.customHpBonus = parseIntegerInput($event, 0)"
          />
        </div>
      </div>

      <div class="flex flex-col rounded-lg border border-border-soft bg-surface p-3">
        <span id="speed-label" class="text-xs text-content-muted">{{ t('combat.speed') }}</span>
        <output aria-labelledby="speed-label" class="mt-1 text-2xl font-bold text-content">
          {{ totalSpeed }}
        </output>
        <div class="mt-2">
          <label for="speed-bonus" class="block text-xs text-content">
            {{ t('combat.extraBonus') }}
          </label>
          <CommonAppInput
            id="speed-bonus"
            :radius="0"
            :model-value="formState.speedBonus ? String(formState.speedBonus) : ''"
            type="number"
            size="sm"
            outline
            placeholder="0"
            class="mt-1 w-full"
            @update:model-value="formState.speedBonus = parseIntegerInput($event, 0)"
          />
        </div>
      </div>

      <div class="flex flex-col rounded-lg border border-border-soft bg-surface p-3">
        <span id="passive-insight-label" class="text-xs text-content-muted">
          {{ t('combat.passiveInsight') }}
        </span>
        <output
          aria-labelledby="passive-insight-label"
          class="mt-1 text-2xl font-bold text-content"
        >
          {{ totalPassiveInsight }}
        </output>
        <div class="mt-2">
          <label for="passive-insight-bonus" class="block text-xs text-content">
            {{ t('combat.extraBonus') }}
          </label>
          <CommonAppInput
            id="passive-insight-bonus"
            :radius="0"
            :model-value="
              formState.passiveInsightBonus ? String(formState.passiveInsightBonus) : ''
            "
            type="number"
            size="sm"
            outline
            placeholder="0"
            class="mt-1 w-full"
            @update:model-value="formState.passiveInsightBonus = parseIntegerInput($event, 0)"
          />
        </div>
      </div>

      <div class="flex flex-col rounded-lg border border-border-soft bg-surface p-3">
        <span id="passive-perception-label" class="text-xs text-content-muted">
          {{ t('combat.passivePerception') }}
        </span>
        <output
          aria-labelledby="passive-perception-label"
          class="mt-1 text-2xl font-bold text-content"
        >
          {{ totalPassivePerception }}
        </output>
        <div class="mt-2">
          <label for="passive-perception-bonus" class="block text-xs text-content">
            {{ t('combat.extraBonus') }}
          </label>
          <CommonAppInput
            id="passive-perception-bonus"
            :radius="0"
            :model-value="
              formState.passivePerceptionBonus ? String(formState.passivePerceptionBonus) : ''
            "
            type="number"
            size="sm"
            outline
            placeholder="0"
            class="mt-1 w-full"
            @update:model-value="formState.passivePerceptionBonus = parseIntegerInput($event, 0)"
          />
        </div>
      </div>

      <div class="col-span-2 flex flex-col rounded-lg border border-border-soft bg-surface p-3">
        <span id="initiative-label" class="text-xs text-content-muted">
          {{ t('combat.initiative') }}
        </span>
        <output
          aria-labelledby="initiative-label"
          class="mt-1 text-2xl font-bold"
          :class="initiativeTextColor"
        >
          {{ formatModifier(totalInitiative) }}
        </output>
        <div class="mt-2 grid grid-cols-2 gap-3">
          <div>
            <label for="initiative-ability" class="block text-xs text-content">
              {{ t('combat.abilityBonus') }}
            </label>
            <CommonAppSelect
              id="initiative-ability"
              :radius="0"
              :model-value="formState.initiativeAbilityKey ?? ''"
              :options="abilityOptions"
              size="sm"
              :placeholder="t('combat.none')"
              class="mt-1 w-full"
              @update:model-value="
                formState.initiativeAbilityKey = ($event || null) as AbilityKey | null
              "
            />
          </div>
          <div>
            <label for="initiative-bonus" class="block text-xs text-content">
              {{ t('combat.extraBonus') }}
            </label>
            <CommonAppInput
              id="initiative-bonus"
              :radius="0"
              :model-value="formState.initiativeBonus ? String(formState.initiativeBonus) : ''"
              type="number"
              size="sm"
              outline
              placeholder="0"
              class="mt-1 w-full"
              @update:model-value="formState.initiativeBonus = parseIntegerInput($event, 0)"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Toggle } from '@ui'
import type { SelectOption } from '@ui'

import type { CharacterUpdateFormState } from '~/types/business/character-form'
import { ABILITY_KEYS, type AbilityKey } from '@rolling-dice-app/core'

const { t } = useI18n()

const formState = defineModel<CharacterUpdateFormState>('formState', { required: true })

const props = defineProps<{
  totalHp: number
  totalSpeed: number
  totalInitiative: number
  totalPassivePerception: number
  totalPassiveInsight: number
}>()

const abilityOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('combat.none') },
  ...ABILITY_KEYS.filter((key) => key !== 'dexterity').map((key) => ({
    value: key,
    label: t(`ability.${key}`),
  })),
])

const initiativeTextColor = computed(() => {
  const v = props.totalInitiative
  if (v > 0) return 'text-success'
  if (v < 0) return 'text-danger'
  return 'text-content-muted'
})
</script>
