<template>
  <section
    class="space-y-4 rounded-lg border border-border bg-canvas-elevated p-4"
    aria-labelledby="share-campaigns-label"
  >
    <div class="flex flex-wrap items-center gap-3">
      <h2 id="share-campaigns-label" class="font-display text-lg font-bold text-content">
        {{ t('character.campaignRecord') }}
      </h2>
      <span class="text-xs text-content-muted">
        {{ entries.length }} {{ t('character.campaignCount') }}
      </span>
      <span class="ml-auto text-xs text-content-muted">
        {{ t('character.expEarnedTotal') }}
        <span class="ml-1 font-medium text-content">{{ totalExpEarned }}</span>
      </span>
    </div>

    <p
      v-if="entries.length === 0"
      class="rounded-lg border border-dashed border-border-soft bg-surface-2 px-3 py-8 text-center text-xs text-content-muted"
    >
      {{ t('character.emptyCampaignMessage') }}
    </p>

    <Accordion
      v-else
      v-model="expandedIds"
      multiple
      class="share-campaigns-accordion flex flex-col gap-2"
    >
      <AccordionItem
        v-for="{ entry, moneyParts } in campaignViews"
        :key="entry.id"
        :value="entry.id"
        class="overflow-hidden rounded-lg border border-border-soft bg-canvas-elevated"
      >
        <template #title>
          <div class="flex min-w-0 flex-1 items-start justify-between gap-3 pr-3">
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-base font-bold text-content">
                {{ entry.title }}
              </h3>
              <p v-if="entry.subtitle" class="truncate text-xs text-content-muted">
                {{ entry.subtitle }}
              </p>
            </div>
            <span class="shrink-0 text-xs text-content-muted">{{ entry.date }}</span>
          </div>
        </template>

        <p v-if="entry.content" class="text-sm whitespace-pre-line text-content">
          {{ entry.content }}
        </p>
        <p v-else class="text-xs text-content-muted">{{ t('inventory.emptyContent') }}</p>

        <BusinessCharacterDetailCampaignsTeammateChipList
          v-if="entry.teammates.length > 0"
          class="mt-3"
          :teammates="entry.teammates"
        />

        <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular">
          <span v-if="moneyParts.length === 0" class="text-content-muted">
            {{ t('inventory.noMoneyEarned') }}
          </span>
          <span v-for="part in moneyParts" :key="part.key">
            <span class="text-content-muted">{{ part.label }}</span>
            <span class="ml-1 font-medium text-content">{{ part.value }}</span>
          </span>
          <span class="ml-auto">
            <span class="text-content-muted">{{ t('inventory.expGained') }}</span>
            <span class="ml-1 font-medium text-content">{{ entry.expEarning }}</span>
          </span>
        </div>
      </AccordionItem>
    </Accordion>
  </section>
</template>

<script setup lang="ts">
import { Accordion, AccordionItem } from '@ui'
import type { CampaignRecordDTO } from '@rolling-dice-app/core'

const { t } = useI18n()

const props = defineProps<{
  entries: CampaignRecordDTO[]
}>()

const expandedIds = ref<string[]>([])

const totalExpEarned = computed(() =>
  props.entries.reduce((sum, entry) => sum + entry.expEarning, 0),
)

const toMoneyParts = useMoneyEarningParts()
// 連同 money parts 一起算成 view model，避免在 template 對每筆 entry 重複呼叫（原本一筆算兩次）。
const campaignViews = computed(() =>
  props.entries.map((entry) => ({ entry, moneyParts: toMoneyParts(entry.moneyEarning) })),
)
</script>

<style scoped>
.share-campaigns-accordion :deep(button:hover:not(:disabled)) {
  background-color: var(--color-info-soft);
}
</style>
