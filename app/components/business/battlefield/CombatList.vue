<template>
  <div
    v-if="displayUnits.length === 0"
    class="px-4 py-7 text-center text-[13px] text-content-muted"
  >
    {{ t('battlefield.combatEmpty') }}
  </div>
  <div v-else class="flex flex-col">
    <div
      v-for="unit in displayUnits"
      :key="unit.id"
      :ref="(el) => setRowEl(unit.id, el)"
      :class="dragState?.unitId === unit.id && dragState.moved ? 'opacity-55' : ''"
    >
      <BusinessBattlefieldCombatRow
        :unit="unit"
        :active="unit.id === activeUnitId"
        :selected="unit.id === selectedId"
        :dragging="dragState?.unitId === unit.id"
        @select="onSelect(unit.id)"
        @set-initiative="(value) => emit('setInitiative', unit.id, value)"
        @move-up="emit('moveUp', unit.id)"
        @move-down="emit('moveDown', unit.id)"
        @drag-start="(event) => onDragStart(unit.id, event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { BattlefieldUnit } from '~/types/business/battlefield'

const { t } = useI18n()

const props = defineProps<{
  /** 已依 sortOrder 排序的參戰單位 */
  combatants: BattlefieldUnit[]
  activeUnitId: string | null
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [unitId: string]
  setInitiative: [unitId: string, value: number | null]
  moveUp: [unitId: string]
  moveDown: [unitId: string]
  reorder: [orderedIds: string[]]
}>()

// ── 拖曳排序（pointer events，平板可用；↑↓ 鈕為無障礙備援） ──────────────────
const DRAG_THRESHOLD_PX = 4

const dragState = ref<{ unitId: string; startY: number; moved: boolean } | null>(null)
/** 拖曳期間的暫時順序；結束時 emit reorder 後清空、回歸 props 順序 */
const localOrder = ref<string[] | null>(null)
/** 拖曳結束後的殘餘 click 抑制（避免觸發列選取） */
let suppressClick = false

const displayUnits = computed<BattlefieldUnit[]>(() => {
  if (!localOrder.value) return props.combatants
  const byId = new Map(props.combatants.map((u) => [u.id, u]))
  return localOrder.value.flatMap((id) => byId.get(id) ?? [])
})

const rowEls = new Map<string, HTMLElement>()
const setRowEl = (unitId: string, el: Element | ComponentPublicInstance | null): void => {
  if (el instanceof HTMLElement) rowEls.set(unitId, el)
  else rowEls.delete(unitId)
}

const onPointerMove = (event: PointerEvent): void => {
  const drag = dragState.value
  if (!drag) return
  if (Math.abs(event.clientY - drag.startY) > DRAG_THRESHOLD_PX) drag.moved = true
  if (!drag.moved) return

  const order = (localOrder.value ?? props.combatants.map((u) => u.id)).filter(
    (id) => id !== drag.unitId,
  )
  // 以各列中線決定插入位置
  let insertAt = order.length
  for (let i = 0; i < order.length; i += 1) {
    const el = order[i] != null ? rowEls.get(order[i] as string) : undefined
    if (!el) continue
    const rect = el.getBoundingClientRect()
    if (event.clientY < rect.top + rect.height / 2) {
      insertAt = i
      break
    }
  }
  order.splice(insertAt, 0, drag.unitId)
  localOrder.value = order
}

const onPointerEnd = (): void => {
  const drag = dragState.value
  if (!drag) return
  if (drag.moved && localOrder.value) {
    emit('reorder', [...localOrder.value])
    suppressClick = true
    window.setTimeout(() => {
      suppressClick = false
    }, 50)
  }
  dragState.value = null
  localOrder.value = null
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerEnd)
  document.removeEventListener('pointercancel', onPointerEnd)
}

const onDragStart = (unitId: string, event: PointerEvent): void => {
  event.preventDefault()
  dragState.value = { unitId, startY: event.clientY, moved: false }
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerEnd)
  document.addEventListener('pointercancel', onPointerEnd)
}

onBeforeUnmount(() => {
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerEnd)
  document.removeEventListener('pointercancel', onPointerEnd)
})

const onSelect = (unitId: string): void => {
  if (suppressClick) return
  emit('select', unitId)
}

// ── 回合推進後把行動中列捲進視野 ─────────────────────────────────────────────
watch(
  () => props.activeUnitId,
  async (unitId) => {
    if (!unitId || typeof window === 'undefined') return
    await nextTick()
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth'
    rowEls.get(unitId)?.scrollIntoView({ block: 'nearest', behavior })
  },
)
</script>
