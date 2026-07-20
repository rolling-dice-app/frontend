<template>
  <span
    v-for="condition in shown"
    :key="condition.id"
    class="group relative inline-flex items-center gap-0.5 whitespace-nowrap rounded bg-warning px-1.5 py-px text-[11px] font-semibold text-canvas"
    :class="condition.note ? 'cursor-help' : ''"
    :tabindex="condition.note ? 0 : undefined"
  >
    <span :class="condition.note ? 'underline decoration-dotted underline-offset-2' : ''">
      {{ t(`combat.condition.${condition.key}`) }}
    </span>
    <button
      v-if="removable"
      type="button"
      class="opacity-75 hover:opacity-100"
      :aria-label="
        t('battlefield.removeConditionAria', { name: t(`combat.condition.${condition.key}`) })
      "
      @click.stop="emit('remove', condition.id)"
    >
      <Icon name="close" :size="10" />
    </button>
    <!-- 備註 tooltip：hover / 鍵盤 focus 顯示 -->
    <span
      v-if="condition.note"
      class="pointer-events-none absolute bottom-full left-0 z-30 mb-1.5 hidden max-w-64 truncate rounded-md border border-border bg-canvas-inset px-2 py-0.5 text-xs font-normal text-content shadow-elev-3 group-hover:block group-focus-visible:block"
      role="tooltip"
    >
      {{ condition.note }}
    </span>
  </span>
  <span
    v-if="hiddenCount > 0"
    class="inline-flex items-center whitespace-nowrap rounded bg-surface-2 px-1.5 py-px text-[11px] font-semibold text-content-muted tabular-nums"
  >
    +{{ hiddenCount }}
  </span>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import type { BattlefieldCondition } from '~/types/business/battlefield'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    conditions: BattlefieldCondition[]
    /** 顯示移除鈕（右欄面板用） */
    removable?: boolean
    /** compact 顯示上限，超出以 +n 收合；未給則全顯示 */
    max?: number
  }>(),
  { removable: false, max: undefined },
)

const emit = defineEmits<{
  remove: [conditionId: string]
}>()

const shown = computed(() =>
  props.max != null ? props.conditions.slice(0, props.max) : props.conditions,
)
const hiddenCount = computed(() => props.conditions.length - shown.value.length)
</script>
