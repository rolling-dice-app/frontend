<template>
  <div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
    <CommonPageHeader :title="t('character.buildCharacterTitle')" :show-back="true" />

    <Tabs
      v-model="activeTab"
      type="border"
      active-color="var(--color-canvas-elevated)"
      inactive-color="var(--color-canvas)"
      :label="t('character.createCharacter')"
    >
      <Tab value="basic">
        <template #label>
          <span class="text-content">{{ t('character.basicInfo') }}</span>
        </template>
        <BusinessCharacterFormBasicTab
          v-model:form-state="formState"
          :total-level="totalLevel"
          :ability-scores="totalAbilityScores"
        >
          <template #ability-panel>
            <BusinessCharacterFormBasicAbilityScorePanel
              :abilities="formState.abilities"
              :ability-method="formState.abilityMethod"
              :point-buy-usage="pointBuyUsage"
              :dice-pool="formState.dicePool"
              @update:method="setAbilityMethod"
              @update:score="updateAbilityScore"
              @assign:dice="assignDiceToAbility"
              @roll:all="rollAllAbilities"
              @reset:abilities="resetAbilities"
            />
          </template>
          <template #race-bonus-panel>
            <BusinessCharacterFormBasicRaceAbilityBonusPanel v-model:form-state="formState" />
          </template>
        </BusinessCharacterFormBasicTab>
      </Tab>

      <Tab value="profile">
        <template #label>
          <span class="text-content">{{ t('character.detailedSetting') }}</span>
        </template>
        <BusinessCharacterFormProfileTab
          v-model:form-state="formState"
          v-model:pending-avatar="pendingAvatar"
        />
      </Tab>
    </Tabs>

    <div class="mt-8 flex justify-end">
      <CommonAppButton
        variant="primary"
        :disabled="!canSubmit"
        :loading="isSubmitting"
        @click="openConfirm"
      >
        {{ t('character.saveCharacter') }}
      </CommonAppButton>
    </div>

    <BusinessCharacterBuildConfirmModal
      v-model="isConfirmOpen"
      :classes="formState.classes"
      :abilities="totalAbilityScores"
      @cancel="isConfirmOpen = false"
      @confirm="confirmSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { Tab, Tabs } from '@ui'
import { ABILITY_KEYS } from '@rolling-dice-app/core'
import type { TotalAbilityScores } from '~/types/business/character-form'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()

useHead({ title: t('character.createCharacter') })

const {
  activeTab,
  formState,
  pendingAvatar,
  totalLevel,
  isSubmitting,
  canSubmit,
  abilities,
  submit,
} = useCharacterBuild()
const {
  pointBuyUsage,
  setAbilityMethod,
  rollAllAbilities,
  resetAbilities,
  updateAbilityScore,
  assignDiceToAbility,
} = abilities

const totalAbilityScores = computed<TotalAbilityScores>(
  () =>
    Object.fromEntries(
      ABILITY_KEYS.map((key) => [
        key,
        formState.abilities[key].origin + formState.abilities[key].race,
      ]),
    ) as TotalAbilityScores,
)

const isConfirmOpen = ref(false)

function openConfirm(): void {
  if (!canSubmit.value) return
  isConfirmOpen.value = true
}

async function confirmSubmit(): Promise<void> {
  isConfirmOpen.value = false
  await submit()
}
</script>
