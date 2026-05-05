import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SkillList from '~/components/business/character/quickview/SkillList.vue'
import { formatModifier, getAbilityModifier } from '~/helpers/ability'
import { getSkillBonus } from '~/helpers/character'
import type { TotalAbilityScores } from '~/types/business/character-form'
import type { ProficiencyLevel, SkillKey } from '@rolling-dice-app/types'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('getAbilityModifier', getAbilityModifier)
  vi.stubGlobal('getSkillBonus', getSkillBonus)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ABILITY_SCORES: TotalAbilityScores = {
  strength: 16, // mod +3
  dexterity: 14, // mod +2
  constitution: 12,
  intelligence: 10,
  wisdom: 12, // mod +1
  charisma: 10,
}

const mountList = (
  params: {
    skills?: Partial<Record<SkillKey, Exclude<ProficiencyLevel, 'none'>>>
    proficiencyBonus?: number
    isJackOfAllTrades?: boolean
  } = {},
) =>
  mount(SkillList, {
    props: {
      abilityScores: ABILITY_SCORES,
      proficiencyBonus: params.proficiencyBonus ?? 2,
      skills: params.skills ?? {},
      isJackOfAllTrades: params.isJackOfAllTrades ?? false,
    },
    global: {
      mocks: { formatModifier, getAbilityModifier, getSkillBonus },
    },
  })

const skillRow = (wrapper: ReturnType<typeof mountList>, name: string) =>
  wrapper.findAll('div.flex.items-center.justify-between').find((row) => row.text().includes(name))

describe('SkillList', () => {
  it('渲染 18 個技能', () => {
    const wrapper = mountList()
    expect(wrapper.findAll('div.flex.items-center.justify-between')).toHaveLength(18)
  })

  describe('熟練度與加值計算', () => {
    it('proficient 技能加 proficiencyBonus', () => {
      // 運動 (力量)：mod +3 + prof 2 = +5
      const wrapper = mountList({ skills: { athletics: 'proficient' }, proficiencyBonus: 2 })
      const row = skillRow(wrapper, '運動')!
      expect(row.text()).toContain('+5')
    })

    it('expertise 技能加 2 × proficiencyBonus', () => {
      // 特技 (敏捷)：mod +2 + 2*prof 2 = +6
      const wrapper = mountList({ skills: { acrobatics: 'expertise' }, proficiencyBonus: 2 })
      const row = skillRow(wrapper, '特技')!
      expect(row.text()).toContain('+6')
    })

    it('未熟練技能僅顯示 ability mod', () => {
      // 隱匿 (敏捷)：mod +2，無熟練 → +2
      const wrapper = mountList({ skills: {}, proficiencyBonus: 2 })
      const row = skillRow(wrapper, '隱匿')!
      expect(row.text()).toContain('+2')
    })
  })

  describe('Jack of All Trades', () => {
    it('啟用後未熟練技能加 floor(prof/2)', () => {
      // 隱匿 (敏捷)：mod +2 + jack 2 = +4
      const wrapper = mountList({ skills: {}, proficiencyBonus: 4, isJackOfAllTrades: true })
      const row = skillRow(wrapper, '隱匿')!
      expect(row.text()).toContain('+4')
    })

    it('已熟練技能不加 jack 加值', () => {
      // 運動 (力量)：mod +3 + prof 4 = +7（不額外加 jack 2）
      const wrapper = mountList({
        skills: { athletics: 'proficient' },
        proficiencyBonus: 4,
        isJackOfAllTrades: true,
      })
      const row = skillRow(wrapper, '運動')!
      expect(row.text()).toContain('+7')
    })
  })
})
