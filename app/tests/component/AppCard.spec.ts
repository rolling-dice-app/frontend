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

  it('elevated lifts with elev-1 shadow token + elevated bg token', () => {
    const root = mountCard({ variant: 'elevated' }).element as HTMLElement
    expect(root.style.backgroundColor).toContain('var(--color-canvas-elevated)')
    expect(root.className).toContain('shadow-elev-1')
  })

  it('inset uses inset bg token + inset shadow token utility', () => {
    const root = mountCard({ variant: 'inset' }).element as HTMLElement
    expect(root.style.backgroundColor).toContain('var(--color-canvas-inset)')
    expect(root.className).toContain('shadow-inset')
  })

  it('forwards header / footer slots, each padded', () => {
    const wrapper = mountCard({}, { default: 'Body', header: 'Head', footer: 'Foot' })
    expect(wrapper.text()).toContain('Head')
    expect(wrapper.text()).toContain('Foot')
    expect(wrapper.findAll('.p-4.sm\\:p-6').length).toBe(3)
  })
})
