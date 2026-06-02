<template>
  <section aria-labelledby="quickview-hit-dice-label">
    <h3 id="quickview-hit-dice-label" class="mb-2 font-display text-sm font-bold text-content">
      {{ t('class.hitDie') }}
    </h3>

    <p
      v-if="classes.length === 0"
      class="rounded-lg border border-dashed border-border-soft bg-surface px-3 py-6 text-center text-xs text-content-muted"
    >
      {{ t('class.emptyClass') }}
    </p>

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="entry in classes"
        :key="entry.classKey"
        class="flex items-center justify-between gap-2 rounded-lg border border-border-soft bg-surface pl-3 pr-2 py-2"
      >
        <div class="flex min-w-0 flex-wrap items-center gap-1.5">
          <span class="text-sm font-semibold text-content">
            {{ t(`class.label.${entry.classKey}`) }}
          </span>
          <CommonAppBadge variant="default" size="sm">
            d{{ CLASS_CONFIG[entry.classKey].hitDie }}
          </CommonAppBadge>
        </div>

        <div class="flex shrink-0 items-center">
          <button
            type="button"
            :disabled="!canDecrement(entry)"
            :aria-label="`${t(`class.label.${entry.classKey}`)} ${t('class.hitDie')} -1`"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-content-muted"
            @click="onDecrement(entry)"
          >
            <Icon name="minus" :size="14" />
          </button>
          <span class="min-w-12 text-center text-base font-bold text-content">
            {{ getRemaining(entry) }}
            <span class="text-xs text-content-muted">/{{ entry.level }}</span>
          </span>
          <button
            type="button"
            :disabled="!canIncrement(entry)"
            :aria-label="`${t(`class.label.${entry.classKey}`)} ${t('class.hitDie')} +1`"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-raised hover:text-content disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-content-muted"
            @click="onIncrement(entry)"
          >
            <Icon name="plus" :size="14" />
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import { CLASS_CONFIG } from '~/constants/dnd'
import type { ClassEntry, ClassKey } from '@rolling-dice-app/core'

const { t } = useI18n()

const props = defineProps<{
  classes: ClassEntry[]
  hitDiceUsed: Partial<Record<ClassKey, number>>
}>()

const emit = defineEmits<{
  adjust: [classKey: ClassKey, delta: number, level: number]
}>()

const getUsed = (entry: ClassEntry): number => {
  return props.hitDiceUsed[entry.classKey] ?? 0
}

const getRemaining = (entry: ClassEntry): number => {
  return Math.max(0, entry.level - getUsed(entry))
}

const canDecrement = (entry: ClassEntry): boolean => {
  return getRemaining(entry) > 0
}

const canIncrement = (entry: ClassEntry): boolean => {
  return getRemaining(entry) < entry.level
}

// state 存「已使用數」、UI 顯示「剩餘」，故 -1 按鈕送出 +1 delta（消耗一顆）
const onDecrement = (entry: ClassEntry): void => {
  if (!canDecrement(entry)) return
  emit('adjust', entry.classKey, 1, entry.level)
}

const onIncrement = (entry: ClassEntry): void => {
  if (!canIncrement(entry)) return
  emit('adjust', entry.classKey, -1, entry.level)
}
</script>
