import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppInput from '~/components/common/AppInput.vue'
import CurrencyPanel from '~/components/business/character/form/inventory/CurrencyPanel.vue'
import CurrencyEditModal from '~/components/business/character/form/inventory/CurrencyEditModal.vue'
import { calculateCurrencyWeight } from '~/helpers/inventory'
import type { CharacterCurrencyDTO } from '@rolling-dice-app/core'

beforeEach(() => {
  vi.stubGlobal('calculateCurrencyWeight', calculateCurrencyWeight)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ModalStub = {
  name: 'Modal',
  props: ['modelValue', 'title', 'size', 'bgColor', 'textColor', 'borderColor'],
  emits: ['update:modelValue'],
  template: `
    <div v-if="modelValue" data-modal>
      <h2>{{ title }}</h2>
      <slot />
      <div data-modal-footer><slot name="footer" /></div>
    </div>`,
}

const ButtonStub = {
  name: 'Button',
  props: ['radius', 'disabled', 'bgColor'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
}

const baseCurrency = (overrides: Partial<CharacterCurrencyDTO> = {}): CharacterCurrencyDTO => ({
  cp: 0,
  sp: 0,
  gp: 0,
  pp: 0,
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const mountPanel = (currency: CharacterCurrencyDTO = baseCurrency()) =>
  mount(CurrencyPanel, {
    props: { currency },
    global: {
      stubs: {
        Icon: true,
        Modal: ModalStub,
        Button: ButtonStub,
      },
      components: {
        CommonAppInput: AppInput,
        BusinessCharacterFormInventoryCurrencyEditModal: CurrencyEditModal,
      },
      mocks: { calculateCurrencyWeight },
    },
  })

describe('CurrencyPanel (form)', () => {
  describe('渲染', () => {
    it('四種幣值各自顯示數值', () => {
      const wrapper = mountPanel(baseCurrency({ pp: 1, gp: 2, sp: 3, cp: 4 }))
      const cells = wrapper.findAll('.grid > div')
      expect(cells).toHaveLength(4)
      expect(cells[0]?.text()).toContain('1')
      expect(cells[1]?.text()).toContain('2')
      expect(cells[2]?.text()).toContain('3')
      expect(cells[3]?.text()).toContain('4')
    })

    it('總重以 calculateCurrencyWeight 結果顯示', () => {
      const wrapper = mountPanel(baseCurrency({ pp: 50 }))
      expect(wrapper.text()).toContain('硬幣重量：1 磅')
    })

    it('小數重量 fixed 兩位', () => {
      const wrapper = mountPanel(baseCurrency({ cp: 1 }))
      expect(wrapper.text()).toContain('0.02')
    })
  })

  describe('編輯 Modal 開啟', () => {
    it('預設 Modal 關閉', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-modal]').exists()).toBe(false)
    })

    it('點編輯按鈕 Modal 打開，標題為「編輯資產」', async () => {
      const wrapper = mountPanel(baseCurrency({ gp: 5 }))
      const edit = wrapper.find('button[aria-label="編輯資產"]')
      expect(edit.exists()).toBe(true)
      await edit.trigger('click')
      const modal = wrapper.find('[data-modal]')
      expect(modal.exists()).toBe(true)
      expect(modal.text()).toContain('編輯資產')
    })
  })
})
