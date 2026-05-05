import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppInput from '~/components/common/AppInput.vue'
import CurrencyPanel from '~/components/business/character/form/inventory/CurrencyPanel.vue'
import { calculateCurrencyWeight } from '~/helpers/inventory'
import type { CharacterCurrency } from '@rolling-dice-app/types'

beforeEach(() => {
  vi.stubGlobal('calculateCurrencyWeight', calculateCurrencyWeight)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const baseCurrency = (overrides: Partial<CharacterCurrency> = {}): CharacterCurrency => ({
  cp: 0,
  sp: 0,
  gp: 0,
  pp: 0,
  ...overrides,
})

const mountPanel = (currency: CharacterCurrency = baseCurrency()) =>
  mount(CurrencyPanel, {
    props: { currency },
    global: {
      components: { CommonAppInput: AppInput },
      mocks: { calculateCurrencyWeight },
    },
  })

describe('CurrencyPanel (form)', () => {
  describe('渲染', () => {
    it('四種幣值各自一個 input', () => {
      const wrapper = mountPanel(baseCurrency({ pp: 1, gp: 2, sp: 3, cp: 4 }))
      expect((wrapper.find('input#currency-pp').element as HTMLInputElement).value).toBe('1')
      expect((wrapper.find('input#currency-gp').element as HTMLInputElement).value).toBe('2')
      expect((wrapper.find('input#currency-sp').element as HTMLInputElement).value).toBe('3')
      expect((wrapper.find('input#currency-cp').element as HTMLInputElement).value).toBe('4')
    })

    it('總重以 calculateCurrencyWeight 結果顯示', () => {
      // 50 pp = 1 磅
      const wrapper = mountPanel(baseCurrency({ pp: 50 }))
      expect(wrapper.text()).toContain('硬幣重量：1 磅')
    })

    it('小數重量 fixed 兩位', () => {
      // 1 cp = 0.02 磅
      const wrapper = mountPanel(baseCurrency({ cp: 1 }))
      expect(wrapper.text()).toContain('0.02')
    })
  })

  describe('輸入互動', () => {
    it('輸入新值 emit update:currency 含完整四欄與更新欄位', async () => {
      const wrapper = mountPanel(baseCurrency({ gp: 5 }))
      await wrapper.find('input#currency-gp').setValue('10')
      expect(wrapper.emitted('update:currency')?.at(-1)).toEqual([{ cp: 0, sp: 0, gp: 10, pp: 0 }])
    })

    it('負數輸入 clamp 為 0', async () => {
      const wrapper = mountPanel()
      await wrapper.find('input#currency-cp').setValue('-5')
      expect(wrapper.emitted('update:currency')?.at(-1)).toEqual([{ cp: 0, sp: 0, gp: 0, pp: 0 }])
    })

    it('小數輸入 floor 為整數', async () => {
      const wrapper = mountPanel()
      await wrapper.find('input#currency-sp').setValue('3.9')
      expect(wrapper.emitted('update:currency')?.at(-1)).toEqual([{ cp: 0, sp: 3, gp: 0, pp: 0 }])
    })

    it('空字串輸入視為 0', async () => {
      const wrapper = mountPanel(baseCurrency({ pp: 5 }))
      await wrapper.find('input#currency-pp').setValue('')
      expect(wrapper.emitted('update:currency')?.at(-1)).toEqual([{ cp: 0, sp: 0, gp: 0, pp: 0 }])
    })
  })
})
