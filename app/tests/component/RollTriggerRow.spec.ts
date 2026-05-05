import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RollTriggerRow from '~/components/business/character/quickview/RollTriggerRow.vue'
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
})
