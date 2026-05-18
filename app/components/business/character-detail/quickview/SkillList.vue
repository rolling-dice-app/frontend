<template>
  <section aria-labelledby="quickview-skills-label">
    <h3 id="quickview-skills-label" class="mb-2 font-display text-sm font-bold text-content">
      {{ t('combat.skillCheck') }}
    </h3>
    <div class="grid grid-flow-col grid-cols-2 grid-rows-9 gap-x-4 gap-y-2">
      <div
        v-for="skill in skillList"
        :key="skill.key"
        class="flex items-center justify-between rounded px-2 py-1"
      >
        <div class="flex items-center gap-2">
          <span class="size-1.5 rounded-full" :class="dotClass(skill.proficiency)"></span>
          <span class="text-sm text-content-soft">{{ skill.name }}</span>
        </div>
        <span class="text-sm font-bold" :class="modifierColor(skill.bonus)">
          {{ formatModifier(skill.bonus) }}
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TotalAbilityScores } from '~/types/business/character-form'
import type { ProficiencyLevel, SkillKey } from '@rolling-dice-app/core'

const { t } = useI18n()

const props = defineProps<{
  abilityScores: TotalAbilityScores
  proficiencyBonus: number
  skills: Partial<Record<SkillKey, Exclude<ProficiencyLevel, 'none'>>>
  isJackOfAllTrades: boolean
}>()

const skillList = computed(() =>
  calculateSkillBonuses({
    abilityScores: props.abilityScores,
    skills: props.skills,
    proficiencyBonus: props.proficiencyBonus,
    isJackOfAllTrades: props.isJackOfAllTrades,
  }).map(({ key, proficiency, bonus }) => ({ key, name: t(`skill.${key}`), proficiency, bonus })),
)

const dotClass = (level: ProficiencyLevel): string => {
  if (level === 'expertise') return 'bg-primary'
  if (level === 'proficient') return 'bg-content-soft'
  return props.isJackOfAllTrades ? 'bg-success' : 'bg-border-soft'
}

const modifierColor = (value: number): string => {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-content-muted'
}
</script>
