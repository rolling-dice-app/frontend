<template>
  <div class="flex flex-col gap-2 bg-canvas-elevated p-4 sm:p-6 md:flex-row">
    <BusinessCharacterFormBasicCharacterInfoSection
      v-model:form-state="formState"
      class="w-full md:w-1/3"
      :total-level="totalLevel"
      :lock-primary-class="lockPrimaryClass"
    />

    <BusinessCharacterFormBasicSkillProficiencyGrid
      v-model:form-state="formState"
      class="w-full md:w-1/3"
      :ability-scores="abilityScores"
      :proficiency-bonus="proficiencyBonus"
    />

    <div class="flex w-full flex-col gap-4 md:w-1/3">
      <slot name="ability-panel" />
      <slot name="race-bonus-panel" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CharacterFormStateBase, TotalAbilityScores } from '~/types/business/character-form'

const formState = defineModel<CharacterFormStateBase>('formState', { required: true })

const props = withDefaults(
  defineProps<{
    totalLevel: number
    abilityScores: TotalAbilityScores
    lockPrimaryClass?: boolean
  }>(),
  { lockPrimaryClass: false },
)

const proficiencyBonus = computed(() => getProficiencyBonus(props.totalLevel))
</script>
