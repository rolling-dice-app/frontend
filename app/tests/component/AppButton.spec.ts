import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppButton from '~/components/common/AppButton.vue'

const mountBtn = (props = {}, slot = 'Go') => mount(AppButton, { props, slots: { default: slot } })

describe('AppButton', () => {
  it('renders slot inside a button and defaults to primary md', () => {
    const wrapper = mountBtn()
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe('Go')
    expect(btn.classes()).toContain('min-h-11')
    expect(btn.attributes('style')).toContain('var(--color-primary)')
  })

  it('maps each variant to the expected @ui Button colors', () => {
    expect(mountBtn({ variant: 'danger' }).find('button').attributes('style')).toContain(
      'var(--color-danger)',
    )
    // secondary 走 outline，色彩變數出現在 --btn-color
    expect(mountBtn({ variant: 'secondary' }).find('button').attributes('style')).toContain(
      'var(--color-primary)',
    )
    const neutral = mountBtn({ variant: 'neutral' }).find('button')
    expect(neutral.attributes('style')).toContain('var(--color-border)')
    expect(neutral.attributes('style')).toContain('var(--color-content)')
  })

  it('ghost / neutral get a surface hover affordance', () => {
    expect(mountBtn({ variant: 'ghost' }).find('button').classes()).toContain('hover:bg-surface')
    expect(mountBtn({ variant: 'neutral' }).find('button').classes()).toContain('hover:bg-surface')
    expect(mountBtn({ variant: 'primary' }).find('button').classes()).not.toContain(
      'hover:bg-surface',
    )
  })

  // 等寬不變量：每個非 outline variant 都帶 1px border，box model 一致（reset 不會比 neutral 窄）
  it('every solid/transparent variant carries a 1px border for uniform width', () => {
    for (const variant of ['primary', 'neutral', 'ghost', 'danger'] as const) {
      expect(mountBtn({ variant }).find('button').attributes('style')).toContain('1px solid')
    }
  })

  it('size maps to the design-language min-height (36 / 44 / 52)', () => {
    expect(mountBtn({ size: 'sm' }).find('button').classes()).toContain('min-h-9')
    expect(mountBtn({ size: 'lg' }).find('button').classes()).toContain('min-h-13')
  })

  it('passes through native attrs and listeners', () => {
    const wrapper = mountBtn({ type: 'submit', disabled: true })
    const btn = wrapper.find('button')
    expect(btn.attributes('type')).toBe('submit')
    expect(btn.attributes('disabled')).toBeDefined()
  })
})
