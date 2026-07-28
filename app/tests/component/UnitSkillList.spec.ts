import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UnitSkillList from '~/components/business/battlefield/UnitSkillList.vue'
import { formatModifier } from '~/helpers/ability'
import type { SkillKey } from '@rolling-dice-app/core'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const mountList = (skills: Partial<Record<SkillKey, number>>) =>
  mount(UnitSkillList, {
    props: { skills },
    global: { stubs: { Icon: true }, mocks: { formatModifier } },
  })

describe('UnitSkillList', () => {
  it('只列出有加值的技能，依 SKILL_KEYS 順序渲染', () => {
    const wrapper = mountList({ perception: 7, stealth: 8, athletics: 6 })
    const labels = wrapper.findAll('li span:first-child').map((node) => node.text())
    // SKILL_KEYS 序：athletics（力量）→ stealth（敏捷）→ perception（感知）
    expect(labels).toEqual(['運動', '隱匿', '察覺'])
    expect(wrapper.text()).toContain('+8')
  })

  it('三鈕 emit roll 帶技能 key 與模式', async () => {
    const wrapper = mountList({ stealth: 8 })
    await wrapper.find('button[aria-label="隱匿 一般擲骰"]').trigger('click')
    await wrapper.find('button[aria-label="隱匿 優勢擲骰"]').trigger('click')
    await wrapper.find('button[aria-label="隱匿 劣勢擲骰"]').trigger('click')
    expect(wrapper.emitted('roll')).toEqual([
      ['stealth', 'normal'],
      ['stealth', 'advantage'],
      ['stealth', 'disadvantage'],
    ])
  })

  it('負加值以 - 顯示', () => {
    expect(mountList({ history: -1 }).text()).toContain('-1')
  })
})
