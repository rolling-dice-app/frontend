<template>
  <div class="mx-auto max-w-6xl px-4 pb-6">
    <CommonPageHeader title="Cast Your Character" :show-back="true" />

    <Tabs
      v-model="activeTab"
      type="border"
      active-color="var(--color-canvas-elevated)"
      inactive-color="var(--color-canvas)"
      label="建立角色卡"
    >
      <Tab value="basic">
        <template #label>
          <span class="text-content">基本資訊</span>
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
          <span class="text-content">詳細設定</span>
        </template>
        <BusinessCharacterFormProfileTab v-model:form-state="formState" />
      </Tab>
    </Tabs>

    <div class="mt-8 flex justify-end">
      <Button
        :disabled="!canSubmit"
        :loading="isSubmitting"
        :radius="4"
        bg-color="var(--color-primary)"
        @click="openConfirm"
      >
        儲存角色卡
      </Button>
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
import { Button, Tab, Tabs } from '@ui'
import { ABILITY_KEYS } from '@rolling-dice-app/core'
import type { TotalAbilityScores } from '~/types/business/character-form'

definePageMeta({ middleware: 'auth' })

useHead({ title: '建立角色卡' })

const { activeTab, formState, totalLevel, isSubmitting, canSubmit, abilities, submit } =
  useCharacterBuild()
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
