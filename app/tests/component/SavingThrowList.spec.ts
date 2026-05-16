import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SavingThrowList from '~/components/business/character/quickview/SavingThrowList.vue'
import { formatModifier, getAbilityModifier } from '~/helpers/ability'
import {
  calculateSavingThrowBonuses,
  getSavingThrowBonus,
  getSpellSaveDc,
} from '~/helpers/character'
import type { TotalAbilityScores } from '~/types/business/character-form'
import type { AbilityKey } from '@rolling-dice-app/core'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('getAbilityModifier', getAbilityModifier)
  vi.stubGlobal('getSavingThrowBonus', getSavingThrowBonus)
  vi.stubGlobal('calculateSavingThrowBonuses', calculateSavingThrowBonuses)
  vi.stubGlobal('getSpellSaveDc', getSpellSaveDc)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ABILITY_SCORES: TotalAbilityScores = {
  strength: 16, // mod +3
  dexterity: 14, // mod +2
  constitution: 12, // mod +1
  intelligence: 18, // mod +4
  wisdom: 10,
  charisma: 8, // mod -1
}

const mountList = (
  params: {
    proficiencies?: AbilityKey[]
    adjustments?: Partial<Record<AbilityKey, number>>
    spellcastingAbilities?: AbilityKey[]
    customSpellcastingBonuses?: Partial<Record<AbilityKey, number>>
    proficiencyBonus?: number
  } = {},
) =>
  mount(SavingThrowList, {
    props: {
      abilityScores: ABILITY_SCORES,
      proficiencyBonus: params.proficiencyBonus ?? 2,
      proficiencies: params.proficiencies ?? [],
      adjustments: params.adjustments ?? {},
      spellcastingAbilities: params.spellcastingAbilities ?? [],
      customSpellcastingBonuses: params.customSpellcastingBonuses ?? {},
    },
    global: {
      stubs: { Icon: true },
      mocks: {
        formatModifier,
        getAbilityModifier,
        getSavingThrowBonus,
        calculateSavingThrowBonuses,
        getSpellSaveDc,
      },
    },
  })

const decBtn = (wrapper: ReturnType<typeof mountList>, name: string) =>
  wrapper.find(`button[aria-label="${name} 豁免 -1"]`)
const incBtn = (wrapper: ReturnType<typeof mountList>, name: string) =>
  wrapper.find(`button[aria-label="${name} 豁免 +1"]`)

describe('SavingThrowList', () => {
  describe('渲染', () => {
    it('渲染 6 個屬性 row', () => {
      const wrapper = mountList()
      expect(wrapper.findAll('ul > li')).toHaveLength(6)
    })

    it('每 row 顯示屬性名與分數', () => {
      const wrapper = mountList()
      expect(wrapper.text()).toContain('力量')
      expect(wrapper.text()).toContain('(16)')
      expect(wrapper.text()).toContain('魅力')
      expect(wrapper.text()).toContain('(8)')
    })
  })

  describe('熟練狀態', () => {
    it('proficient 屬性 aria-label 含「（熟練）」', () => {
      const wrapper = mountList({ proficiencies: ['strength'] })
      expect(wrapper.find('div[aria-label="力量（熟練）"]').exists()).toBe(true)
      expect(wrapper.find('div[aria-label="敏捷"]').exists()).toBe(true)
    })

    it('proficient bonus = mod + prof + adjustment', () => {
      // 力量熟練：mod +3 + prof 2 = +5；不熟練 = mod +3 = +3
      const wrapper = mountList({ proficiencies: ['strength'], proficiencyBonus: 2 })
      const strengthRow = wrapper.findAll('ul > li')[0]!
      expect(strengthRow.text()).toContain('+5')
    })

    it('未熟練 bonus = mod + adjustment', () => {
      // 體質：mod +1 + 0 = +1
      const wrapper = mountList()
      const conRow = wrapper.findAll('ul > li')[2]!
      expect(conRow.text()).toContain('+1')
    })
  })

  describe('調整值', () => {
    it('adjustment > 0 顯示 +N、aria-label 反映目前調整', () => {
      const wrapper = mountList({ adjustments: { strength: 2 } })
      const strengthRow = wrapper.findAll('ul > li')[0]!
      expect(strengthRow.find('span[aria-label="目前調整 +2"]').exists()).toBe(true)
    })

    it('adjustment 套入 bonus（mod + prof + adjustment）', () => {
      // 力量：mod +3 + adjust +2 = +5（不熟練）
      const wrapper = mountList({ adjustments: { strength: 2 } })
      const strengthRow = wrapper.findAll('ul > li')[0]!
      expect(strengthRow.text()).toContain('+5')
    })
  })

  describe('調整按鈕互動', () => {
    it('- 按鈕 emit adjust [key, -1]', async () => {
      const wrapper = mountList()
      await decBtn(wrapper, '力量').trigger('click')
      expect(wrapper.emitted('adjust')).toEqual([['strength', -1]])
    })

    it('+ 按鈕 emit adjust [key, +1]', async () => {
      const wrapper = mountList()
      await incBtn(wrapper, '魅力').trigger('click')
      expect(wrapper.emitted('adjust')).toEqual([['charisma', 1]])
    })
  })

  describe('法術豁免 DC', () => {
    it('spellcastingAbilities = [] 時不渲染法術 DC 區', () => {
      const wrapper = mountList()
      expect(wrapper.text()).not.toContain('法術豁免 DC')
    })

    it('spellcastingAbilities 有資料時渲染區塊與 DC 數值', () => {
      // intelligence mod +4 + prof 2 + 8 = 14
      const wrapper = mountList({
        spellcastingAbilities: ['intelligence'],
        proficiencyBonus: 2,
      })
      expect(wrapper.text()).toContain('法術豁免 DC')
      expect(wrapper.text()).toContain('智力')
      expect(wrapper.text()).toContain('14')
    })

    it('customSpellcastingBonuses 套入 DC 計算', () => {
      // intelligence DC base = 14；+2 custom = 16
      const wrapper = mountList({
        spellcastingAbilities: ['intelligence'],
        customSpellcastingBonuses: { intelligence: 2 },
        proficiencyBonus: 2,
      })
      expect(wrapper.text()).toContain('16')
    })
  })
})
