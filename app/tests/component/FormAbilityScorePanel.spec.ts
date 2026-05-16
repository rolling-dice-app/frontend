import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppSelect from '~/components/common/AppSelect.vue'
import AppButton from '~/components/common/AppButton.vue'
import AbilityScorePanel from '~/components/business/character/form/basic/AbilityScorePanel.vue'
import { formatModifier, getAbilityModifier } from '~/helpers/ability'
import type { AbilityScores, DiceSlot } from '~/types/business/character-form'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('getAbilityModifier', getAbilityModifier)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ButtonStub = {
  name: 'Button',
  props: ['size', 'outline', 'borderColor', 'bgColor', 'textColor', 'radius'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
}

const baseAbilities = (overrides: Partial<AbilityScores> = {}): AbilityScores =>
  ({
    strength: { origin: 10, race: 0 },
    dexterity: { origin: 10, race: 0 },
    constitution: { origin: 10, race: 0 },
    intelligence: { origin: 10, race: 0 },
    wisdom: { origin: 10, race: 0 },
    charisma: { origin: 10, race: 0 },
    ...overrides,
  }) as AbilityScores

const mountPanel = (
  params: {
    abilities?: AbilityScores
    abilityMethod?: 'custom' | 'diceRoll'
    pointBuyUsage?: number | null
    dicePool?: DiceSlot[]
  } = {},
) =>
  mount(AbilityScorePanel, {
    props: {
      abilities: params.abilities ?? baseAbilities(),
      abilityMethod: params.abilityMethod ?? 'custom',
      pointBuyUsage: 'pointBuyUsage' in params ? params.pointBuyUsage! : 0,
      dicePool: params.dicePool ?? [],
    },
    global: {
      stubs: { Icon: true, Button: ButtonStub },
      components: { CommonAppSelect: AppSelect, CommonAppButton: AppButton },
      mocks: { formatModifier, getAbilityModifier },
    },
  })

const decBtn = (wrapper: ReturnType<typeof mountPanel>, abilityIndex: number) =>
  wrapper.findAll('button[aria-label="減少"]')[abilityIndex]!
const incBtn = (wrapper: ReturnType<typeof mountPanel>, abilityIndex: number) =>
  wrapper.findAll('button[aria-label="增加"]')[abilityIndex]!

describe('AbilityScorePanel (form)', () => {
  describe('Method 切換', () => {
    it('custom 模式下顯示「自訂」與「擲骰」按鈕', () => {
      const wrapper = mountPanel({ abilityMethod: 'custom' })
      const buttons = wrapper.findAll('button')
      expect(buttons.some((b) => b.text() === '自訂')).toBe(true)
      expect(buttons.some((b) => b.text() === '擲骰')).toBe(true)
    })

    it('點「擲骰」按鈕 emit update:method [diceRoll]', async () => {
      const wrapper = mountPanel({ abilityMethod: 'custom' })
      const diceBtn = wrapper.findAll('button').find((b) => b.text() === '擲骰')!
      await diceBtn.trigger('click')
      expect(wrapper.emitted('update:method')).toEqual([['diceRoll']])
    })
  })

  describe('Custom 模式：屬性 stepper', () => {
    it('六屬性各一組 ± 按鈕', () => {
      const wrapper = mountPanel({ abilityMethod: 'custom' })
      expect(wrapper.findAll('button[aria-label="減少"]')).toHaveLength(6)
      expect(wrapper.findAll('button[aria-label="增加"]')).toHaveLength(6)
    })

    it('+ 點擊 emit update:score [key, score+1]', async () => {
      const wrapper = mountPanel({
        abilityMethod: 'custom',
        abilities: baseAbilities({ strength: { origin: 12, race: 0 } } as AbilityScores),
      })
      await incBtn(wrapper, 0).trigger('click')
      expect(wrapper.emitted('update:score')).toEqual([['strength', 13]])
    })

    it('- 點擊 emit update:score [key, score-1]', async () => {
      const wrapper = mountPanel({
        abilityMethod: 'custom',
        abilities: baseAbilities({ strength: { origin: 12, race: 0 } } as AbilityScores),
      })
      await decBtn(wrapper, 0).trigger('click')
      expect(wrapper.emitted('update:score')).toEqual([['strength', 11]])
    })

    it('origin 達 CUSTOM_ABILITY_MIN (1) 時 - 按鈕 disabled', () => {
      const wrapper = mountPanel({
        abilityMethod: 'custom',
        abilities: baseAbilities({ strength: { origin: 1, race: 0 } } as AbilityScores),
      })
      expect(decBtn(wrapper, 0).attributes('disabled')).toBeDefined()
    })

    it('origin 達 CUSTOM_ABILITY_MAX (20) 時 + 按鈕 disabled', () => {
      const wrapper = mountPanel({
        abilityMethod: 'custom',
        abilities: baseAbilities({ strength: { origin: 20, race: 0 } } as AbilityScores),
      })
      expect(incBtn(wrapper, 0).attributes('disabled')).toBeDefined()
    })
  })

  describe('Custom 模式：購點計', () => {
    it('pointBuyUsage 數字顯示「已使用 N / X 點」', () => {
      const wrapper = mountPanel({ abilityMethod: 'custom', pointBuyUsage: 8 })
      expect(wrapper.text()).toContain('已使用 8')
    })

    it('pointBuyUsage = null 顯示「超出購點計算範圍」', () => {
      const wrapper = mountPanel({ abilityMethod: 'custom', pointBuyUsage: null })
      expect(wrapper.text()).toContain('超出購點計算範圍')
    })

    it('重置按鈕點擊 emit reset:abilities', async () => {
      const wrapper = mountPanel({ abilityMethod: 'custom' })
      const resetBtn = wrapper.findAll('button').find((b) => b.text() === '重置屬性')!
      await resetBtn.trigger('click')
      expect(wrapper.emitted('reset:abilities')).toEqual([[]])
    })
  })

  describe('DiceRoll 模式：骰值池與下拉', () => {
    it('dicePool 為空時不顯示骰值池區塊', () => {
      const wrapper = mountPanel({ abilityMethod: 'diceRoll', dicePool: [] })
      expect(wrapper.find('ul[aria-label="骰值池"]').exists()).toBe(false)
    })

    it('dicePool 有資料顯示六筆 li 與重擲按鈕', () => {
      const wrapper = mountPanel({
        abilityMethod: 'diceRoll',
        dicePool: [
          { id: 'd1', value: 14, assignedTo: null },
          { id: 'd2', value: 13, assignedTo: null },
          { id: 'd3', value: 12, assignedTo: null },
          { id: 'd4', value: 11, assignedTo: null },
          { id: 'd5', value: 10, assignedTo: null },
          { id: 'd6', value: 8, assignedTo: null },
        ],
      })
      const slots = wrapper.findAll('ul[aria-label="骰值池"] > li')
      expect(slots).toHaveLength(6)
      expect(wrapper.findAll('button').some((b) => b.text().includes('重擲'))).toBe(true)
    })

    it('點重擲按鈕 emit roll:all', async () => {
      const wrapper = mountPanel({
        abilityMethod: 'diceRoll',
        dicePool: [{ id: 'd1', value: 14, assignedTo: null }],
      })
      const rollBtn = wrapper.findAll('button').find((b) => b.text().includes('重擲'))!
      await rollBtn.trigger('click')
      expect(wrapper.emitted('roll:all')).toEqual([[]])
    })

    it('改 select 指派 emit assign:dice [key, slotId]', async () => {
      const wrapper = mountPanel({
        abilityMethod: 'diceRoll',
        dicePool: [
          { id: 'd1', value: 14, assignedTo: null },
          { id: 'd2', value: 13, assignedTo: null },
        ],
      })
      const selects = wrapper.findAllComponents({ name: 'Select' })
      const strSelect = selects[0]!
      strSelect.vm.$emit('update:modelValue', 'd1')
      expect(wrapper.emitted('assign:dice')).toEqual([['strength', 'd1']])
    })

    it('改 select 為 "" 時 emit assign:dice [key, null]', async () => {
      const wrapper = mountPanel({
        abilityMethod: 'diceRoll',
        dicePool: [{ id: 'd1', value: 14, assignedTo: 'strength' }],
      })
      const selects = wrapper.findAllComponents({ name: 'Select' })
      const strSelect = selects[0]!
      strSelect.vm.$emit('update:modelValue', '')
      expect(wrapper.emitted('assign:dice')).toEqual([['strength', null]])
    })
  })
})
