<template>
  <div class="mx-auto max-w-6xl px-4 py-6">
    <div
      v-if="status === 'pending' || status === 'idle'"
      role="status"
      aria-busy="true"
      class="flex min-h-[60dvh] items-center justify-center text-content-muted"
    >
      <span class="sr-only">{{ t('ui.state.loading') }}</span>
      <div
        class="size-8 animate-spin motion-reduce:animate-none rounded-full border-2 border-border border-t-primary"
        aria-hidden="true"
      />
    </div>

    <div
      v-else-if="status === 'error' || !shared"
      class="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center text-content-muted"
      role="alert"
    >
      <p class="font-display text-2xl text-content">{{ t('character.share.unavailable') }}</p>
      <p class="text-sm">{{ t('character.share.unavailableHint') }}</p>
    </div>

    <div v-else class="space-y-4">
      <BusinessCharacterShareSummaryHeader
        :character="character"
        :owner-display-name="shared.ownerDisplayName"
      />

      <BusinessCharacterDetailProfileTab :character="character" />

      <BusinessCharacterShareAttackList
        :attacks="character.attacks"
        :ability-scores="totalAbilityScores"
        :proficiency-bonus="proficiencyBonus"
      />

      <BusinessCharacterShareSpellList :spells="joinedSpells" />

      <BusinessCharacterShareInventoryView
        :character="character"
        :items="inventoryItems"
        :currency="currency"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  CharacterCurrencyDTO,
  CharacterDTO,
  InventoryItemDTO,
  SpellDTO,
} from '@rolling-dice-app/core'

const { t } = useI18n()
const route = useRoute()
const shareId = computed(() => String(route.params.shareId))

const { data: shared, status } = await useAsyncData(
  () => `shared-character-${shareId.value}`,
  () => share().getCharacter(shareId.value),
)

useHead({ title: t('character.share.pageTitle') })

// 公開投影缺 id / 時間戳 / 擁有者旗標；這些唯讀元件不渲染這些欄位，
// 以中性值補足型別即可（純前端 view-model，不持久化）。
const character = computed<CharacterDTO>(() => ({
  ...shared.value!.character,
  id: '',
  createdAt: '',
  updatedAt: '',
  shareable: true,
  shareId: shareId.value,
}))

const inventoryItems = computed<InventoryItemDTO[]>(() =>
  (shared.value?.inventory ?? []).map((item, index) => ({
    ...item,
    id: `shared-${index}`,
    createdAt: '',
    updatedAt: '',
  })),
)

const currency = computed<CharacterCurrencyDTO>(() => ({
  ...shared.value!.currency,
  updatedAt: '',
}))

// 法術以 spellId join 公開法術圖鑑；圖鑑未就緒或查無則略過該筆。
const { getSpell } = useSpells()
const joinedSpells = computed<SpellDTO[]>(() =>
  (shared.value?.spells ?? [])
    .map((entry) => getSpell(entry.spellId))
    .filter((spell): spell is SpellDTO => spell !== undefined),
)

const characterRef = computed(() => character.value)
const { totalAbilityScores, proficiencyBonus } = useCharacterDerivedStatsFromCharacter(characterRef)
</script>
