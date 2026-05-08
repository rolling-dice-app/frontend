<template>
  <section aria-labelledby="quickview-features-label">
    <h3 id="quickview-features-label" class="mb-2 font-display text-sm font-bold text-content">
      特性
    </h3>

    <p v-if="features.length === 0" class="py-6 text-center text-sm text-content-muted">
      尚未設定任何特性
    </p>

    <Accordion v-else multiple class="feature-accordion grid items-start gap-2 sm:grid-cols-2">
      <AccordionItem
        v-for="feature in features"
        :key="feature.id"
        :value="feature.id"
        class="overflow-hidden rounded-lg border border-border-soft bg-surface"
      >
        <template #title>
          <div class="flex min-h-7 min-w-0 flex-1 items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-sm font-semibold text-content">{{ feature.name }}</span>
                <Badge
                  size="sm"
                  :bg-color="FEATURE_SOURCE_BADGE_STYLES[feature.source].bgColor"
                  :text-color="FEATURE_SOURCE_BADGE_STYLES[feature.source].textColor"
                >
                  {{ FEATURE_SOURCE_LABELS[feature.source] }}
                </Badge>
                <Badge v-if="feature.usage.hasUses" size="sm" bg-color="var(--color-surface-2)">
                  {{ FEATURE_RECOVERY_LABELS[feature.usage.recovery] }}
                </Badge>
              </div>
            </div>

            <div v-if="feature.usage.hasUses" class="flex shrink-0 items-center gap-1">
              <span
                role="button"
                :tabindex="canDecrement(feature) ? 0 : -1"
                :aria-label="`${feature.name} -1`"
                :aria-disabled="!canDecrement(feature)"
                class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-content-muted"
                @click.stop="onDecrement(feature)"
                @keydown.enter.stop.prevent="onDecrement(feature)"
                @keydown.space.stop.prevent="onDecrement(feature)"
              >
                <Icon name="minus" :size="14" />
              </span>
              <span class="min-w-12 text-center text-base font-bold text-content">
                {{ getCurrent(feature) }}
                <span class="text-xs text-content-muted">/{{ feature.usage.max }}</span>
              </span>
              <span
                role="button"
                :tabindex="canIncrement(feature) ? 0 : -1"
                :aria-label="`${feature.name} +1`"
                :aria-disabled="!canIncrement(feature)"
                class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-content-muted"
                @click.stop="onIncrement(feature)"
                @keydown.enter.stop.prevent="onIncrement(feature)"
                @keydown.space.stop.prevent="onIncrement(feature)"
              >
                <Icon name="plus" :size="14" />
              </span>
            </div>
          </div>
        </template>

        <p v-if="feature.description" class="text-xs whitespace-pre-line text-content-muted">
          {{ feature.description }}
        </p>
        <p v-else class="text-xs text-content-muted">（無說明）</p>
      </AccordionItem>
    </Accordion>
  </section>
</template>

<script setup lang="ts">
import { Accordion, AccordionItem, Badge, Icon } from '@ui'
import { FEATURE_RECOVERY_LABELS, FEATURE_SOURCE_LABELS } from '~/constants/features'
import { FEATURE_SOURCE_BADGE_STYLES } from '~/components/business/character/feature-badge-styles'
import type { CharacterFeature } from '@rolling-dice-app/core'

const props = defineProps<{
  features: CharacterFeature[]
  featureUsesSpent: Partial<Record<string, number>>
}>()

const emit = defineEmits<{
  /** delta 為「對 spent 的調整」：消耗為 +1、恢復為 -1 */
  adjust: [id: string, delta: number, max: number]
}>()

const getCurrent = (feature: CharacterFeature): number => {
  if (!feature.usage.hasUses) return 0
  const spent = props.featureUsesSpent[feature.id] ?? 0
  return Math.min(feature.usage.max, Math.max(0, feature.usage.max - spent))
}

const canDecrement = (feature: CharacterFeature): boolean => {
  if (!feature.usage.hasUses) return false
  return getCurrent(feature) > 0
}

const canIncrement = (feature: CharacterFeature): boolean => {
  if (!feature.usage.hasUses) return false
  return getCurrent(feature) < feature.usage.max
}

const onDecrement = (feature: CharacterFeature): void => {
  if (!feature.usage.hasUses || !canDecrement(feature)) return
  emit('adjust', feature.id, 1, feature.usage.max)
}

const onIncrement = (feature: CharacterFeature): void => {
  if (!feature.usage.hasUses || !canIncrement(feature)) return
  emit('adjust', feature.id, -1, feature.usage.max)
}
</script>

<style scoped>
.feature-accordion :deep(button:hover:not(:disabled)) {
  background-color: var(--color-info-soft);
}
</style>
