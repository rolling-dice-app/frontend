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
        v-for="entry in entries"
        :key="entry.id"
        :value="entry.id"
        class="overflow-hidden rounded-lg border border-border-soft bg-canvas-elevated"
      >
        <template #title>
          <div class="flex min-w-0 flex-1 items-start justify-between gap-3 pr-3">
            <h3 class="min-w-0 flex-1 truncate text-base font-bold text-content">
              {{ entry.title }}
            </h3>
            <span class="shrink-0 text-xs text-content-muted">{{ entry.date }}</span>
          </div>
        </template>

        <p v-if="entry.content" class="text-sm whitespace-pre-line text-content">
          {{ entry.content }}
        </p>
        <p v-else class="text-xs text-content-muted">{{ t('inventory.emptyContent') }}</p>

        <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular">
          <span v-if="moneyPartsOf(entry).length === 0" class="text-content-muted">
            {{ t('inventory.noMoneyEarned') }}
          </span>
          <span v-for="part in moneyPartsOf(entry)" :key="part.key">
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
import type { CampaignRecordDTO, CurrencyKey } from '@rolling-dice-app/core'

const { t } = useI18n()

const props = defineProps<{
  entries: CampaignRecordDTO[]
}>()

const expandedIds = ref<string[]>([])

const totalExpEarned = computed(() =>
  props.entries.reduce((sum, entry) => sum + entry.expEarning, 0),
)

const currencyLabels = computed<Record<CurrencyKey, string>>(() => ({
  cp: t('inventory.cpShort'),
  sp: t('inventory.spShort'),
  gp: t('inventory.gpShort'),
  pp: t('inventory.ppShort'),
}))

const moneyPartsOf = (entry: CampaignRecordDTO) => {
  const keys: CurrencyKey[] = ['pp', 'gp', 'sp', 'cp']
  return keys
    .filter((key) => entry.moneyEarning[key] > 0)
    .map((key) => ({ key, label: currencyLabels.value[key], value: entry.moneyEarning[key] }))
}
</script>

<style scoped>
.share-campaigns-accordion :deep(button:hover:not(:disabled)) {
  background-color: var(--color-info-soft);
}
</style>
