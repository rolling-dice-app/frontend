import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RollAdHocBar from '~/components/business/character-detail/quickview/RollAdHocBar.vue'

const mountBar = () => mount(RollAdHocBar)

const clickBtn = async (wrapper: ReturnType<typeof mountBar>, ariaLabel: string): Promise<void> => {
  await wrapper.find(`button[aria-label="${ariaLabel}"]`).trigger('click')
}

describe('RollAdHocBar', () => {
  it('渲染 d4 / d6 / d8 / d10 / d12 / d20 / d100 共 7 顆按鈕', () => {
    const wrapper = mountBar()
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(7)
    for (const label of ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']) {
      expect(wrapper.find(`button[aria-label="${label}"]`).exists()).toBe(true)
    }
  })

  it.each([
    ['d4', 4],
    ['d6', 6],
    ['d8', 8],
    ['d10', 10],
    ['d12', 12],
    ['d20', 20],
  ] as const)('點 %s emit roll { kind: "raw", sides: %i }', async (label, sides) => {
    const wrapper = mountBar()
    await clickBtn(wrapper, label)
    expect(wrapper.emitted('roll')).toEqual([[{ kind: 'raw', sides }]])
  })

  it('點 d100 emit roll { kind: "d100" }', async () => {
    const wrapper = mountBar()
    await clickBtn(wrapper, 'd100')
    expect(wrapper.emitted('roll')).toEqual([[{ kind: 'd100' }]])
  })
})
