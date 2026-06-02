import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useId } from 'vue'
import SpellSlotsCard from '~/components/business/character-detail/quickview/SpellSlotsCard.vue'
import type { SpellLevel, SpellSlots } from '@rolling-dice-app/core'

vi.stubGlobal('useId', useId)

const mountCard = (params: {
  spellSlotsBase?: SpellSlots
  spellSlotsUsed?: Partial<Record<SpellLevel, number>>
  pactSlotsBase?: SpellSlots
  pactSlotsUsed?: Partial<Record<SpellLevel, number>>
}) =>
  mount(SpellSlotsCard, {
    props: {
      spellSlotsBase: params.spellSlotsBase ?? {},
      spellSlotsUsed: params.spellSlotsUsed ?? {},
      pactSlotsBase: params.pactSlotsBase ?? {},
      pactSlotsUsed: params.pactSlotsUsed ?? {},
    },
    global: {
      stubs: { Icon: true },
    },
  })

const cellAt = (wrapper: ReturnType<typeof mountCard>, level: SpellLevel) => {
  const cells = wrapper.findAll('[role="tabpanel"] > div')
  return cells[level - 1]!
}

const remainingAt = (wrapper: ReturnType<typeof mountCard>, level: SpellLevel): string => {
  return cellAt(wrapper, level).find('span.font-bold').text().replace(/\s+/g, ' ')
}

const decAt = (wrapper: ReturnType<typeof mountCard>, level: SpellLevel) => {
  return cellAt(wrapper, level).findAll('button')[0]!
}

const incAt = (wrapper: ReturnType<typeof mountCard>, level: SpellLevel) => {
  return cellAt(wrapper, level).findAll('button')[1]!
}

describe('SpellSlotsCard', () => {
  describe('剩餘 / 總數顯示', () => {
    it('未使用時顯示「max / max」', () => {
      const wrapper = mountCard({ spellSlotsBase: { 1: 4, 2: 3 } })
      expect(remainingAt(wrapper, 1)).toBe('4 /4')
      expect(remainingAt(wrapper, 2)).toBe('3 /3')
    })

    it('已使用時顯示「剩餘 / max」', () => {
      const wrapper = mountCard({
        spellSlotsBase: { 1: 4 },
        spellSlotsUsed: { 1: 1 },
      })
      expect(remainingAt(wrapper, 1)).toBe('3 /4')
    })

    it('max = 0 的環顯示 0/0 並使按鈕 disabled', () => {
      const wrapper = mountCard({ spellSlotsBase: { 1: 4 } })
      expect(remainingAt(wrapper, 5)).toBe('0 /0')
      expect(decAt(wrapper, 5).attributes('disabled')).toBeDefined()
      expect(incAt(wrapper, 5).attributes('disabled')).toBeDefined()
    })

    it('使用數溢出時剩餘 clamp 為 0', () => {
      const wrapper = mountCard({
        spellSlotsBase: { 1: 2 },
        spellSlotsUsed: { 1: 99 },
      })
      expect(remainingAt(wrapper, 1)).toBe('0 /2')
    })

    it('總是渲染 1–9 環', () => {
      const wrapper = mountCard({ spellSlotsBase: { 9: 1 } })
      expect(wrapper.findAll('[role="tabpanel"] > div')).toHaveLength(9)
    })
  })

  describe('- / + 互動', () => {
    it('點 - 應 emit adjustSpell with delta=+1（消耗一個）', async () => {
      const wrapper = mountCard({ spellSlotsBase: { 1: 4 } })
      await decAt(wrapper, 1).trigger('click')
      expect(wrapper.emitted('adjustSpell')).toEqual([[1, 1, 4]])
    })

    it('點 + 應 emit adjustSpell with delta=-1（回復一個）', async () => {
      const wrapper = mountCard({
        spellSlotsBase: { 1: 4 },
        spellSlotsUsed: { 1: 2 },
      })
      await incAt(wrapper, 1).trigger('click')
      expect(wrapper.emitted('adjustSpell')).toEqual([[1, -1, 4]])
    })

    it('剩餘 0 時 - 按鈕為 disabled 不 emit', async () => {
      const wrapper = mountCard({
        spellSlotsBase: { 1: 2 },
        spellSlotsUsed: { 1: 2 },
      })
      expect(decAt(wrapper, 1).attributes('disabled')).toBeDefined()
      await decAt(wrapper, 1).trigger('click')
      expect(wrapper.emitted('adjustSpell')).toBeUndefined()
    })

    it('剩餘 = max 時 + 按鈕為 disabled 不 emit', async () => {
      const wrapper = mountCard({ spellSlotsBase: { 1: 4 } })
      expect(incAt(wrapper, 1).attributes('disabled')).toBeDefined()
      await incAt(wrapper, 1).trigger('click')
      expect(wrapper.emitted('adjustSpell')).toBeUndefined()
    })
  })

  describe('Tab 切換 — 一般 / 契術', () => {
    it('預設顯示「一般」環位', () => {
      const wrapper = mountCard({
        spellSlotsBase: { 1: 4 },
        pactSlotsBase: { 3: 2 },
      })
      expect(remainingAt(wrapper, 1)).toBe('4 /4')
      expect(remainingAt(wrapper, 3)).toBe('0 /0')
    })

    it('切到「契術」後顯示 pactSlotsBase', async () => {
      const wrapper = mountCard({
        spellSlotsBase: { 1: 4 },
        pactSlotsBase: { 3: 2 },
      })
      const tabs = wrapper.findAll('[role="tab"]')
      await tabs[1]!.trigger('click')
      expect(remainingAt(wrapper, 3)).toBe('2 /2')
      expect(remainingAt(wrapper, 1)).toBe('0 /0')
    })

    it('在契術 tab 點 - 應 emit adjustPact', async () => {
      const wrapper = mountCard({ pactSlotsBase: { 3: 2 } })
      const tabs = wrapper.findAll('[role="tab"]')
      await tabs[1]!.trigger('click')
      await decAt(wrapper, 3).trigger('click')
      expect(wrapper.emitted('adjustPact')).toEqual([[3, 1, 2]])
      expect(wrapper.emitted('adjustSpell')).toBeUndefined()
    })

    it('右方向鍵應切到下一個 tab', async () => {
      const wrapper = mountCard({ pactSlotsBase: { 3: 2 } })
      const tabs = wrapper.findAll('[role="tab"]')
      await tabs[0]!.trigger('keydown.right')
      expect(tabs[1]!.attributes('aria-selected')).toBe('true')
    })
  })
})
