import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AppInput from '~/components/common/AppInput.vue'

describe('AppInput', () => {
  it('renders an input element', () => {
    const wrapper = mount(AppInput)
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('default borderColor is var(--color-primary)', () => {
    const wrapper = mount(AppInput)
    expect(wrapper.props('borderColor')).toBe('var(--color-primary)')
  })

  it('custom borderColor overrides default', () => {
    const wrapper = mount(AppInput, { props: { borderColor: '#ff0000' } })
    expect(wrapper.props('borderColor')).toBe('#ff0000')
  })

  it('modelValue prop passes through to the input value', () => {
    const wrapper = mount(AppInput, { props: { modelValue: '火焰箭' } })
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('火焰箭')
  })

  it('placeholder attr passes through to the input', () => {
    const wrapper = mount(AppInput, { attrs: { placeholder: '輸入名稱' } })
    expect(wrapper.find('input').attributes('placeholder')).toBe('輸入名稱')
  })

  it('null placeholder does not set the placeholder attribute', () => {
    const wrapper = mount(AppInput, { attrs: { placeholder: null } })
    expect(wrapper.find('input').attributes('placeholder')).toBeUndefined()
  })

  it('disabled attr passes through', () => {
    const wrapper = mount(AppInput, { attrs: { disabled: true } })
    expect(wrapper.find('input').element.disabled).toBe(true)
  })

  it('maxlength attr passes through to the native input', () => {
    const wrapper = mount(AppInput, { attrs: { maxlength: 100 } })
    expect(wrapper.find('input').attributes('maxlength')).toBe('100')
  })

  it('list attr passes through to the native input (datalist 關聯)', () => {
    const wrapper = mount(AppInput, { attrs: { list: 'player-options' } })
    expect(wrapper.find('input').attributes('list')).toBe('player-options')
  })

  it('strips leading whitespace on input event', async () => {
    const handler = vi.fn()
    const wrapper = mount(AppInput, {
      props: { modelValue: '', 'onUpdate:modelValue': handler },
    })
    await wrapper.find('input').setValue('   abc')
    expect(handler).toHaveBeenLastCalledWith('abc')
  })

  it('preserves middle and trailing whitespace during typing', async () => {
    const handler = vi.fn()
    const wrapper = mount(AppInput, {
      props: { modelValue: '', 'onUpdate:modelValue': handler },
    })
    await wrapper.find('input').setValue('John  Smith ')
    expect(handler).toHaveBeenLastCalledWith('John  Smith ')
  })

  it('does not trim trailing whitespace on input', async () => {
    const handler = vi.fn()
    const wrapper = mount(AppInput, {
      props: { modelValue: '', 'onUpdate:modelValue': handler },
    })
    await wrapper.find('input').setValue('John ')
    expect(handler).toHaveBeenLastCalledWith('John ')
  })

  it('whitespace-only input collapses to empty string', async () => {
    const handler = vi.fn()
    const wrapper = mount(AppInput, {
      props: { modelValue: '', 'onUpdate:modelValue': handler },
    })
    await wrapper.find('input').setValue('   ')
    expect(handler).toHaveBeenLastCalledWith('')
  })

  it('suffix slot forwards into the inner @ui Input', () => {
    const wrapper = mount(AppInput, {
      slots: { suffix: '<span>尾端內容</span>' },
    })
    expect(wrapper.text()).toContain('尾端內容')
  })

  it('trim=false passes raw value through on input', async () => {
    const handler = vi.fn()
    const wrapper = mount(AppInput, {
      props: { modelValue: '', trim: false, 'onUpdate:modelValue': handler },
    })
    await wrapper.find('input').setValue('   abc   ')
    expect(handler).toHaveBeenLastCalledWith('   abc   ')
  })
})
