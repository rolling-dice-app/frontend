import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppCard from '~/components/common/AppCard.vue'

const mountCard = (props = {}, slots: Record<string, string> = { default: 'Body' }) =>
  mount(AppCard, { props, slots })

describe('AppCard', () => {
  it('renders the default slot wrapped in responsive padding', () => {
    const wrapper = mountCard()
    expect(wrapper.text()).toContain('Body')
    const padded = wrapper.find('.p-4.sm\\:p-6')
    expect(padded.exists()).toBe(true)
    expect(padded.text()).toContain('Body')
  })

  it('flat (default) has no shadow and a soft border', () => {
    const root = mountCard().element as HTMLElement
    expect(root.className).toContain('border-border-soft')
    expect(root.style.boxShadow).toBe('none')
  })

  it('elevated lifts with shadow + elevated bg token', () => {
    const root = mountCard({ variant: 'elevated' }).element as HTMLElement
    expect(root.style.backgroundColor).toContain('var(--color-canvas-elevated)')
    expect(root.style.boxShadow).not.toBe('none')
  })

  it('inset uses inset bg token + inner shadow utility', () => {
    const root = mountCard({ variant: 'inset' }).element as HTMLElement
    expect(root.style.backgroundColor).toContain('var(--color-canvas-inset)')
    expect(root.className).toContain('shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]')
  })

  it('forwards header / footer slots, each padded', () => {
    const wrapper = mountCard({}, { default: 'Body', header: 'Head', footer: 'Foot' })
    expect(wrapper.text()).toContain('Head')
    expect(wrapper.text()).toContain('Foot')
    expect(wrapper.findAll('.p-4.sm\\:p-6').length).toBe(3)
  })
})
