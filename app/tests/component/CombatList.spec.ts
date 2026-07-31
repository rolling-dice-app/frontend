import { mount } from '@vue/test-utils'
import { onBeforeUnmount } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '~/i18n'
import CombatList from '~/components/business/battlefield/CombatList.vue'
import { createMockBattlefieldUnit } from '~/tests/fixtures/battlefield'
import type { BattlefieldUnit } from '@rolling-dice-app/core'

/**
 * 拖曳排序以各列中線決定插入位置；jsdom 的 rect 一律是 0，故逐列 stub rect 才驅動得了。
 */
const ROW_HEIGHT = 40

// onBeforeUnmount 不在 tests/setup 的 auto-import 清單內（此為第一個用到它的元件測試）
beforeEach(() => {
  vi.stubGlobal('onBeforeUnmount', onBeforeUnmount)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** CombatRow 的替身：只保留拖曳把手與名稱，避免耦合到真實列的內部結構 */
const CombatRowStub = {
  name: 'BusinessBattlefieldCombatRow',
  props: ['unit', 'active', 'selected', 'dragging'],
  emits: ['select', 'setInitiative', 'moveUp', 'moveDown', 'dragStart'],
  template: `
    <div :data-unit="unit.id">
      <span>{{ unit.name }}</span>
      <button
        type="button"
        data-handle
        @pointerdown="$emit('dragStart', $event)"
      >handle</button>
    </div>`,
}

const units: BattlefieldUnit[] = [
  createMockBattlefieldUnit({ id: 'a', name: 'A', inCombat: true, sortOrder: 0 }),
  createMockBattlefieldUnit({ id: 'b', name: 'B', inCombat: true, sortOrder: 1 }),
  createMockBattlefieldUnit({ id: 'c', name: 'C', inCombat: true, sortOrder: 2 }),
]

const mountList = (combatants: BattlefieldUnit[] = units) =>
  mount(CombatList, {
    props: { combatants, activeUnitId: null, selectedId: null },
    attachTo: document.body,
    global: { stubs: { BusinessBattlefieldCombatRow: CombatRowStub } },
  })

type Wrapper = ReturnType<typeof mountList>

/** 依當前 DOM 順序給每列一個高 ROW_HEIGHT 的矩形，讓中線計算有值可用 */
const stubRects = (wrapper: Wrapper): void => {
  wrapper.findAll('[data-unit]').forEach((row, index) => {
    const el = row.element.parentElement as HTMLElement
    el.getBoundingClientRect = () => ({ top: index * ROW_HEIGHT, height: ROW_HEIGHT }) as DOMRect
  })
}

const orderOf = (wrapper: Wrapper): string[] =>
  wrapper.findAll('[data-unit]').map((row) => row.attributes('data-unit')!)

// VTU 的 trigger 會嘗試指派 clientY（MouseEvent 上只有 getter），故直接 dispatch
const pointer = (type: string, clientY: number): PointerEvent =>
  new MouseEvent(type, { clientY, bubbles: true, cancelable: true }) as unknown as PointerEvent

const startDrag = async (wrapper: Wrapper, unitId: string, clientY: number): Promise<void> => {
  wrapper
    .find(`[data-unit="${unitId}"] [data-handle]`)
    .element.dispatchEvent(pointer('pointerdown', clientY))
  await wrapper.vm.$nextTick()
}

describe('CombatList — 拖曳排序', () => {
  it('拖到最後一列之下：emit 新順序', async () => {
    const wrapper = mountList()
    stubRects(wrapper)

    await startDrag(wrapper, 'a', 10)
    document.dispatchEvent(pointer('pointermove', 200))
    document.dispatchEvent(pointer('pointerup', 200))

    expect(wrapper.emitted('reorder')?.at(-1)).toEqual([['b', 'c', 'a']])
  })

  it('拖過中線才換位：移到 B 的上半部仍在 B 之前', async () => {
    const wrapper = mountList()
    stubRects(wrapper)

    await startDrag(wrapper, 'c', 90)
    // B（第二列 40..80，中線 60）：落在 55 → 插在 B 之前
    document.dispatchEvent(pointer('pointermove', 55))
    document.dispatchEvent(pointer('pointerup', 55))

    expect(wrapper.emitted('reorder')?.at(-1)).toEqual([['a', 'c', 'b']])
  })

  it('未超過門檻的微小位移不算拖曳，不 emit reorder', async () => {
    const wrapper = mountList()
    stubRects(wrapper)

    await startDrag(wrapper, 'a', 10)
    document.dispatchEvent(pointer('pointermove', 12)) // < 4px 門檻
    document.dispatchEvent(pointer('pointerup', 12))

    expect(wrapper.emitted('reorder')).toBeUndefined()
  })

  it('拖曳期間即時反映暫時順序，結束後回歸 props 順序', async () => {
    const wrapper = mountList()
    stubRects(wrapper)

    await startDrag(wrapper, 'a', 10)
    document.dispatchEvent(pointer('pointermove', 200))
    await wrapper.vm.$nextTick()
    expect(orderOf(wrapper)).toEqual(['b', 'c', 'a'])

    document.dispatchEvent(pointer('pointerup', 200))
    await wrapper.vm.$nextTick()
    // 父層尚未回寫 props：顯示回到 props 的順序，不自行保留本地結果
    expect(orderOf(wrapper)).toEqual(['a', 'b', 'c'])
  })

  it('拖曳結束後的殘餘 click 不觸發選取', async () => {
    const wrapper = mountList()
    stubRects(wrapper)

    await startDrag(wrapper, 'a', 10)
    document.dispatchEvent(pointer('pointermove', 200))
    document.dispatchEvent(pointer('pointerup', 200))
    await wrapper.findAllComponents(CombatRowStub)[0]!.vm.$emit('select')

    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('無拖曳時點列正常 emit select', async () => {
    const wrapper = mountList()
    await wrapper.findAllComponents(CombatRowStub)[1]!.vm.$emit('select')
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['b'])
  })

  it('空清單顯示提示、不渲染列表容器', () => {
    const wrapper = mountList([])
    expect(wrapper.text()).toContain(t('battlefield.combatEmpty'))
    expect(wrapper.find('[data-testid="battlefield-combat-list"]').exists()).toBe(false)
  })
})
