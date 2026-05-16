<template>
  <div class="mx-auto max-w-6xl px-4 pb-10">
    <CommonPageHeader :title="t('character.share.pageTitle')" :show-back="true" />

    <div class="space-y-4">
      <BusinessCharacterShareSummaryHeader
        :character="character"
        :owner-display-name="shareView.ownerDisplayName"
      />

      <BusinessCharacterDetailTab :character="character" />

      <section
        class="rounded-lg border border-border bg-canvas-elevated p-4"
        aria-labelledby="share-attacks-label"
      >
        <h2 id="share-attacks-label" class="mb-3 font-display text-lg font-bold text-content">
          {{ t('combat.attackModule') }}
        </h2>
        <BusinessCharacterQuickviewAttackList
          :attacks="character.attacks"
          :ability-scores="totalAbilityScores"
          :proficiency-bonus="proficiencyBonus"
        />
      </section>

      <BusinessCharacterShareSpellList :spells="shareView.learnedSpells" />

      <BusinessCharacterShareInventoryView
        :character="character"
        :items="shareView.inventoryItems"
        :currency="shareView.currency"
      />

      <BusinessCharacterShareCampaignList :entries="shareView.campaignRecords" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { shareCharacterMock } from '~/mocks/share-character'

const { t } = useI18n()

useHead({ title: t('character.share.pageTitle') })

// Mock 階段：忽略路由參數，直接吃 fixture。backend 上線後改以分享端點依 id 取得。
const shareView = shareCharacterMock
const character = computed(() => shareView.character)

const { totalAbilityScores, proficiencyBonus } = useCharacterDerivedStatsFromCharacter(character)
</script>
