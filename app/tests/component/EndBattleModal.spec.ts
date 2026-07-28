import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { t } from '~/i18n'
import AppButton from '~/components/common/AppButton.vue'
import EndBattleModal from '~/components/business/battlefield/EndBattleModal.vue'
import type { EndBattleKeepFlags } from '~/types/business/battlefield'

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

const lastConfirm = (wrapper: Wrapper): EndBattleKeepFlags => {
  const events = wrapper.emitted('confirm')!
  return events[events.length - 1]![0] as EndBattleKeepFlags
}

describe('EndBattleModal', () => {
  it('標題帶場次序號、四個保留項預設全勾', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain(t('battlefield.endBattleTitle', { seq: 2 }))
    const boxes = wrapper.findAll('input[type="checkbox"]')
    expect(boxes).toHaveLength(4)
    for (const box of boxes) {
      expect((box.element as HTMLInputElement).checked).toBe(true)
    }
  })

  it('全保留確認：emit 全 true 的 flags，且不自行關窗', async () => {
    const wrapper = mountModal()
    await confirmButton(wrapper).trigger('click')
    expect(lastConfirm(wrapper)).toEqual({
      keepCurrentHp: true,
      keepTempHp: true,
      keepConditions: true,
      keepAdjustments: true,
    })
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })

  it('取消勾選反映在 confirm payload', async () => {
    const wrapper = mountModal()
    const boxes = wrapper.findAll('input[type="checkbox"]')
    await boxes[0]!.setValue(false) // keepCurrentHp
    await boxes[2]!.setValue(false) // keepConditions
    await confirmButton(wrapper).trigger('click')
    expect(lastConfirm(wrapper)).toEqual({
      keepCurrentHp: false,
      keepTempHp: true,
      keepConditions: false,
      keepAdjustments: true,
    })
  })

  it('重新開窗回到預設全保留', async () => {
    const wrapper = mountModal()
    await wrapper.findAll('input[type="checkbox"]')[1]!.setValue(false)
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    await confirmButton(wrapper).trigger('click')
    expect(lastConfirm(wrapper).keepTempHp).toBe(true)
  })

  it('取消鈕 emit update:open false', async () => {
    const wrapper = mountModal()
    const cancel = wrapper.findAll('button').find((b) => b.text() === t('ui.action.cancel'))!
    await cancel.trigger('click')
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })
})
