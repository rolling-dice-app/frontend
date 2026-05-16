<template>
  <div>
    <CommonPageHeader title="Edit Character" :show-back="true">
      <template #actions>
        <CommonAppButton
          variant="primary"
          :disabled="!canSubmit"
          :loading="isSubmitting"
          class="min-w-22 whitespace-nowrap"
          @click="submit"
        >
          {{ t('ui.action.save') }}
        </CommonAppButton>
      </template>
    </CommonPageHeader>

    <Tabs
      v-model="activeTab"
      type="border"
      active-color="var(--color-canvas-elevated)"
      inactive-color="var(--color-canvas)"
      :label="t('character.editCharacter')"
    >
      <Tab value="basic">
        <template #label>
          <span class="text-content">{{ t('character.basicInfo') }}</span>
        </template>
        <BusinessCharacterFormBasicTab
          v-model:form-state="formState"
          :total-level="totalLevel"
          :ability-scores="totalAbilityScores"
          :lock-primary-class="true"
        >
          <template #ability-panel>
            <BusinessCharacterFormBasicAbilityScoreUpdatePanel v-model:form-state="formState" />
          </template>
        </BusinessCharacterFormBasicTab>
      </Tab>

      <Tab value="profile">
        <template #label>
          <span class="text-content">{{ t('character.detailedSetting') }}</span>
        </template>
        <BusinessCharacterFormProfileTab
          v-model:form-state="formState"
          :avatar-upload-fn="avatarUpload"
          :avatar-delete-fn="avatarDelete"
        />
      </Tab>

      <Tab value="features">
        <template #label>
          <span class="text-content">{{ t('character.featuresAndFeats') }}</span>
        </template>
        <BusinessCharacterFormFeaturesTab v-model:form-state="formState" />
      </Tab>

      <Tab value="combat">
        <template #label>
          <span class="text-content">{{ t('character.combatModule') }}</span>
        </template>
        <BusinessCharacterFormCombatTab
          v-model:form-state="formState"
          :ability-scores="totalAbilityScores"
          :total-hp="totalHp"
          :total-speed="totalSpeed"
          :total-initiative="totalInitiative"
          :total-passive-perception="totalPassivePerception"
          :total-passive-insight="totalPassiveInsight"
          :proficiency-bonus="proficiencyBonus"
          :classes="validClasses"
        />
      </Tab>

      <Tab value="spells">
        <template #label>
          <span class="text-content">{{ t('spell.book') }}</span>
        </template>
        <BusinessCharacterFormSpellsTab
          v-model:form-state="formState"
          :proficiency-bonus="proficiencyBonus"
          :ability-scores="totalAbilityScores"
        />
      </Tab>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { Tab, Tabs } from '@ui'
import type { CharacterDTO } from '@rolling-dice-app/core'

const props = defineProps<{ character: CharacterDTO }>()

const { t } = useI18n()

const {
  activeTab,
  formState,
  isSubmitting,
  canSubmit,
  derived,
  submit,
  avatarUpload,
  avatarDelete,
} = useCharacterUpdate(props.character)

const {
  totalLevel,
  totalAbilityScores,
  proficiencyBonus,
  validClasses,
  totalHp,
  totalInitiative,
  totalSpeed,
  totalPassivePerception,
  totalPassiveInsight,
} = derived
</script>
