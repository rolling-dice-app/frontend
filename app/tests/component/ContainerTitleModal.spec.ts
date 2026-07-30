import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppInput from '~/components/common/AppInput.vue'
import AppButton from '~/components/common/AppButton.vue'
import ContainerTitleModal from '~/components/business/dm-session/ContainerTitleModal.vue'

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
  mount(ContainerTitleModal, {
    props: { open: true, mode: 'create' as const, ...props },
    global: {
      stubs: { Modal: ModalStub, Button: ButtonStub, TextArea: TextAreaStub },
      components: { CommonAppInput: AppInput, CommonAppButton: AppButton },
    },
  })

type Wrapper = ReturnType<typeof mountModal>

const titleInput = (wrapper: Wrapper) => wrapper.find('#dm-session-container-title')

const findButtonByText = (wrapper: Wrapper, text: string) =>
  wrapper.findAll('button').find((button) => button.text() === text)

describe('ContainerTitleModal', () => {
  describe('create 模式', () => {
    it('填名稱與備註後 confirm：emit 修剪後名稱與備註，且不自行關窗', async () => {
      const wrapper = mountModal()

      await titleInput(wrapper).setValue('冒險劇本 ')
      await wrapper.find('textarea').setValue('每週五開團')
      await findButtonByText(wrapper, '確認')!.trigger('click')

      expect(wrapper.emitted('confirm')?.at(-1)).toEqual(['冒險劇本', '每週五開團'])
      // confirm 不自行關窗：成功後由父頁關閉
      expect(wrapper.emitted('update:open')).toBeUndefined()
    })

    it('備註未填時 confirm 的 remark 為 undefined', async () => {
      const wrapper = mountModal()

      await titleInput(wrapper).setValue('冒險劇本')
      await findButtonByText(wrapper, '確認')!.trigger('click')

      expect(wrapper.emitted('confirm')?.at(-1)).toEqual(['冒險劇本', undefined])
    })

    it('備註前後空白於送出時修剪（判空與送出用同一個值）', async () => {
      const wrapper = mountModal()

      await titleInput(wrapper).setValue('冒險劇本')
      await wrapper.find('textarea').setValue('  每週五開團  ')
      await findButtonByText(wrapper, '確認')!.trigger('click')

      expect(wrapper.emitted('confirm')?.at(-1)).toEqual(['冒險劇本', '每週五開團'])
    })

    it('備註只有空白時視為未填，remark 為 undefined 而非空白字串', async () => {
      const wrapper = mountModal()

      await titleInput(wrapper).setValue('冒險劇本')
      await wrapper.find('textarea').setValue('   ')
      await findButtonByText(wrapper, '確認')!.trigger('click')

      expect(wrapper.emitted('confirm')?.at(-1)).toEqual(['冒險劇本', undefined])
    })

    it('名稱為空時確認鈕 disabled、confirm 不 emit', async () => {
      const wrapper = mountModal()

      const confirmButton = findButtonByText(wrapper, '確認')!
      expect(confirmButton.attributes('disabled')).toBeDefined()

      await confirmButton.trigger('click')
      expect(wrapper.emitted('confirm')).toBeUndefined()
    })
  })

  describe('rename 模式', () => {
    it('開窗預填 initialTitle，confirm 只帶名稱', async () => {
      const wrapper = mountModal({ mode: 'rename', initialTitle: '舊名稱' })

      expect((titleInput(wrapper).element as HTMLInputElement).value).toBe('舊名稱')

      await titleInput(wrapper).setValue('新名稱')
      await findButtonByText(wrapper, '確認')!.trigger('click')

      expect(wrapper.emitted('confirm')?.at(-1)).toEqual(['新名稱', undefined])
      expect(wrapper.emitted('update:open')).toBeUndefined()
    })
  })

  describe('submitting 協議', () => {
    it('submitting 時確認鈕與取消鈕皆 disabled，confirm 不 emit', async () => {
      const wrapper = mountModal({ submitting: true })
      await titleInput(wrapper).setValue('冒險劇本')

      const confirmButton = findButtonByText(wrapper, '確認')!
      const cancelButton = findButtonByText(wrapper, '取消')!
      expect(confirmButton.attributes('disabled')).toBeDefined()
      expect(cancelButton.attributes('disabled')).toBeDefined()

      await confirmButton.trigger('click')
      expect(wrapper.emitted('confirm')).toBeUndefined()
    })

    it('submitting 時 Modal 的關窗請求（ESC / X）被擋下，非 submitting 時正常轉發', async () => {
      const wrapper = mountModal({ submitting: true })

      wrapper.findComponent(ModalStub).vm.$emit('update:modelValue', false)
      expect(wrapper.emitted('update:open')).toBeUndefined()

      await wrapper.setProps({ submitting: false })
      wrapper.findComponent(ModalStub).vm.$emit('update:modelValue', false)
      expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    })

    it('取消鈕在非 submitting 時關窗', async () => {
      const wrapper = mountModal()

      await findButtonByText(wrapper, '取消')!.trigger('click')

      expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
      expect(wrapper.emitted('confirm')).toBeUndefined()
    })
  })
})
