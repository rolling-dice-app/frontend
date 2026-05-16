<template>
  <div class="flex-1 self-start space-y-4 px-2">
    <div class="flex items-center justify-between">
      <h2 class="font-display text-lg font-bold text-content">
        {{ t('class.skillProficiency') }}
      </h2>
      <label class="flex items-center gap-1.5">
        <span class="text-xs text-content-soft">{{ t('combat.jackOfAllTrades') }}</span>
        <Toggle
          :model-value="formState.isJackOfAllTrades"
          size="sm"
          color="var(--color-success)"
          :aria-label="t('combat.jackOfAllTrades')"
          @update:model-value="formState.isJackOfAllTrades = $event"
        />
      </label>
    </div>
    <div class="grid grid-cols-1 gap-2 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-9">
      <div
        v-for="item in skillList"
        :key="item.key"
        class="flex flex-wrap items-center justify-between rounded-md border border-border gap-1 px-2 py-1.5"
      >
        <span class="text-xs text-content flex-1">
          {{ `${item.name}` }}
          <span class="text-content-muted">({{ item.bonusText }})</span>
        </span>
        <CommonAppSelect
          class="min-w-18 flex-1"
          :model-value="formState.skills[item.key] ?? 'none'"
          :options="proficiencyOptions"
          size="sm"
          @update:model-value="
            formState.skills = applySkillProficiency(
              formState.skills,
              item.key,
              $event as ProficiencyLevel,
            )
          "
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Toggle } from '@ui'
import type { CharacterFormStateBase, TotalAbilityScores } from '~/types/business/character-form'
import type { ProficiencyLevel } from '@rolling-dice-app/core'

const { t } = useI18n()
const { options: proficiencyOptions } = useProficiencyOptions()

const formState = defineModel<CharacterFormStateBase>('formState', { required: true })

const props = defineProps<{
  abilityScores: TotalAbilityScores
  proficiencyBonus: number
}>()

const skillList = computed(() =>
  calculateSkillBonuses({
    abilityScores: props.abilityScores,
    skills: formState.value.skills,
    proficiencyBonus: props.proficiencyBonus,
    isJackOfAllTrades: formState.value.isJackOfAllTrades,
  }).map(({ key, bonus }) => ({ key, name: t(`skill.${key}`), bonusText: formatModifier(bonus) })),
)
</script>
