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
          儲存
        </Button>
      </template>
    </CommonPageHeader>

    <CommonNotFound
      v-if="!character"
      message="找不到此角色"
      back-to="/character"
      back-label="返回角色列表"
    />

    <template v-else>
      <Tabs
        v-model="activeTab"
        type="border"
        active-color="var(--color-canvas-elevated)"
        inactive-color="var(--color-canvas)"
        label="編輯角色卡"
      >
        <Tab value="basic">
          <template #label>
            <span class="text-content">基本資訊</span>
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
            <span class="text-content">詳細設定</span>
          </template>
          <BusinessCharacterFormProfileTab v-model:form-state="formState" />
        </Tab>

        <Tab value="features">
          <template #label>
            <span class="text-content">專長與特性</span>
          </template>
          <BusinessCharacterFormFeaturesTab v-model:form-state="formState" />
        </Tab>

        <Tab value="combat">
          <template #label>
            <span class="text-content">戰鬥模組</span>
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
            <span class="text-content">法術書</span>
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

const route = useRoute()
const id = getRouteParam(route.params.id)

useHead({ title: '編輯角色卡' })

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
