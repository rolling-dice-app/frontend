<template>
  <div class="space-y-6 bg-canvas-elevated p-4">
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
      <button
        type="button"
        class="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-content hover:bg-bg-elevated"
        @click="retry"
      >
        {{ t('ui.state.retry') }}
      </button>
    </div>
    <template v-else>
      <header class="flex items-center justify-end gap-2">
        <Button :radius="4" bg-color="var(--color-warning)" @click="onShortRest">
          {{ t('combat.shortRest') }}
        </Button>
        <Button :radius="4" bg-color="var(--color-success)" @click="onLongRest">
          {{ t('combat.longRest') }}
        </Button>
      </header>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-4">
          <BusinessCharacterQuickviewHpCard
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
            <BusinessCharacterQuickviewHitDiceCard
              :classes="character.classes"
              :hit-dice-used="state.hitDiceUsed"
              @adjust="adjustHitDiceUsed"
            />
            <BusinessCharacterQuickviewDeathSavesCard
              :active="displayCurrentHp === 0"
              :successes="state.deathSaves.successes"
              :failures="state.deathSaves.failures"
              @set-success="setDeathSaveSuccess"
              @set-failure="setDeathSaveFailure"
              @roll-nat20="healHp(1)"
            />
          </div>
        </div>
        <BusinessCharacterQuickviewBattleCard
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
        <BusinessCharacterQuickviewSavingThrowList
          :ability-scores="totalAbilityScores"
          :proficiency-bonus="proficiencyBonus"
          :proficiencies="savingThrowProficiencies"
          :adjustments="state.savingThrowAdjustments"
          :spellcasting-abilities="character.spellcastingAbilities"
          :custom-spellcasting-bonuses="character.customSpellcastingBonuses"
          @adjust="adjustSavingThrow"
        />
        <BusinessCharacterQuickviewSkillList
          :ability-scores="totalAbilityScores"
          :proficiency-bonus="proficiencyBonus"
          :skills="character.skills"
          :is-jack-of-all-trades="character.isJackOfAllTrades"
        />
      </div>

      <div class="grid items-start gap-4 md:grid-cols-2">
        <BusinessCharacterQuickviewFeatureList
          :features="character.features"
          :feature-uses-spent="state.featureUsesSpent"
          @adjust="adjustFeatureUseSpent"
        />

        <div class="flex flex-col gap-4">
          <BusinessCharacterQuickviewSpellSlotsCard
            v-if="hasAnySlot"
            :spell-slots-base="spellSlotsBase"
            :spell-slots-used="state.spellSlotsUsed"
            :pact-slots-base="pactSlotsBase"
            :pact-slots-used="state.pactSlotsUsed"
            @adjust-spell="adjustSpellSlotUsed"
            @adjust-pact="adjustPactSlotUsed"
          />

          <BusinessCharacterQuickviewAttackList
            :attacks="character.attacks"
            :ability-scores="totalAbilityScores"
            :proficiency-bonus="proficiencyBonus"
          />
        </div>
      </div>

      <BusinessCharacterQuickviewRollDrawer
        :character="character"
        :ability-scores="totalAbilityScores"
        :proficiency-bonus="proficiencyBonus"
        :saving-throw-proficiencies="savingThrowProficiencies"
        :saving-throw-adjustments="state.savingThrowAdjustments"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@ui'
import { useCharacterCombatState } from '~/composables/domain/useCharacterCombatState'
import { useCharacterDerivedStatsFromCharacter } from '~/composables/domain/useCharacterDerivedStats'
import {
  getSuggestedPactSlots,
  getSuggestedRegularSpellSlots,
  mergeSlots,
} from '~/helpers/spell-slots'
import type { CharacterDTO } from '@rolling-dice-app/core'

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
} = useCharacterCombatState(props.character.id, totalHp)

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
</script>
