import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { t } from '~/i18n'
import AppButton from '~/components/common/AppButton.vue'
import EndBattleModal from '~/components/business/battlefield/EndBattleModal.vue'

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
  props: ['radius', 'disabled', 'bgColor', 'loading'],
  template:
    '<button type="button" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
}

const mountModal = (props: Record<string, unknown> = {}) =>
  mount(EndBattleModal, {
    props: { open: true, battleSequence: 2, ...props },
    global: {
      stubs: { Modal: ModalStub, Button: ButtonStub },
      components: { CommonAppButton: AppButton },
    },
  })

type Wrapper = ReturnType<typeof mountModal>

const confirmButton = (wrapper: Wrapper) =>
  wrapper.findAll('button').find((button) => button.text() === t('battlefield.endBattle'))!

describe('EndBattleModal', () => {
  it('標題帶場次序號、內文說明結束後的處置，無保留勾選', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain(t('battlefield.endBattleTitle', { seq: 2 }))
    expect(wrapper.text()).toContain(t('battlefield.endBattleBody'))
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(0)
  })

  it('確認：emit 無 payload 的 confirm，且不自行關窗', async () => {
    const wrapper = mountModal()
    await confirmButton(wrapper).trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('confirm')![0]).toEqual([])
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })

  it('取消鈕 emit update:open false', async () => {
    const wrapper = mountModal()
    const cancel = wrapper.findAll('button').find((b) => b.text() === t('ui.action.cancel'))!
    await cancel.trigger('click')
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('open=false 時不渲染', () => {
    const wrapper = mountModal({ open: false })
    expect(wrapper.find('[data-modal]').exists()).toBe(false)
  })
})
