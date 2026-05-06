<template>
  <section :aria-labelledby="headingId">
    <header class="mb-2 flex items-center justify-between gap-2">
      <h3 :id="headingId" class="font-display text-sm font-bold text-content">法術位</h3>
      <div
        role="tablist"
        aria-label="施法模組"
        class="inline-flex overflow-hidden rounded-md border border-border-soft text-xs"
      >
        <button
          v-for="tab in TABS"
          :id="tab.id"
          :key="tab.value"
          ref="tabButtons"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.value"
          :aria-controls="panelId"
          :tabindex="activeTab === tab.value ? 0 : -1"
          :class="[
            'px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            activeTab === tab.value
              ? 'bg-surface-2 font-semibold text-content'
              : 'bg-surface text-content-muted hover:bg-surface-hover',
          ]"
          @click="activeTab = tab.value"
          @keydown.left.prevent="onTabArrow(-1)"
          @keydown.right.prevent="onTabArrow(1)"
          @keydown.home.prevent="onTabJump(0)"
          @keydown.end.prevent="onTabJump(TABS.length - 1)"
        >
          {{ tab.label }}
        </button>
      </div>
    </header>

    <div
      :id="panelId"
      role="tabpanel"
      :aria-labelledby="activeTabId"
      class="grid grid-cols-3 gap-2"
    >
      <div
        v-for="level in SPELL_LEVELS"
        :key="level"
        class="flex flex-col items-center gap-1 rounded-lg border border-border-soft bg-surface px-2 py-2"
        :class="{ 'opacity-40': getMax(level) === 0 }"
      >
        <span class="text-xs text-content-muted">{{ level }} 環</span>
        <div class="flex items-center gap-1">
          <span
            role="button"
            :tabindex="canDecrement(level) ? 0 : -1"
            :aria-label="`${activeTabLabel} ${level} 環 -1`"
            :aria-disabled="!canDecrement(level)"
            class="flex size-6 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-content-muted"
            @click="onDecrement(level)"
            @keydown.enter.prevent="onDecrement(level)"
            @keydown.space.prevent="onDecrement(level)"
          >
            <Icon name="minus" :size="14" />
          </span>
          <span class="min-w-10 text-center text-sm font-bold text-content">
            {{ getRemaining(level) }}
            <span class="text-xs text-content-muted">/{{ getMax(level) }}</span>
          </span>
          <span
            role="button"
            :tabindex="canIncrement(level) ? 0 : -1"
            :aria-label="`${activeTabLabel} ${level} 環 +1`"
            :aria-disabled="!canIncrement(level)"
            class="flex size-6 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-content-muted"
            @click="onIncrement(level)"
            @keydown.enter.prevent="onIncrement(level)"
            @keydown.space.prevent="onIncrement(level)"
          >
            <Icon name="plus" :size="14" />
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import type { SpellLevel, SpellSlots } from '@rolling-dice-app/core'

type SlotTab = 'regular' | 'pact'

const SPELL_LEVELS: readonly SpellLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const props = defineProps<{
  spellSlotsBase: SpellSlots
  spellSlotsUsed: Partial<Record<SpellLevel, number>>
  pactSlotsBase: SpellSlots
  pactSlotsUsed: Partial<Record<SpellLevel, number>>
}>()

const emit = defineEmits<{
  adjustSpell: [level: SpellLevel, delta: number, max: number]
  adjustPact: [level: SpellLevel, delta: number, max: number]
}>()

const headingId = useId()
const panelId = useId()
const TABS: readonly { value: SlotTab; label: string; id: string }[] = [
  { value: 'regular', label: '一般', id: useId() },
  { value: 'pact', label: '契術', id: useId() },
]

const activeTab = ref<SlotTab>('regular')
const tabButtons = ref<HTMLButtonElement[]>([])
const activeTabId = computed(() => TABS.find((t) => t.value === activeTab.value)!.id)
const activeTabLabel = computed(() => (activeTab.value === 'pact' ? '契術環位' : '環位'))

const onTabArrow = async (delta: -1 | 1): Promise<void> => {
  const idx = TABS.findIndex((t) => t.value === activeTab.value)
  const nextIdx = (idx + delta + TABS.length) % TABS.length
  activeTab.value = TABS[nextIdx]!.value
  await nextTick()
  tabButtons.value[nextIdx]?.focus()
}

const onTabJump = async (idx: number): Promise<void> => {
  const target = TABS[idx]
  if (!target) return
  activeTab.value = target.value
  await nextTick()
  tabButtons.value[idx]?.focus()
}

const activeBase = computed<SpellSlots>(() =>
  activeTab.value === 'pact' ? props.pactSlotsBase : props.spellSlotsBase,
)
const activeUsed = computed<Partial<Record<SpellLevel, number>>>(() =>
  activeTab.value === 'pact' ? props.pactSlotsUsed : props.spellSlotsUsed,
)

const getMax = (level: SpellLevel): number => activeBase.value[level] ?? 0

const getRemaining = (level: SpellLevel): number => {
  return Math.max(0, getMax(level) - (activeUsed.value[level] ?? 0))
}

const canDecrement = (level: SpellLevel): boolean => getMax(level) > 0 && getRemaining(level) > 0
const canIncrement = (level: SpellLevel): boolean =>
  getMax(level) > 0 && getRemaining(level) < getMax(level)

const emitAdjust = (level: SpellLevel, delta: number): void => {
  const max = getMax(level)
  if (activeTab.value === 'pact') emit('adjustPact', level, delta, max)
  else emit('adjustSpell', level, delta, max)
}

const onDecrement = (level: SpellLevel): void => {
  if (!canDecrement(level)) return
  emitAdjust(level, 1)
}

const onIncrement = (level: SpellLevel): void => {
  if (!canIncrement(level)) return
  emitAdjust(level, -1)
}
</script>
