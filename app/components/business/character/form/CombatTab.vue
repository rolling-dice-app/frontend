<template>
  <div class="flex flex-col gap-8 bg-canvas-elevated p-4 sm:p-6 md:flex-row md:items-start">
    <!-- 左欄：基礎數據 + 護甲等級 -->
    <div class="w-full space-y-8 sm:w-1/2 lg:w-1/3">
      <BusinessCharacterFormCombatOtherAttributesPanel
        v-model:form-state="formState"
        :total-hp="totalHp"
        :total-speed="totalSpeed"
        :total-initiative="totalInitiative"
        :total-passive-perception="totalPassivePerception"
        :total-passive-insight="totalPassiveInsight"
      />

      <BusinessCharacterFormCombatArmorClassPanel
        v-model:form-state="formState"
        :ability-scores="abilityScores"
      />

      <BusinessCharacterFormCombatSavingThrowPanel
        v-model:form-state="formState"
        :professions="professions"
        :ability-scores="abilityScores"
        :proficiency-bonus="proficiencyBonus"
      />
    </div>

    <!-- 右欄：自訂攻擊 -->
    <div class="w-full sm:w-1/2 lg:w-2/3">
      <BusinessCharacterFormCombatAttackList
        v-model:form-state="formState"
        :ability-scores="abilityScores"
        :proficiency-bonus="proficiencyBonus"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProfessionEntry } from '@rolling-dice-app/core'
import type { CharacterUpdateFormState, TotalAbilityScores } from '~/types/business/character-form'

const formState = defineModel<CharacterUpdateFormState>('formState', { required: true })

defineProps<{
  abilityScores: TotalAbilityScores
  totalHp: number
  totalSpeed: number
  totalInitiative: number
  totalPassivePerception: number
  totalPassiveInsight: number
  proficiencyBonus: number
  professions: ProfessionEntry[]
}>()
</script>
