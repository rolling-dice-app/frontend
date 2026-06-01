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
        :character="shared.character"
        :owner-display-name="shared.ownerDisplayName"
      />

      <BusinessCharacterDetailProfileTab :character="shared.character" />

      <BusinessCharacterShareAttackList
        :attacks="shared.character.attacks"
        :ability-scores="totalAbilityScores"
        :proficiency-bonus="proficiencyBonus"
      />

      <BusinessCharacterShareSpellList :entries="shared.spells" />

      <BusinessCharacterShareInventoryView
        :character="shared.character"
        :items="inventoryItems"
        :currency="shared.currency"
        :attuned-cap="attunedCap"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computeAttunedLimit, type SharedCharacterProfileDTO } from '@rolling-dice-app/core'
import type { SharedInventoryItemViewModel } from '~/types/business/share'

const { t } = useI18n()
const route = useRoute()
const shareId = computed(() => String(route.params.shareId))

const { data: shared, status } = await useAsyncData(
  () => `shared-character-${shareId.value}`,
  () => share().getCharacter(shareId.value),
)

// 公開頁不可用（無效 / 已關閉分享）回 404
if (status.value === 'error' || !shared.value) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}

useHead({ title: t('character.share.pageTitle') })

// 公開投影 item 無 id；為 :key 與展開狀態合成穩定鍵。
const inventoryItems = computed<SharedInventoryItemViewModel[]>(() =>
  (shared.value?.inventory ?? []).map((item, index) => ({
    ...item,
    id: `shared-${index}`,
  })),
)

// shared.value! 安全：以下 computed 與 derived-stats 皆 lazy，僅在 template `v-else`
// （shared 已確定存在）分支被存取；useCharacterDerivedStatsFromCharacter 要求 non-null
// Ref，改 nullable 會外溢其簽章，故此處保留 assertion。
const characterRef = computed<SharedCharacterProfileDTO>(() => shared.value!.character)
const attunedCap = computed(() => computeAttunedLimit(characterRef.value))
const { totalAbilityScores, proficiencyBonus } = useCharacterDerivedStatsFromCharacter(characterRef)
</script>
