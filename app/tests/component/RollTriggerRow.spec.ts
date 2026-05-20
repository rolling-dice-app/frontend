import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RollTriggerRow from '~/components/business/character-detail/quickview/RollTriggerRow.vue'
import { formatModifier } from '~/helpers/ability'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const mountRow = (props: { label?: string; modifier?: number } = {}) =>
  mount(RollTriggerRow, {
    props: {
      label: props.label ?? '力量',
      modifier: props.modifier ?? 3,
    },
    global: {
      stubs: { Icon: true },
      mocks: { formatModifier },
    },
  })

const rollBtn = (wrapper: ReturnType<typeof mountRow>, label: string) =>
  wrapper.find(`button[aria-label="${label}"]`)

describe('RollTriggerRow', () => {
  describe('label / modifier 顯示', () => {
    it('顯示 label 與 formatModifier 後的 modifier', () => {
      const wrapper = mountRow({ label: '感知', modifier: 4 })
      expect(wrapper.text()).toContain('感知')
      expect(wrapper.text()).toContain('+4')
    })

    it('正 / 負 / 零 modifier 都顯示帶正負號的格式', () => {
      expect(mountRow({ modifier: 2 }).text()).toContain('+2')
      expect(mountRow({ modifier: -1 }).text()).toContain('-1')
      expect(mountRow({ modifier: 0 }).text()).toContain('+0')
    })
  })

  describe('擲骰互動', () => {
    it('點一般擲骰 emit roll [normal]', async () => {
      const wrapper = mountRow({ label: '力量' })
      await rollBtn(wrapper, '力量 一般擲骰').trigger('click')
      expect(wrapper.emitted('roll')).toEqual([['normal']])
    })

    it('點優勢擲骰 emit roll [advantage]', async () => {
      const wrapper = mountRow({ label: '敏捷' })
      await rollBtn(wrapper, '敏捷 優勢擲骰').trigger('click')
      expect(wrapper.emitted('roll')).toEqual([['advantage']])
    })

    it('點劣勢擲骰 emit roll [disadvantage]', async () => {
      const wrapper = mountRow({ label: '體質' })
      await rollBtn(wrapper, '體質 劣勢擲骰').trigger('click')
      expect(wrapper.emitted('roll')).toEqual([['disadvantage']])
    })
  })

  describe('disabled', () => {
    it('disabled=true 時三顆按鈕都 disabled、外觀降透明度', () => {
      const wrapper = mount(RollTriggerRow, {
        props: { label: '力量', modifier: 3, disabled: true },
        global: { stubs: { Icon: true }, mocks: { formatModifier } },
      })
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBe(3)
      for (const btn of buttons) expect(btn.attributes('disabled')).toBeDefined()
      expect(wrapper.find('li').classes()).toContain('opacity-50')
    })

    it('disabled=true 時點擊不 emit roll', async () => {
      const wrapper = mount(RollTriggerRow, {
        props: { label: '力量', modifier: 3, disabled: true },
        global: { stubs: { Icon: true }, mocks: { formatModifier } },
      })
      await wrapper.find('button[aria-label="力量 一般擲骰"]').trigger('click')
      expect(wrapper.emitted('roll')).toBeUndefined()
    })
  })

  describe('modes 過濾', () => {
    it("modes=['normal'] 只渲染一般擲骰按鈕", () => {
      const wrapper = mount(RollTriggerRow, {
        props: { label: '戰士 / d10', modifier: 1, modes: ['normal'] },
        global: { stubs: { Icon: true }, mocks: { formatModifier } },
      })
      expect(wrapper.find('button[aria-label="戰士 / d10 一般擲骰"]').exists()).toBe(true)
      expect(wrapper.find('button[aria-label="戰士 / d10 優勢擲骰"]').exists()).toBe(false)
      expect(wrapper.find('button[aria-label="戰士 / d10 劣勢擲骰"]').exists()).toBe(false)
    })
  })
})
