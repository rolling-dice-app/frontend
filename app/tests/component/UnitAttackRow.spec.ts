import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UnitAttackRow from '~/components/business/battlefield/UnitAttackRow.vue'
import { formatModifier } from '~/helpers/ability'
import type { BattlefieldAttackEntry } from '@rolling-dice-app/core'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const makeAttack = (overrides: Partial<BattlefieldAttackEntry> = {}): BattlefieldAttackEntry => ({
  id: 'a-1',
  name: '毒咬',
  hitBonus: 5,
  damageDice: [
    { id: 'd-1', dieType: 8, count: 1, bonus: 3, damageType: 'piercing' },
    { id: 'd-2', dieType: 8, count: 2, bonus: null, damageType: 'poison' },
  ],
  comment: null,
  ...overrides,
})

const mountRow = (attack: BattlefieldAttackEntry = makeAttack()) =>
  mount(UnitAttackRow, {
    props: { attack },
    global: { stubs: { Icon: true }, mocks: { formatModifier } },
  })

describe('UnitAttackRow', () => {
  it('渲染名稱、攤平命中加值與傷害摘要', () => {
    const wrapper = mountRow()
    const text = wrapper.text()
    expect(text).toContain('毒咬')
    expect(text).toContain('+5')
    expect(text).toContain('1d8+3 穿刺 + 2d8 毒素')
  })

  it('comment 有值才渲染', () => {
    expect(mountRow().text()).not.toContain('DC 11')
    expect(mountRow(makeAttack({ comment: 'DC 11 體質豁免' })).text()).toContain('DC 11 體質豁免')
  })

  it('命中三鈕 emit roll-hit 對應模式', async () => {
    const wrapper = mountRow()
    await wrapper.find('button[aria-label="毒咬 一般命中"]').trigger('click')
    await wrapper.find('button[aria-label="毒咬 優勢命中"]').trigger('click')
    await wrapper.find('button[aria-label="毒咬 劣勢命中"]').trigger('click')
    expect(wrapper.emitted('roll-hit')).toEqual([['normal'], ['advantage'], ['disadvantage']])
  })

  it('傷害兩鈕 emit roll-damage 普通 / 爆擊', async () => {
    const wrapper = mountRow()
    await wrapper.find('button[aria-label="毒咬 一般傷害"]').trigger('click')
    await wrapper.find('button[aria-label="毒咬 重擊傷害"]').trigger('click')
    expect(wrapper.emitted('roll-damage')).toEqual([[false], [true]])
  })
})
