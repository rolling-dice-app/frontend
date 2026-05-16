import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppBadge from '~/components/common/AppBadge.vue'

const mountBadge = (props = {}, slot = 'NEW') =>
  mount(AppBadge, { props, slots: { default: slot } })

describe('AppBadge', () => {
  it('default is neutral surface-2 + radius 4 and renders slot', () => {
    const el = mountBadge().element as HTMLElement
    expect(el.textContent).toContain('NEW')
    expect(el.style.backgroundColor).toContain('var(--color-surface-2)')
    expect(el.style.color).toContain('var(--color-content-muted)')
    expect(el.style.borderRadius).toBe('4px')
  })

  it('tier uses pill radius and lets the caller pass colors via attrs', () => {
    const el = mountBadge({ variant: 'tier', bgColor: 'gold' }).element as HTMLElement
    expect(el.style.borderRadius).toBe('9999px')
    expect(el.style.backgroundColor).toBe('gold')
  })

  it('status keeps radius 4 with caller-passed soft colors', () => {
    const el = mountBadge({ variant: 'status', bgColor: 'rgb(1, 2, 3)' }).element as HTMLElement
    expect(el.style.borderRadius).toBe('4px')
    expect(el.style.backgroundColor).toBe('rgb(1, 2, 3)')
  })

  it('caller attrs override default variant colors', () => {
    const el = mountBadge({ textColor: 'white' }).element as HTMLElement
    expect(el.style.color).toBe('white')
  })
})
