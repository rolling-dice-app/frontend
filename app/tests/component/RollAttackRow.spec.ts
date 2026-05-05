import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RollAttackRow from '~/components/business/character/quickview/RollAttackRow.vue'
import { formatModifier, getAbilityModifier } from '~/helpers/ability'
import type { AttackEntry } from '@rolling-dice-app/types'
import type { TotalAbilityScores } from '~/types/business/character-form'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('getAbilityModifier', getAbilityModifier)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ABILITY_SCORES: TotalAbilityScores = {
  strength: 16, // mod +3
  dexterity: 14,
  constitution: 12,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
}

const makeAttack = (overrides: Partial<AttackEntry> = {}): AttackEntry => ({
  id: 'a-1',
  name: '長劍',
  abilityKey: 'strength',
  damageDice: [{ id: 'd-1', dieType: 'd8', count: 1, bonus: null, damageType: 'slashing' }],
  extraHitBonus: null,
  applyAbilityToDamage: true,
  comment: null,
  ...overrides,
})

const mountRow = (params: { attack?: AttackEntry; proficiencyBonus?: number } = {}) =>
  mount(RollAttackRow, {
    props: {
      attack: params.attack ?? makeAttack(),
      abilityScores: ABILITY_SCORES,
      proficiencyBonus: params.proficiencyBonus ?? 2,
    },
    global: {
      stubs: { Icon: true },
      mocks: { formatModifier, getAbilityModifier },
    },
  })

const btn = (wrapper: ReturnType<typeof mountRow>, label: string) =>
  wrapper.find(`button[aria-label="${label}"]`)

describe('RollAttackRow', () => {
  describe('顯示', () => {
    it('顯示攻擊名與計算後 hit bonus', () => {
      // strength mod +3 + prof 2 = +5
      const wrapper = mountRow({ attack: makeAttack({ name: '長劍' }) })
      expect(wrapper.text()).toContain('長劍')
      expect(wrapper.text()).toContain('+5')
    })

    it('未命名顯示「（未命名）」', () => {
      const wrapper = mountRow({ attack: makeAttack({ name: '' }) })
      expect(wrapper.text()).toContain('（未命名）')
    })

    it('hit bonus 計算反映正 / 負 / 零分支', () => {
      // str mod +3 + prof 2 = +5
      expect(mountRow({ attack: makeAttack() }).text()).toContain('+5')
      // 0 + 2 + (-3) = -1
      expect(
        mountRow({ attack: makeAttack({ abilityKey: null, extraHitBonus: -3 }) }).text(),
      ).toContain('-1')
      // 0 + 2 + (-2) = 0
      expect(
        mountRow({ attack: makeAttack({ abilityKey: null, extraHitBonus: -2 }) }).text(),
      ).toContain('+0')
    })

    it('傷害文字反映 formatDamageSummary 結果', () => {
      // 1d8 + str mod +3 → 1d8+3
      const wrapper = mountRow()
      expect(wrapper.text()).toContain('1d8+3')
      expect(wrapper.text()).toContain('劈砍')
    })

    it('comment 有 / 無分別渲染', () => {
      const withComment = mountRow({ attack: makeAttack({ comment: '附加效果' }) })
      expect(withComment.text()).toContain('附加效果')

      const withoutComment = mountRow({ attack: makeAttack({ comment: null }) })
      expect(withoutComment.text()).not.toContain('附加效果')
    })
  })

  describe('命中互動', () => {
    it('點一般命中 emit roll-hit [normal]', async () => {
      const wrapper = mountRow({ attack: makeAttack({ name: '長劍' }) })
      await btn(wrapper, '長劍 一般命中').trigger('click')
      expect(wrapper.emitted('roll-hit')).toEqual([['normal']])
    })

    it('點優勢命中 emit roll-hit [advantage]', async () => {
      const wrapper = mountRow({ attack: makeAttack({ name: '長劍' }) })
      await btn(wrapper, '長劍 優勢命中').trigger('click')
      expect(wrapper.emitted('roll-hit')).toEqual([['advantage']])
    })

    it('點劣勢命中 emit roll-hit [disadvantage]', async () => {
      const wrapper = mountRow({ attack: makeAttack({ name: '長劍' }) })
      await btn(wrapper, '長劍 劣勢命中').trigger('click')
      expect(wrapper.emitted('roll-hit')).toEqual([['disadvantage']])
    })

    it('未命名攻擊 aria-label fallback 為「攻擊」', async () => {
      const wrapper = mountRow({ attack: makeAttack({ name: '' }) })
      await btn(wrapper, '攻擊 一般命中').trigger('click')
      expect(wrapper.emitted('roll-hit')).toEqual([['normal']])
    })
  })

  describe('傷害互動', () => {
    it('點一般傷害 emit roll-damage [false]', async () => {
      const wrapper = mountRow({ attack: makeAttack({ name: '長劍' }) })
      await btn(wrapper, '長劍 一般傷害').trigger('click')
      expect(wrapper.emitted('roll-damage')).toEqual([[false]])
    })

    it('點重擊傷害 emit roll-damage [true]', async () => {
      const wrapper = mountRow({ attack: makeAttack({ name: '長劍' }) })
      await btn(wrapper, '長劍 重擊傷害').trigger('click')
      expect(wrapper.emitted('roll-damage')).toEqual([[true]])
    })
  })
})
