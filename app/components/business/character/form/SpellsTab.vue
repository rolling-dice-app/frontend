<template>
  <div class="bg-canvas-elevated p-4 sm:p-6">
    <p v-if="pending" class="py-12 text-center text-content-muted">
      {{ t('spell.loadingMessage') }}
    </p>
    <div v-else-if="error" class="flex flex-col items-center gap-3 py-12 text-center">
      <p class="text-danger">{{ t('spell.loadFailed') }}</p>
      <Button size="sm" bg-color="var(--color-warning)" :radius="4" @click="refresh()">
        {{ t('ui.state.retry') }}
      </Button>
    </div>
    <div v-else class="flex flex-col gap-6 md:flex-row md:items-start">
      <BusinessCharacterFormSpellsSpellBookPanel
        ref="spellBookRef"
        v-model:form-state="formState"
        class="min-w-0 md:flex-2"
      />

      <div class="flex min-w-0 flex-col gap-4 md:sticky md:top-4 md:flex-1">
        <BusinessCharacterFormSpellsSpellcastingAbilitySelect
          v-model:abilities="formState.spellcastingAbilities"
        />
        <BusinessCharacterFormSpellsSpellcastingModifiersList
          v-model:custom-bonuses="formState.customSpellcastingBonuses"
          :selected-abilities="formState.spellcastingAbilities"
          :proficiency-bonus="proficiencyBonus"
          :ability-scores="abilityScores"
        />
        <BusinessCharacterFormSpellsSpellSlotsPanel
          v-model:spell-slots-delta="formState.spellSlotsDelta"
          v-model:pact-slots-delta="formState.pactSlotsDelta"
          :classes="formState.classes"
        />
        <BusinessCharacterFormSpellsLearnedSpellList
          :spells="formState.spells"
          @select="onSelectLearned"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@ui'
import type { CharacterUpdateFormState, TotalAbilityScores } from '~/types/business/character-form'

const { t } = useI18n()

const formState = defineModel<CharacterUpdateFormState>('formState', { required: true })

defineProps<{
  proficiencyBonus: number
  abilityScores: TotalAbilityScores
}>()

const { pending, error, refresh } = useSpells()

const spellBookRef = ref<{ focusSpell: (id: string) => Promise<void> } | null>(null)

const onSelectLearned = (id: string): void => {
  spellBookRef.value?.focusSpell(id)
}
</script>
