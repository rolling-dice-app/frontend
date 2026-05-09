<template>
  <div class="mx-auto max-w-6xl px-4 pb-6">
    <CommonPageHeader title="Edit Character" :show-back="true">
      <template #actions>
        <Button
          :disabled="!canSubmit"
          :loading="isSubmitting"
          :radius="4"
          class="w-20"
          bg-color="var(--color-primary)"
          @click="submit"
        >
          {{ t('ui.action.save') }}
        </Button>
      </template>
    </CommonPageHeader>

    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="flex min-h-[60dvh] items-center justify-center text-content-muted"
      role="status"
      aria-live="polite"
    >
      {{ t('ui.state.loading') }}
    </div>

    <CommonNotFound
      v-else-if="status === 'error' || !character"
      :message="t('character.notFound')"
      back-to="/character"
      :back-label="t('character.backToList')"
    />

    <template v-else>
      <!-- Read-only banner -->
      <div
        class="mb-4 rounded-md border border-border bg-surface px-4 py-3 text-sm text-content-muted"
        role="status"
      >
        {{ t('ui.readOnly.updateBanner') }}
      </div>

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
          <BusinessCharacterFormProfileTab v-model:form-state="formState" />
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { Button, Tab, Tabs } from '@ui'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const route = useRoute()
const id = getRouteParam(route.params.id)

useHead({ title: t('character.editCharacter') })

const characterStore = useCharacterStore()

const { status } = await useAsyncData(
  () => `character-${id}`,
  () => characterStore.loadDetail(id),
  { lazy: false, watch: [() => id] },
)

const { activeTab, character, formState, isSubmitting, canSubmit, derived, submit } =
  useCharacterUpdate(id)

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
