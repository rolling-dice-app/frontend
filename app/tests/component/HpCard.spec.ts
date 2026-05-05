import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import AppInput from '~/components/common/AppInput.vue'
import HpCard from '~/components/business/character/quickview/HpCard.vue'
import { formatModifier } from '~/helpers/ability'
import { parseIntegerInput } from '~/utils/parse'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const mountCard = (
  params: {
    currentHp?: number
    maxHp?: number
    maxAdjustment?: number
    tempHp?: number
  } = {},
) =>
  mount(HpCard, {
    props: {
      currentHp: params.currentHp ?? 30,
      maxHp: params.maxHp ?? 30,
      maxAdjustment: params.maxAdjustment ?? 0,
      tempHp: params.tempHp ?? 0,
    },
    global: {
      stubs: { Icon: true },
      components: { CommonAppInput: AppInput },
      mocks: { formatModifier, parseIntegerInput },
    },
  })

const btn = (wrapper: ReturnType<typeof mountCard>, label: string) =>
  wrapper.find(`button[aria-label="${label}"]`)

describe('HpCard', () => {
  describe('最大生命調整顯示', () => {
    it('maxAdjustment = 0 不顯示調整文字', () => {
      const wrapper = mountCard({ maxAdjustment: 0 })
      expect(wrapper.text()).not.toMatch(/[+-]\d/)
    })

    it('maxAdjustment > 0 顯示 +N', () => {
      const wrapper = mountCard({ maxAdjustment: 5 })
      expect(wrapper.text()).toContain('+5')
    })

    it('maxAdjustment < 0 顯示 -N', () => {
      const wrapper = mountCard({ maxAdjustment: -3 })
      expect(wrapper.text()).toContain('-3')
    })
  })

  describe('臨時生命 ±', () => {
    it('tempHp ≤ 0 時 - 按鈕 disabled', () => {
      const wrapper = mountCard({ tempHp: 0 })
      expect(btn(wrapper, '臨時生命 -1').attributes('disabled')).toBeDefined()
    })

    it('tempHp > 0 時 - 按鈕可點，emit adjustTemp -1', async () => {
      const wrapper = mountCard({ tempHp: 5 })
      await btn(wrapper, '臨時生命 -1').trigger('click')
      expect(wrapper.emitted('adjustTemp')).toEqual([[-1]])
    })

    it('+ 按鈕始終可點，emit adjustTemp +1', async () => {
      const wrapper = mountCard({ tempHp: 0 })
      await btn(wrapper, '臨時生命 +1').trigger('click')
      expect(wrapper.emitted('adjustTemp')).toEqual([[1]])
    })
  })

  describe('最大生命 ±', () => {
    it('- 按鈕 emit adjustMax -1', async () => {
      const wrapper = mountCard()
      await btn(wrapper, '最大生命 -1').trigger('click')
      expect(wrapper.emitted('adjustMax')).toEqual([[-1]])
    })

    it('+ 按鈕 emit adjustMax +1', async () => {
      const wrapper = mountCard()
      await btn(wrapper, '最大生命 +1').trigger('click')
      expect(wrapper.emitted('adjustMax')).toEqual([[1]])
    })
  })

  describe('受傷 / 治療', () => {
    it('amount = 0 時兩按鈕 disabled、點擊不 emit', async () => {
      const wrapper = mountCard()
      expect(btn(wrapper, '受傷').attributes('disabled')).toBeDefined()
      expect(btn(wrapper, '治療').attributes('disabled')).toBeDefined()
      await btn(wrapper, '受傷').trigger('click')
      await btn(wrapper, '治療').trigger('click')
      expect(wrapper.emitted('damage')).toBeUndefined()
      expect(wrapper.emitted('heal')).toBeUndefined()
    })

    it('輸入 5 後點受傷，emit damage [5] 並重置 amount', async () => {
      const wrapper = mountCard()
      const input = wrapper.findComponent(AppInput)
      input.vm.$emit('update:modelValue', '5')
      await nextTick()
      await btn(wrapper, '受傷').trigger('click')
      expect(wrapper.emitted('damage')).toEqual([[5]])
      // 重置後按鈕應再度 disabled
      expect(btn(wrapper, '受傷').attributes('disabled')).toBeDefined()
    })

    it('輸入 7 後點治療，emit heal [7] 並重置 amount', async () => {
      const wrapper = mountCard()
      const input = wrapper.findComponent(AppInput)
      input.vm.$emit('update:modelValue', '7')
      await nextTick()
      await btn(wrapper, '治療').trigger('click')
      expect(wrapper.emitted('heal')).toEqual([[7]])
      expect(btn(wrapper, '治療').attributes('disabled')).toBeDefined()
    })
  })
})
