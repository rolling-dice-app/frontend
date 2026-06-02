<template>
  <section
    aria-labelledby="roll-output-label"
    class="flex h-full min-h-0 flex-col rounded-lg border border-border-soft bg-canvas-inset"
  >
    <header
      class="flex shrink-0 items-center justify-between border-b border-border-soft px-3 py-2"
    >
      <h3 id="roll-output-label" class="font-display text-sm font-bold text-content">
        {{ t('combat.rollResults') }}
      </h3>
      <button
        type="button"
        :aria-label="t('combat.rollClearAria')"
        class="rounded-md px-2 py-0.5 text-xs text-content-muted transition-colors hover:bg-surface-raised hover:text-content focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="entries.length === 0"
        @click="emit('clear')"
      >
        {{ t('combat.rollClear') }}
      </button>
    </header>

    <div class="scrollbar-hidden flex-1 min-h-0 overflow-y-auto">
      <p v-if="entries.length === 0" class="px-3 py-6 text-center text-xs text-content-muted">
        {{ t('combat.rollEmpty') }}
      </p>
      <ul v-else class="divide-y divide-border-soft">
        <li v-for="entry in entries" :key="entry.id" class="px-3 py-2 text-xs">
          <div class="flex items-baseline justify-between gap-2">
            <span class="font-semibold text-content">{{ entry.label }}</span>
            <span
              v-if="
                entry.kind !== 'attack-damage' &&
                entry.kind !== 'hit-die' &&
                entry.kind !== 'raw' &&
                entry.kind !== 'd100' &&
                entry.mode !== 'normal'
              "
              class="rounded px-1.5 py-0.5 text-[10px] tracking-wide"
              :class="
                entry.mode === 'advantage'
                  ? 'bg-success/15 text-success'
                  : 'bg-danger/15 text-danger'
              "
            >
              {{
                entry.mode === 'advantage'
                  ? t('combat.modeAdvantage')
                  : t('combat.modeDisadvantage')
              }}
            </span>
            <span
              v-if="entry.kind === 'attack-damage' && entry.isCritical"
              class="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] tracking-wide text-primary"
            >
              {{ t('combat.critical') }}
            </span>
          </div>

          <!-- 單骰 d4/d6/d8/d10/d12/d20 -->
          <template v-if="entry.kind === 'raw'">
            <div class="mt-1 flex flex-wrap items-center gap-x-1.5 font-mono text-content-soft">
              <span>d{{ entry.sides }}</span>
              <span class="text-content-muted">=</span>
              <span class="font-bold text-content">{{ entry.roll }}</span>
            </div>
          </template>

          <!-- 百分骰 d100 -->
          <template v-else-if="entry.kind === 'd100'">
            <div class="mt-1 flex flex-wrap items-center gap-x-1.5 font-mono text-content-soft">
              <span>d100</span>
              <span>[{{ entry.tens }}, {{ entry.ones }}]</span>
              <span class="text-content-muted">=</span>
              <span class="font-bold text-content">{{ entry.total }}</span>
            </div>
          </template>

          <!-- 生命骰 -->
          <template v-else-if="entry.kind === 'hit-die'">
            <div
              class="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-content-soft"
            >
              <span>d{{ entry.sides }}</span>
              <span class="text-content-muted">=</span>
              <span class="text-content">{{ entry.roll }}</span>
              <span v-if="entry.modifier !== 0">{{ formatModifier(entry.modifier) }}</span>
              <span class="text-content-muted">→</span>
              <span class="font-bold text-success">
                {{ t('combat.heal') }} {{ entry.healed }}
              </span>
            </div>
          </template>

          <!-- d20 類 -->
          <template v-else-if="entry.kind !== 'attack-damage'">
            <div
              class="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-content-soft"
            >
              <span>[</span>
              <template v-for="(roll, idx) in entry.rolls" :key="idx">
                <span :class="rollClass(roll, entry.chosen, entry.mode, idx, entry.rolls)">
                  {{ roll }}
                </span>
                <span v-if="idx < entry.rolls.length - 1">,</span>
              </template>
              <span>]</span>
              <span v-if="entry.modifier !== 0">{{ formatModifier(entry.modifier) }}</span>
              <span class="text-content-muted">=</span>
              <span class="font-bold text-content">{{ entry.total }}</span>
              <span
                v-if="entry.isCritical"
                class="ml-1 rounded bg-success/15 px-1.5 py-0.5 text-[10px] text-success"
              >
                {{ t('combat.natural20') }}
              </span>
              <span
                v-if="entry.isFumble"
                class="ml-1 rounded bg-danger/15 px-1.5 py-0.5 text-[10px] text-danger"
              >
                {{ t('combat.natural1') }}
              </span>
            </div>
          </template>

          <!-- 傷害 -->
          <template v-else>
            <div
              class="mt-1 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 font-mono text-content-soft"
            >
              <template v-for="(line, idx) in entry.lines" :key="idx">
                <span v-if="idx > 0" class="text-content-muted">+</span>
                <span>{{ formatDamageLine(line) }}</span>
              </template>
              <span class="text-content-muted">=</span>
              <span class="font-bold text-content">{{ entry.total }}</span>
            </div>
          </template>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { D20RollEntry, DamageRollLine, RollEntry, RollMode } from '~/types/business/dice'

const { t } = useI18n()

defineProps<{
  entries: RollEntry[]
}>()

const emit = defineEmits<{
  clear: []
}>()

const rollClass = (
  roll: number,
  chosen: D20RollEntry['chosen'],
  mode: RollMode,
  idx: number,
  rolls: number[],
): string => {
  if (mode === 'normal') return 'text-content'
  // 兩顆值相同時只高亮第一個，避免兩個都高亮
  const isFirstChosenIndex = rolls.indexOf(chosen) === idx
  if (roll === chosen && isFirstChosenIndex) {
    return mode === 'advantage'
      ? 'rounded bg-success/15 px-1 font-bold text-success'
      : 'rounded bg-danger/15 px-1 font-bold text-danger'
  }
  return 'text-content-muted'
}

const formatDamageLine = (line: DamageRollLine): string => {
  const typeLabel = line.damageType ? ` ${t(`combat.damageType.${line.damageType}`)}` : ''
  if (line.sides == null) {
    // 純加值行
    return `${line.bonus}${typeLabel}`
  }
  const dice = `${line.count}d${line.sides}`
  const rollsStr = `[${line.rolls.join(',')}]`
  const bonusStr = line.bonus > 0 ? ` +${line.bonus}` : line.bonus < 0 ? ` ${line.bonus}` : ''
  return `${dice} ${rollsStr}${bonusStr}${typeLabel}`
}
</script>
