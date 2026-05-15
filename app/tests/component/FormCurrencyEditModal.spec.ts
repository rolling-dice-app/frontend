import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import AppInput from '~/components/common/AppInput.vue'
import CurrencyEditModal from '~/components/business/character/form/inventory/CurrencyEditModal.vue'
import { parseIntegerInput } from '~/utils/parse'
import type { CharacterCurrencyDTO } from '@rolling-dice-app/core'

beforeEach(() => {
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
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

const mountModal = (props: { open?: boolean; currency?: CharacterCurrencyDTO } = {}) =>
  mount(CurrencyEditModal, {
    props: {
      open: props.open ?? true,
      currency: props.currency ?? baseCurrency(),
    },
    global: {
      stubs: {
        Modal: ModalStub,
        Button: ButtonStub,
      },
      components: { CommonAppInput: AppInput },
    },
  })

describe('CurrencyEditModal (form)', () => {
  describe('開啟與初始化', () => {
    it('open=true 時 Modal 顯示，四欄帶入 props.currency', () => {
      const wrapper = mountModal({
        currency: baseCurrency({ pp: 1, gp: 2, sp: 3, cp: 4 }),
      })
      expect(wrapper.find('[data-modal]').exists()).toBe(true)
      expect((wrapper.find('input#currency-edit-pp').element as HTMLInputElement).value).toBe('1')
      expect((wrapper.find('input#currency-edit-gp').element as HTMLInputElement).value).toBe('2')
      expect((wrapper.find('input#currency-edit-sp').element as HTMLInputElement).value).toBe('3')
      expect((wrapper.find('input#currency-edit-cp').element as HTMLInputElement).value).toBe('4')
    })

    it('open=false 時 Modal 不顯示', () => {
      const wrapper = mountModal({ open: false })
      expect(wrapper.find('[data-modal]').exists()).toBe(false)
    })
  })

  describe('輸入互動（按確定後檢驗 draft 經過 clamp/floor）', () => {
    it('負數輸入 clamp 為 0', async () => {
      const wrapper = mountModal({ currency: baseCurrency({ cp: 5 }) })
      await wrapper.find('input#currency-edit-cp').setValue('-5')
      await wrapper.find('[data-modal-footer] button').trigger('click')
      expect(wrapper.emitted('confirm')?.at(-1)).toEqual([
        expect.objectContaining({ cp: 0, sp: 0, gp: 0, pp: 0 }),
      ])
    })

    it('小數輸入 floor 為整數', async () => {
      const wrapper = mountModal({ currency: baseCurrency({ sp: 1 }) })
      await wrapper.find('input#currency-edit-sp').setValue('3.9')
      await wrapper.find('[data-modal-footer] button').trigger('click')
      expect(wrapper.emitted('confirm')?.at(-1)).toEqual([
        expect.objectContaining({ cp: 0, sp: 3, gp: 0, pp: 0 }),
      ])
    })

    it('空字串輸入視為 0', async () => {
      const wrapper = mountModal({ currency: baseCurrency({ pp: 5 }) })
      await wrapper.find('input#currency-edit-pp').setValue('')
      await wrapper.find('[data-modal-footer] button').trigger('click')
      expect(wrapper.emitted('confirm')?.at(-1)).toEqual([
        expect.objectContaining({ cp: 0, sp: 0, gp: 0, pp: 0 }),
      ])
    })
  })

  describe('確定 / 取消', () => {
    it('確定 emit confirm 含完整四欄與原 updatedAt，並 emit update:open=false', async () => {
      const wrapper = mountModal({
        currency: baseCurrency({ pp: 1, gp: 2, sp: 3, cp: 4 }),
      })
      await wrapper.find('input#currency-edit-gp').setValue('10')
      await wrapper.find('[data-modal-footer] button').trigger('click')

      expect(wrapper.emitted('confirm')?.at(-1)).toEqual([
        {
          pp: 1,
          gp: 10,
          sp: 3,
          cp: 4,
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ])
      expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    })

    it('未變更任何欄位時按確定不 emit confirm，但仍關閉 Modal', async () => {
      const wrapper = mountModal({
        currency: baseCurrency({ pp: 1, gp: 2, sp: 3, cp: 4 }),
      })
      await wrapper.find('[data-modal-footer] button').trigger('click')
      expect(wrapper.emitted('confirm')).toBeUndefined()
      expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    })

    it('輸入後又改回原值（draft 等於初始 snapshot）按確定不 emit confirm', async () => {
      const wrapper = mountModal({
        currency: baseCurrency({ gp: 5 }),
      })
      await wrapper.find('input#currency-edit-gp').setValue('10')
      await wrapper.find('input#currency-edit-gp').setValue('5')
      await wrapper.find('[data-modal-footer] button').trigger('click')
      expect(wrapper.emitted('confirm')).toBeUndefined()
      expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    })

    it('Modal 內部關閉（Modal update:modelValue=false）轉發為 update:open=false 且不 emit confirm', async () => {
      const wrapper = mountModal()
      const modal = wrapper.findComponent(ModalStub)
      modal.vm.$emit('update:modelValue', false)
      await nextTick()

      expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
      expect(wrapper.emitted('confirm')).toBeUndefined()
    })

    it('再次開啟時 draft 以新的 props.currency 為準，不殘留前次草稿', async () => {
      const wrapper = mountModal({
        open: true,
        currency: baseCurrency({ gp: 5 }),
      })
      await wrapper.find('input#currency-edit-gp').setValue('99')

      await wrapper.setProps({ open: false })
      await wrapper.setProps({
        open: true,
        currency: baseCurrency({ gp: 7 }),
      })

      expect((wrapper.find('input#currency-edit-gp').element as HTMLInputElement).value).toBe('7')
    })
  })
})
