import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DeathSavesSection from '~/components/business/battlefield/DeathSavesSection.vue'

const BadgeStub = {
  name: 'CommonAppBadge',
  props: ['variant', 'size', 'bgColor'],
  template: '<span data-badge><slot /></span>',
}

const mountSection = (successes = 0, failures = 0) =>
  mount(DeathSavesSection, {
    props: { successes, failures },
    global: {
      stubs: { Icon: true },
      components: { CommonAppBadge: BadgeStub },
    },
  })

const pip = (wrapper: ReturnType<typeof mountSection>, label: string) =>
  wrapper.find(`button[aria-label="${label}"]`)
const rollBtn = (wrapper: ReturnType<typeof mountSection>) =>
  wrapper.find('button[aria-label="擲死亡豁免"]')

describe('DeathSavesSection', () => {
  it('圓點依計數填色（aria-pressed）', () => {
    const wrapper = mountSection(2, 1)
    expect(pip(wrapper, '成功 2').attributes('aria-pressed')).toBe('true')
    expect(pip(wrapper, '成功 3').attributes('aria-pressed')).toBe('false')
    expect(pip(wrapper, '失敗 1').attributes('aria-pressed')).toBe('true')
  })

  it('點擊圓點 emit setSuccess / setFailure；點同值退一格（toggle）', async () => {
    const wrapper = mountSection(2, 0)
    await pip(wrapper, '成功 3').trigger('click')
    expect(wrapper.emitted('setSuccess')).toEqual([[3]])
    await pip(wrapper, '成功 2').trigger('click') // 現值 2 → 退為 1
    expect(wrapper.emitted('setSuccess')![1]).toEqual([1])
    await pip(wrapper, '失敗 1').trigger('click')
    expect(wrapper.emitted('setFailure')).toEqual([[1]])
  })

  it('進行中可擲並 emit roll；狀態 badge 顯示進行中', async () => {
    const wrapper = mountSection(1, 1)
    expect(wrapper.find('[data-badge]').text()).toBe('進行中')
    await rollBtn(wrapper).trigger('click')
    expect(wrapper.emitted('roll')).toHaveLength(1)
  })

  it('已穩定（成功 3）或已死亡（失敗 3）時禁擲並顯示對應狀態', () => {
    const stable = mountSection(3, 0)
    expect(stable.find('[data-badge]').text()).toBe('已穩定')
    expect(rollBtn(stable).attributes('disabled')).toBeDefined()

    const dead = mountSection(0, 3)
    expect(dead.find('[data-badge]').text()).toBe('已死亡')
    expect(rollBtn(dead).attributes('disabled')).toBeDefined()
  })
})
