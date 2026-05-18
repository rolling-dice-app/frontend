<template>
  <div class="relative space-y-6 bg-canvas-elevated p-4">
    <div
      v-if="isLoading && !isReady"
      class="flex min-h-[40dvh] items-center justify-center text-content-muted"
      role="status"
      aria-live="polite"
    >
      {{ t('ui.state.loading') }}
    </div>
    <div
      v-else-if="loadError && !isReady"
      class="flex flex-col items-center gap-3 py-12 text-center"
    >
      <p class="text-danger">{{ t('ui.state.loadFailed') }}</p>
      <CommonAppButton variant="warning" @click="retry">
        {{ t('ui.state.retry') }}
      </CommonAppButton>
    </div>
    <template v-else>
      <header class="flex items-center justify-end gap-2">
        <CommonAppButton variant="neutral" :disabled="isResting" @click="onShortRest">
          {{ t('combat.shortRest') }}
        </CommonAppButton>
        <CommonAppButton variant="neutral" :disabled="isResting" @click="onLongRest">
          {{ t('combat.longRest') }}
        </CommonAppButton>
        <CommonAppButton variant="danger" :disabled="isResting" @click="resetModalOpen = true">
          {{ t('combat.reset') }}
        </CommonAppButton>
      </header>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-4">
          <BusinessCharacterDetailQuickviewHpCard
            :current-hp="displayCurrentHp"
            :max-hp="effectiveMaxHp"
            :max-adjustment="state.hp.maxAdjustment"
            :temp-hp="state.hp.tempHp"
            @damage="damageHp"
            @heal="healHp"
            @adjust-temp="adjustTempHp"
            @adjust-max="adjustMaxHp"
          />
          <div class="grid items-start gap-4 sm:grid-cols-2">
            <BusinessCharacterDetailQuickviewHitDiceCard
              :classes="character.classes"
              :hit-dice-used="state.hitDiceUsed"
              @adjust="adjustHitDiceUsed"
            />
            <BusinessCharacterDetailQuickviewDeathSavesCard
              :active="displayCurrentHp === 0"
              :successes="state.deathSaves.successes"
              :failures="state.deathSaves.failures"
              @set-success="setDeathSaveSuccess"
              @set-failure="setDeathSaveFailure"
              @roll-nat20="healHp(1)"
            />
          </div>
        </div>
        <BusinessCharacterDetailQuickviewBattleCard
          :base-armor-class="totalArmorClass"
          :ac-adjustment="state.acAdjustment"
          :base-speed="totalSpeed"
          :speed-adjustment="state.speedAdjustment"
          :initiative="totalInitiative"
          :passive-perception="totalPassivePerception"
          :passive-insight="totalPassiveInsight"
          :proficiency-bonus="proficiencyBonus"
          @adjust-ac="adjustAc"
          @adjust-speed="adjustSpeed"
        />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <BusinessCharacterDetailQuickviewSavingThrowList
          :ability-scores="totalAbilityScores"
          :proficiency-bonus="proficiencyBonus"
          :proficiencies="savingThrowProficiencies"
          :adjustments="state.savingThrowAdjustments"
          :spellcasting-abilities="character.spellcastingAbilities"
          :custom-spellcasting-bonuses="character.customSpellcastingBonuses"
          @adjust="adjustSavingThrow"
        />
        <BusinessCharacterDetailQuickviewSkillList
          :ability-scores="totalAbilityScores"
          :proficiency-bonus="proficiencyBonus"
          :skills="character.skills"
          :is-jack-of-all-trades="character.isJackOfAllTrades"
        />
      </div>

      <div class="grid items-start gap-4 md:grid-cols-2">
        <BusinessCharacterDetailQuickviewFeatureList
          :features="character.features"
          :feature-uses-spent="state.featureUsesSpent"
          @adjust="adjustFeatureUseSpent"
        />

        <div class="flex flex-col gap-4">
          <BusinessCharacterDetailQuickviewSpellSlotsCard
            v-if="hasAnySlot"
            :spell-slots-base="spellSlotsBase"
            :spell-slots-used="state.spellSlotsUsed"
            :pact-slots-base="pactSlotsBase"
            :pact-slots-used="state.pactSlotsUsed"
            @adjust-spell="adjustSpellSlotUsed"
            @adjust-pact="adjustPactSlotUsed"
          />

          <BusinessCharacterDetailQuickviewAttackList
            :attacks="character.attacks"
            :ability-scores="totalAbilityScores"
            :proficiency-bonus="proficiencyBonus"
          />
        </div>
      </div>

      <BusinessCharacterDetailQuickviewRollDrawer
        :character="character"
        :ability-scores="totalAbilityScores"
        :proficiency-bonus="proficiencyBonus"
        :saving-throw-proficiencies="savingThrowProficiencies"
        :saving-throw-adjustments="state.savingThrowAdjustments"
      />
    </template>

    <div
      v-if="isResting"
      class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <span
        class="inline-block size-10 animate-spin motion-reduce:animate-none rounded-full border-4 border-white/30 border-t-white"
        aria-hidden="true"
      />
      <p class="text-sm font-medium text-white">{{ t('combat.resting') }}</p>
    </div>

    <Modal
      v-model="resetModalOpen"
      :title="t('combat.resetConfirmTitle')"
      size="sm"
      :show-close-button="false"
      :close-on-click-outside="false"
      :close-on-escape="false"
      bg-color="var(--color-canvas-elevated)"
      text-color="var(--color-content)"
      border-color="var(--color-border)"
    >
      <p class="text-sm text-content">{{ t('combat.resetConfirmBody') }}</p>

      <template #footer>
        <CommonAppButton variant="ghost" :disabled="isResetting" @click="resetModalOpen = false">
          {{ t('ui.action.cancel') }}
        </CommonAppButton>
        <CommonAppButton variant="danger" :disabled="isResetting" @click="onConfirmReset">
          {{ isResetting ? t('combat.resetting') : t('ui.action.confirm') }}
        </CommonAppButton>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from '@ui'
