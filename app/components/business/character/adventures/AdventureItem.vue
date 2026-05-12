<template>
  <AccordionItem
    :value="entry.id"
    class="overflow-hidden rounded-lg border border-border-soft bg-canvas-elevated"
  >
    <template #title>
      <div class="flex min-w-0 flex-1 items-start justify-between gap-3 pr-3">
        <h4 class="min-w-0 flex-1 truncate text-base font-bold text-content">
          {{ entry.name }}
        </h4>

        <div class="flex shrink-0 flex-col items-end gap-1.5">
          <div class="flex items-center gap-1">
            <span
              role="button"
              tabindex="0"
              :aria-label="`${t('ui.action.edit')} ${entry.name}`"
              class="flex size-7 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-raised hover:text-content"
              @click.stop="$emit('edit', entry)"
              @keydown.enter.stop.prevent="$emit('edit', entry)"
              @keydown.space.stop.prevent="$emit('edit', entry)"
            >
              <Icon name="edit" :size="14" />
            </span>
            <span
              role="button"
              tabindex="0"
              :aria-label="`${t('ui.action.delete')} ${entry.name}`"
              class="flex size-7 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:text-danger-hover"
              @click.stop="$emit('remove', entry.id)"
              @keydown.enter.stop.prevent="$emit('remove', entry.id)"
              @keydown.space.stop.prevent="$emit('remove', entry.id)"
            >
              <Icon name="trash" :size="14" />
            </span>
          </div>
          <span class="text-xs text-content-muted">{{ entry.date }}</span>
        </div>
      </div>
    </template>

    <p v-if="entry.content" class="text-sm whitespace-pre-line text-content">
      {{ entry.content }}
    </p>
    <p v-else class="text-xs text-content-muted">{{ t('inventory.emptyContent') }}</p>

    <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
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
</template>

<script setup lang="ts">
import { AccordionItem, Icon } from '@ui'
import type { CurrencyKey } from '@rolling-dice-app/core'
import type { AdventureEntry } from '~/types/business/adventure'

const { t } = useI18n()

const props = defineProps<{
  entry: AdventureEntry
}>()

defineEmits<{
  edit: [entry: AdventureEntry]
  remove: [id: string]
}>()

const currencyLabels = computed<Record<CurrencyKey, string>>(() => ({
  cp: t('inventory.cpShort'),
  sp: t('inventory.spShort'),
  gp: t('inventory.gpShort'),
  pp: t('inventory.ppShort'),
}))

const moneyParts = computed(() => {
  const keys: CurrencyKey[] = ['pp', 'gp', 'sp', 'cp']
  return keys
    .filter((k) => props.entry.moneyEarning[k] > 0)
    .map((k) => ({ key: k, label: currencyLabels.value[k], value: props.entry.moneyEarning[k] }))
})
</script>
