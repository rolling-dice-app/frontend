<template>
  <section aria-labelledby="section-combat-stats">
    <h2 id="section-combat-stats" class="mb-4 font-display text-lg font-bold text-content">
      基礎數據
    </h2>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col rounded-lg border border-border-soft bg-surface p-3">
        <div class="flex items-center justify-between gap-2">
          <span id="hp-label" class="text-xs text-content-muted">生命值</span>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-content-muted">健壯</span>
            <Toggle
              :model-value="formState.isTough"
              size="sm"
              aria-label="是否持有健壯專長"
              color="var(--color-success)"
              @update:model-value="formState.isTough = $event"
            />
          </div>
        </div>
        <output aria-labelledby="hp-label" class="mt-1 text-2xl font-bold text-content">
          {{ totalHp }}
        </output>
        <div class="mt-2">
          <label for="custom-hp-bonus" class="block text-xs text-content">額外加值</label>
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
        <span id="speed-label" class="text-xs text-content-muted">移動速度</span>
        <output aria-labelledby="speed-label" class="mt-1 text-2xl font-bold text-content">
          {{ totalSpeed }}
        </output>
        <div class="mt-2">
          <label for="speed-bonus" class="block text-xs text-content">額外加值</label>
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
        <span id="passive-insight-label" class="text-xs text-content-muted">被動洞察</span>
        <output
          aria-labelledby="passive-insight-label"
          class="mt-1 text-2xl font-bold text-content"
        >
          {{ totalPassiveInsight }}
        </output>
        <div class="mt-2">
          <label for="passive-insight-bonus" class="block text-xs text-content">額外加值</label>
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
        <span id="passive-perception-label" class="text-xs text-content-muted">被動察覺</span>
        <output
          aria-labelledby="passive-perception-label"
          class="mt-1 text-2xl font-bold text-content"
        >
          {{ totalPassivePerception }}
        </output>
        <div class="mt-2">
          <label for="passive-perception-bonus" class="block text-xs text-content">額外加值</label>
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
        <span id="initiative-label" class="text-xs text-content-muted">先攻</span>
        <output
          aria-labelledby="initiative-label"
          class="mt-1 text-2xl font-bold"
          :class="initiativeTextColor"
        >
          {{ formatModifier(totalInitiative) }}
        </output>
        <div class="mt-2 grid grid-cols-2 gap-3">
          <div>
            <label for="initiative-ability" class="block text-xs text-content">屬性加值</label>
            <CommonAppSelect
              id="initiative-ability"
              :radius="0"
              :model-value="formState.initiativeAbilityKey ?? ''"
              :options="abilityOptions"
              size="sm"
              placeholder="無"
              class="mt-1 w-full"
              @update:model-value="
                formState.initiativeAbilityKey = ($event || null) as AbilityKey | null
              "
            />
          </div>
          <div>
            <label for="initiative-bonus" class="block text-xs text-content">額外加值</label>
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
import type { AbilityKey } from '@rolling-dice-app/types'
import { ABILITY_NAMES } from '~/constants/dnd'

const formState = defineModel<CharacterUpdateFormState>('formState', { required: true })

const props = defineProps<{
  totalHp: number
  totalSpeed: number
  totalInitiative: number
  totalPassivePerception: number
  totalPassiveInsight: number
}>()

const abilityOptions: SelectOption[] = [
  { value: '', label: '無' },
  ...Object.entries(ABILITY_NAMES)
    .filter(([key]) => key !== 'dexterity')
    .map(([value, label]) => ({ value, label })),
]

const initiativeTextColor = computed(() => {
  const v = props.totalInitiative
  if (v > 0) return 'text-success'
  if (v < 0) return 'text-danger'
  return 'text-content-muted'
})
</script>