import { useCharacterCombatState } from '~/composables/domain/useCharacterCombatState'
import { useCharacterDerivedStatsFromCharacter } from '~/composables/domain/useCharacterDerivedStats'
import {
  getSuggestedPactSlots,
  getSuggestedRegularSpellSlots,
  mergeSlots,
  type CharacterDTO,
} from '@rolling-dice-app/core'

const { t } = useI18n()

const props = defineProps<{
  character: CharacterDTO
}>()

const characterRef = computed(() => props.character)

const {
  totalAbilityScores,
  proficiencyBonus,
  savingThrowProficiencies,
  totalHp,
  totalArmorClass,
  totalInitiative,
  totalSpeed,
  totalPassivePerception,
  totalPassiveInsight,
} = useCharacterDerivedStatsFromCharacter(characterRef)

const {
  state,
  isLoading,
  loadError,
  isReady,
  isResting,
  isResetting,
  load,
  retry,
  effectiveMaxHp,
  displayCurrentHp,
  damageHp,
  healHp,
  adjustTempHp,
  adjustMaxHp,
  adjustAc,
  adjustSpeed,
  adjustSavingThrow,
  adjustFeatureUseSpent,
  adjustHitDiceUsed,
  adjustSpellSlotUsed,
  adjustPactSlotUsed,
  setDeathSaveSuccess,
  setDeathSaveFailure,
  shortRest,
  longRest,
  combatReset,
  flushPersist,
} = useCharacterCombatState(props.character.id, totalHp)

defineExpose({ flushPersist })

const resetModalOpen = ref(false)

onMounted(() => {
  void load()
})

const spellSlotsBase = computed(() =>
  mergeSlots(
    getSuggestedRegularSpellSlots(props.character.classes),
    props.character.spellSlotsDelta,
  ),
)
const pactSlotsBase = computed(() =>
  mergeSlots(getSuggestedPactSlots(props.character.classes), props.character.pactSlotsDelta),
)
const hasAnySlot = computed(
  () => Object.keys(spellSlotsBase.value).length + Object.keys(pactSlotsBase.value).length > 0,
)

const onShortRest = async (): Promise<void> => {
  if (await shortRest()) useToast().success(t('combat.shortRestDone'), { kind: 'hint' })
}

const onLongRest = async (): Promise<void> => {
  if (await longRest()) useToast().success(t('combat.longRestDone'), { kind: 'hint' })
}

const onConfirmReset = async (): Promise<void> => {
  if (await combatReset()) {
    useToast().success(t('combat.resetDone'), { kind: 'hint' })
    resetModalOpen.value = false
  }
}
</script>
