<template>
  <div
    class="relative grid cursor-pointer grid-cols-[20px_44px_minmax(100px,1.2fr)_minmax(110px,1fr)_auto] items-center gap-2 border-b border-border-soft py-1.5 pl-2 pr-2.5 last:border-b-0"
    :class="[
      active
        ? 'bg-primary-soft before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary'
        : 'bg-surface',
      selected ? 'ring-2 ring-inset ring-primary' : '',
    ]"
    data-testid="battlefield-combat-row"
    :data-unit-name="unit.name"
    @click="onRowActivate"
  >
    <span
      class="select-none text-center text-sm text-content-faint"
      :class="dragging ? 'cursor-grabbing' : 'cursor-grab'"
      style="touch-action: none"
      :title="t('battlefield.dragHandleTitle')"
      aria-hidden="true"
      @pointerdown="emit('dragStart', $event)"
      @click.stop
    >
      ⠿
    </span>

    <span class="flex justify-center" @click.stop>
      <input
        type="number"
        class="w-10 rounded-md border border-transparent bg-transparent text-center text-base font-bold tabular-nums outline-none [appearance:textfield] hover:border-border focus:border-primary focus:bg-canvas-inset [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        :value="unit.initiative ?? ''"
        placeholder="—"
        :aria-label="t('battlefield.initiativeAria', { name: unit.name })"
        :title="t('battlefield.initiativeEditTitle')"
        @change="onInitiativeChange"
        @keydown.enter="($event.target as HTMLInputElement).blur()"
      />
    </span>

    <span class="flex min-w-0 flex-col gap-0.5">
      <!-- 選取入口是這顆真 button：整列曾掛 role="button"，但列內還有先攻 input 與上下移
           按鈕 —— 互動元素不可巢狀於 button role。整列的 click 保留給指標操作。 -->
      <button
        type="button"
        class="flex min-w-0 items-center gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :aria-label="t('battlefield.selectUnitAria', { name: unit.name })"
        :aria-pressed="selected"
        @click.stop="onRowActivate"
      >
        <span
          class="size-2 shrink-0 rounded-full"
          :class="FACTION_DOT_CLASS[unit.faction]"
          :title="t(`battlefield.faction.${unit.faction}`)"
        />
        <span class="truncate text-[13px] font-semibold">{{ unit.name }}</span>
        <span
          v-if="unit.hp.current === 0"
          class="shrink-0 text-danger-hover"
          :title="t('battlefield.downMark')"
          >☠</span
        >
      </button>
      <span v-if="unit.conditions.length > 0" class="flex flex-wrap gap-1">
        <BusinessBattlefieldConditionBadgeList :conditions="unit.conditions" :max="2" />
      </span>
    </span>

    <span class="flex min-w-0 flex-col gap-1">
      <BusinessBattlefieldHpBar
        :current-hp="unit.hp.current"
        :max-hp="unitEffectiveMaxHp"
        :temp-hp="unit.hp.tempHp"
      />
      <span class="whitespace-nowrap text-[11px] text-content-muted tabular-nums">
        <b :class="hpNumberClass">{{ unit.hp.current }}</b
        >/{{ unitEffectiveMaxHp
        }}<span v-if="unit.hp.tempHp > 0" class="text-info-hover"> +{{ unit.hp.tempHp }}</span>
      </span>
    </span>

    <span class="flex gap-0.5" @click.stop>
      <button
        type="button"
        class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-2 hover:text-content"
        :aria-label="`${t('battlefield.moveUp')} ${unit.name}`"
        @click="emit('moveUp')"
      >
        <Icon name="chevron-up" :size="14" />
      </button>
      <button
        type="button"
        class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-2 hover:text-content"
        :aria-label="`${t('battlefield.moveDown')} ${unit.name}`"
        @click="emit('moveDown')"
      >
        <Icon name="chevron-down" :size="14" />
      </button>
    </span>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import { BATTLEFIELD_LIMITS, type BattlefieldUnit } from '@rolling-dice-app/core'
import { FACTION_DOT_CLASS } from '~/constants/battlefield'

const { t } = useI18n()

const props = defineProps<{
  unit: BattlefieldUnit
  /** 當前行動者 */
  active: boolean
  /** 右欄選取中 */
  selected: boolean
  /** 拖曳中（由 CombatList 標記，僅影響游標與透明度） */
  dragging?: boolean
}>()

const emit = defineEmits<{
  select: []
  setInitiative: [value: number | null]
  moveUp: []
  moveDown: []
  dragStart: [event: PointerEvent]
}>()

const unitEffectiveMaxHp = computed(() => effectiveMaxHp(props.unit))

const hpNumberClass = computed(() => {
  const tier = hpRatioTier(props.unit.hp.current, unitEffectiveMaxHp.value)
  if (tier === 'crit') return 'text-danger-hover'
  if (tier === 'low') return 'text-warning'
  return 'text-content'
})

const onRowActivate = (): void => {
  emit('select')
}

/**
 * 先攻欄是未受控 input（`:value` + `@change`）。store 會把值 clamp 到
 * ±UNIT_INITIATIVE_ABS_MAX，clamp 後若與現值相同，Vue 看不到變化就不會 patch DOM，
 * 輸入框會殘留使用者打的超界數字。故在此就地 clamp 並把正規值寫回 DOM。
 */
const onInitiativeChange = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const next = parseIntegerInput(input.value, undefined, BATTLEFIELD_LIMITS.UNIT_INITIATIVE_ABS_MAX)
  emit('setInitiative', next)
  input.value = next == null ? '' : String(next)
}
</script>
