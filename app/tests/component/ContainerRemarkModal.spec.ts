import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppButton from '~/components/common/AppButton.vue'
import ContainerRemarkModal from '~/components/business/dm-session/ContainerRemarkModal.vue'

const ModalStub = {
  name: 'Modal',
  props: [
    'modelValue',
    'title',
    'size',
    'closeOnClickOutside',
    'bgColor',
    'textColor',
    'borderColor',
  ],
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
  // 比照 @ui Button：loading 時自動 disabled
  template:
    '<button type="button" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
}

const TextAreaStub = {
  name: 'TextArea',
  props: ['modelValue', 'rows', 'border', 'maxHeight', 'maxlength', 'showCount', 'placeholder'],
  emits: ['update:modelValue'],
  template:
    '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
}

const mountModal = (props: Record<string, unknown> = {}) =>
  mount(ContainerRemarkModal, {
    props: { open: true, remark: '', ...props },
    global: {
      stubs: { Modal: ModalStub, Button: ButtonStub, TextArea: TextAreaStub },
      components: { CommonAppButton: AppButton },
    },
  })

type Wrapper = ReturnType<typeof mountModal>

const findButtonByText = (wrapper: Wrapper, text: string) =>
  wrapper.findAll('button').find((button) => button.text() === text)

describe('ContainerRemarkModal', () => {
  it('開窗時以 props.remark 初始化草稿', () => {
    const wrapper = mountModal({ remark: '每週五開團' })
    expect(wrapper.find<HTMLTextAreaElement>('textarea').element.value).toBe('每週五開團')
  })

  it('confirm 送出 trim 後的備註，且不自行關窗', async () => {
    const wrapper = mountModal()

    await wrapper.find('textarea').setValue('  每週五開團  ')
    await findButtonByText(wrapper, '確認')!.trigger('click')

    expect(wrapper.emitted('confirm')).toEqual([['每週五開團']])
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })

  it('只有空白的備註 trim 後送出空字串，不會存成非空備註', async () => {
    const wrapper = mountModal({ remark: '舊備註' })

    await wrapper.find('textarea').setValue('   ')
    await findButtonByText(wrapper, '確認')!.trigger('click')

    expect(wrapper.emitted('confirm')).toEqual([['']])
  })

  it('submitting 期間確認鈕與取消鈕皆 disabled，confirm 不 emit', async () => {
    const wrapper = mountModal({ submitting: true })

    expect(findButtonByText(wrapper, '取消')!.attributes('disabled')).toBeDefined()
    await findButtonByText(wrapper, '確認')!.trigger('click')
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('submitting 期間關窗請求被擋下，非 submitting 時正常轉發', async () => {
    const blocked = mountModal({ submitting: true })
    await blocked.findComponent(ModalStub).vm.$emit('update:modelValue', false)
    expect(blocked.emitted('update:open')).toBeUndefined()

    const open = mountModal()
    await open.findComponent(ModalStub).vm.$emit('update:modelValue', false)
    expect(open.emitted('update:open')).toEqual([[false]])
  })
})
