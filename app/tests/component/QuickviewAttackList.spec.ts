import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AttackList from '~/components/business/character/quickview/AttackList.vue'
import { formatModifier, getAbilityModifier } from '~/helpers/ability'
import { formatDamageSummary, getAttackHit, getHitBonusColorClass } from '~/helpers/combat'
import type { AttackEntry } from '@rolling-dice-app/types'
import type { TotalAbilityScores } from '~/types/business/character-form'

const ABILITY_SCORES: TotalAbilityScores = {
  strength: 16, // mod +3
  dexterity: 14, // mod +2
  constitution: 12, // mod +1
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
}

beforeEach(() => {
  vi.stubGlobal('getAbilityModifier', getAbilityModifier)
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('getAttackHit', getAttackHit)
  vi.stubGlobal('getHitBonusColorClass', getHitBonusColorClass)
  vi.stubGlobal('formatDamageSummary', formatDamageSummary)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const makeAttack = (overrides: Partial<AttackEntry> = {}): AttackEntry => ({
  id: overrides.id ?? `atk-${Math.random()}`,
  name: '長劍',
  abilityKey: 'strength',
  damageDice: [{ id: 'd-1', dieType: 'd8', count: 1, bonus: null, damageType: 'slashing' }],
  extraHitBonus: null,
  applyAbilityToDamage: true,
  comment: null,
  ...overrides,
})

const mountList = (attacks: AttackEntry[] = [], proficiencyBonus = 2) =>
  mount(AttackList, {
    props: {
      attacks,
      abilityScores: ABILITY_SCORES,
      proficiencyBonus,
    },
    global: {
      mocks: {
        getAbilityModifier,
        formatModifier,
        getAttackHit,
        getHitBonusColorClass,
        formatDamageSummary,
      },
    },
  })

describe('QuickviewAttackList', () => {
  it('attacks = [] 顯示「尚未設定任何攻擊」、無 li', () => {
    const wrapper = mountList()
    expect(wrapper.text()).toContain('尚未設定任何攻擊')
    expect(wrapper.findAll('li')).toHaveLength(0)
  })

  it('多攻擊各自一行', () => {
    const wrapper = mountList([
      makeAttack({ id: 'a', name: '長劍' }),
      makeAttack({ id: 'b', name: '匕首' }),
    ])
    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.text()).toContain('長劍')
    expect(wrapper.text()).toContain('匕首')
  })

  it('未命名攻擊顯示「（未命名）」', () => {
    const wrapper = mountList([makeAttack({ name: '' })])
    expect(wrapper.text()).toContain('（未命名）')
  })

  it('有 comment 顯示 comment 文字', () => {
    const wrapper = mountList([makeAttack({ comment: '附加 1d6 火焰' })])
    expect(wrapper.text()).toContain('附加 1d6 火焰')
  })

  it('無 comment 時不渲染 comment 文字', () => {
    const wrapper = mountList([makeAttack({ name: '長劍', comment: null })])
    // 比對 li 內文字確保不含預期外內容；攻擊名與固定 label 仍應在
    expect(wrapper.text()).toContain('長劍')
    expect(wrapper.text()).toContain('命中')
    expect(wrapper.text()).not.toContain('附加')
  })

  it('命中加值顯示帶正負號、配色依正負', () => {
    // strength mod +3 + prof 2 + extra 0 = +5 → text-success
    const positive = mountList([makeAttack()])
    const positiveSpan = positive.find('li span.font-bold')
    expect(positiveSpan.text()).toBe('+5')
    expect(positiveSpan.classes()).toContain('text-success')

    // 拿掉 ability + 設負 extra = 負命中 → text-danger
    const negative = mountList([makeAttack({ abilityKey: null, extraHitBonus: -3 })])
    const negativeSpan = negative.find('li span.font-bold')
    expect(negativeSpan.text()).toBe('-1') // 0 + 2 + (-3)
    expect(negativeSpan.classes()).toContain('text-danger')
  })

  it('傷害文字反映 formatDamageSummary 結果', () => {
    const wrapper = mountList([makeAttack()])
    // applyAbilityToDamage true + str mod +3 → 1d8+3 劈砍
    expect(wrapper.text()).toContain('1d8+3')
    expect(wrapper.text()).toContain('劈砍')
  })
})
