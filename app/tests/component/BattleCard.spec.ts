import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BattleCard from '~/components/business/character/quickview/BattleCard.vue'
import { formatModifier } from '~/helpers/ability'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const mountCard = (
  params: Partial<{
    baseArmorClass: number
    acAdjustment: number
    baseSpeed: number
    speedAdjustment: number
    initiative: number
    passivePerception: number
    passiveInsight: number
    proficiencyBonus: number
  }> = {},
) =>
  mount(BattleCard, {
    props: {
      baseArmorClass: params.baseArmorClass ?? 14,
      acAdjustment: params.acAdjustment ?? 0,
      baseSpeed: params.baseSpeed ?? 30,
      speedAdjustment: params.speedAdjustment ?? 0,
      initiative: params.initiative ?? 2,
      passivePerception: params.passivePerception ?? 12,
      passiveInsight: params.passiveInsight ?? 11,
      proficiencyBonus: params.proficiencyBonus ?? 2,
    },
    global: {
      stubs: { Icon: true },
      mocks: { formatModifier },
    },
  })

const btn = (wrapper: ReturnType<typeof mountCard>, label: string) =>
  wrapper.findAll('button').find((b) => b.attributes('aria-label') === label)!

describe('BattleCard', () => {
  describe('AC 顯示與調整', () => {
    it('顯示 baseArmorClass + acAdjustment 為總值', () => {
      const wrapper = mountCard({ baseArmorClass: 14, acAdjustment: 2 })
      expect(wrapper.text()).toContain('16')
    })

    it('acAdjustment = 0 時不顯示調整文字', () => {
      const wrapper = mountCard({ baseArmorClass: 14, acAdjustment: 0 })
      expect(wrapper.text()).not.toMatch(/\(\+\d/)
    })

    it('acAdjustment > 0 顯示 +N、配 text-success', () => {
      const wrapper = mountCard({ acAdjustment: 3 })
      const adj = wrapper.findAll('span.text-xs.text-success').find((s) => s.text().includes('+3'))
      expect(adj).toBeDefined()
    })

    it('acAdjustment < 0 顯示 -N、配 text-danger', () => {
      const wrapper = mountCard({ acAdjustment: -2 })
      const adj = wrapper.findAll('span.text-xs.text-danger').find((s) => s.text().includes('-2'))
      expect(adj).toBeDefined()
    })

    it('AC ± 按鈕 emit adjustAc -1 / +1', async () => {
      const wrapper = mountCard()
      await btn(wrapper, 'AC -1').trigger('click')
      await btn(wrapper, 'AC +1').trigger('click')
      expect(wrapper.emitted('adjustAc')).toEqual([[-1], [1]])
    })
  })

  describe('速度顯示與調整', () => {
    it('顯示 baseSpeed + speedAdjustment 為總值', () => {
      const wrapper = mountCard({ baseSpeed: 30, speedAdjustment: 10 })
      expect(wrapper.text()).toContain('40')
    })

    it('速度 ± 按鈕 emit adjustSpeed -5 / +5', async () => {
      const wrapper = mountCard()
      await btn(wrapper, '移動速度 -5').trigger('click')
      await btn(wrapper, '移動速度 +5').trigger('click')
      expect(wrapper.emitted('adjustSpeed')).toEqual([[-5], [5]])
    })
  })

  describe('先攻配色', () => {
    it('initiative > 0 為 text-success', () => {
      const wrapper = mountCard({ initiative: 3 })
      const span = wrapper.findAll('span.text-2xl').find((s) => s.text() === '+3')!
      expect(span.classes()).toContain('text-success')
    })

    it('initiative < 0 為 text-danger', () => {
      const wrapper = mountCard({ initiative: -1 })
      const span = wrapper.findAll('span.text-2xl').find((s) => s.text() === '-1')!
      expect(span.classes()).toContain('text-danger')
    })

    it('initiative = 0 為 text-content-muted', () => {
      const wrapper = mountCard({ initiative: 0 })
      const span = wrapper.findAll('span.text-2xl').find((s) => s.text() === '+0')!
      expect(span.classes()).toContain('text-content-muted')
    })
  })

  describe('被動值與熟練加值', () => {
    it('顯示 passivePerception / passiveInsight 數值', () => {
      const wrapper = mountCard({ passivePerception: 15, passiveInsight: 13 })
      expect(wrapper.text()).toContain('15')
      expect(wrapper.text()).toContain('13')
    })

    it('熟練加值以 formatModifier 顯示帶正負號', () => {
      const wrapper = mountCard({ proficiencyBonus: 3 })
      expect(wrapper.text()).toContain('+3')
    })
  })
})
