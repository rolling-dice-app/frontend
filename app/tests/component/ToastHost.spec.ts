import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ToastHost from '~/components/layout/ToastHost.vue'
import { useToast } from '~/composables/ui/useToast'

const ToastStub = {
  name: 'Toast',
  props: ['modelValue', 'x', 'y', 'duration', 'bgColor', 'textColor'],
  emits: ['update:modelValue'],
  template: '<div data-toast><slot /></div>',
}

const IconStub = {
  name: 'Icon',
  props: ['name', 'size', 'color'],
  template: '<span aria-hidden="true" />',
}

const mountHost = () =>
  mount(ToastHost, { global: { stubs: { Toast: ToastStub, Icon: IconStub } } })

beforeEach(() => {
  useToast().clear()
})

describe('ToastHost — 操作入口', () => {
  it('無 action 時不渲染按鈕', async () => {
    useToast().error('壞了')
    const wrapper = mountHost()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="toast-action"]').exists()).toBe(false)
  })

  it('點 action 後執行回呼並關閉該則通知', async () => {
    const onClick = vi.fn()
    const { error, items } = useToast()
    error('存不進去', { duration: 0, action: { label: '重試', onClick } })
    const wrapper = mountHost()
    await wrapper.vm.$nextTick()

    const button = wrapper.find('[data-testid="toast-action"]')
    expect(button.text()).toBe('重試')
    await button.trigger('click')

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(items).toHaveLength(0)
  })
})
