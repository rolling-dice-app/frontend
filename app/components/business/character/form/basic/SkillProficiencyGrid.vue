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
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          :options="PROFICIENCY_OPTIONS"
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
import { PROFICIENCY_OPTIONS, SKILL_TO_ABILITY_MAP } from '~/constants/dnd'
import type { CharacterFormStateBase, TotalAbilityScores } from '~/types/business/character-form'
import { SKILL_KEYS, type ProficiencyLevel } from '@rolling-dice-app/core'

const { t } = useI18n()

const formState = defineModel<CharacterFormStateBase>('formState', { required: true })

const props = defineProps<{
  abilityScores: TotalAbilityScores
  proficiencyBonus: number
}>()

const skillList = computed(() => {
  const jackBonus = formState.value.isJackOfAllTrades ? Math.floor(props.proficiencyBonus / 2) : 0
  return SKILL_KEYS.map((key) => {
    const abilityKey = SKILL_TO_ABILITY_MAP[key]
    const mod = getAbilityModifier(props.abilityScores[abilityKey])
    const proficiency: ProficiencyLevel = formState.value.skills[key] ?? 'none'
    const base = getSkillBonus(mod, proficiency, props.proficiencyBonus)
    const bonus = proficiency === 'none' ? base + jackBonus : base
    return { key, name: t(`skill.${key}`), bonusText: formatModifier(bonus) }
  })
})
</script>
