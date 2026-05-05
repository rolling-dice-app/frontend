import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppInput from '~/components/common/AppInput.vue'
import AppSelect from '~/components/common/AppSelect.vue'
import OtherAttributesPanel from '~/components/business/character/form/combat/OtherAttributesPanel.vue'
import { formatModifier } from '~/helpers/ability'
import { parseIntegerInput } from '~/utils/parse'
import type { CharacterUpdateFormState } from '~/types/business/character-form'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ToggleStub = {
  name: 'Toggle',
  props: ['modelValue', 'size', 'color'],
  emits: ['update:modelValue'],
  template: `
    <input
      type="checkbox"
      role="switch"
      :checked="modelValue"
      :aria-label="$attrs['aria-label']"
      @change="$emit('update:modelValue', $event.target.checked)"
    />`,
  inheritAttrs: false,
}

const baseFormState = (
  overrides: Partial<CharacterUpdateFormState> = {},
): CharacterUpdateFormState =>
  ({
    isTough: false,
    customHpBonus: 0,
    speedBonus: 0,
    initiativeBonus: 0,
    initiativeAbilityKey: null,
    passivePerceptionBonus: 0,
    passiveInsightBonus: 0,
    ...overrides,
  }) as unknown as CharacterUpdateFormState

const mountPanel = (
  params: {
    formState?: CharacterUpdateFormState
    totalHp?: number
    totalSpeed?: number
    totalInitiative?: number
    totalPassivePerception?: number
    totalPassiveInsight?: number
  } = {},
) => {
  const formState = params.formState ?? baseFormState()
  return mount(OtherAttributesPanel, {
    props: {
      formState,
      'onUpdate:formState': (next: CharacterUpdateFormState) => Object.assign(formState, next),
      totalHp: params.totalHp ?? 30,
      totalSpeed: params.totalSpeed ?? 30,
      totalInitiative: params.totalInitiative ?? 2,
      totalPassivePerception: params.totalPassivePerception ?? 12,
      totalPassiveInsight: params.totalPassiveInsight ?? 11,
    },
    global: {
      stubs: { Toggle: ToggleStub },
      components: { CommonAppInput: AppInput, CommonAppSelect: AppSelect },
      mocks: { formatModifier, parseIntegerInput },
    },
  })
}

describe('OtherAttributesPanel (form)', () => {
  describe('衍生值顯示', () => {
    it('總 HP / 速度 / 被動值 / 先攻 反映 props', () => {
      const wrapper = mountPanel({
        totalHp: 25,
        totalSpeed: 35,
        totalInitiative: 3,
        totalPassivePerception: 14,
        totalPassiveInsight: 13,
      })
      const text = wrapper.text()
      expect(text).toContain('25')
      expect(text).toContain('35')
      expect(text).toContain('14')
      expect(text).toContain('13')
      expect(text).toContain('+3')
    })

    it('initiative 配色：> 0 success、< 0 danger、= 0 muted', () => {
      const positive = mountPanel({ totalInitiative: 2 })
      const initOut = positive.findAll('output').find((o) => o.text().match(/^[+-]\d+$/))!
      expect(initOut.classes()).toContain('text-success')

      const negative = mountPanel({ totalInitiative: -1 })
      const initOutNeg = negative.findAll('output').find((o) => o.text().match(/^[+-]\d+$/))!
      expect(initOutNeg.classes()).toContain('text-danger')

      const zero = mountPanel({ totalInitiative: 0 })
      const initOutZero = zero.findAll('output').find((o) => o.text() === '+0')!
      expect(initOutZero.classes()).toContain('text-content-muted')
    })
  })

  describe('健壯 toggle', () => {
    it('formState.isTough true 時 checked', () => {
      const wrapper = mountPanel({ formState: baseFormState({ isTough: true }) })
      expect((wrapper.find('input[role="switch"]').element as HTMLInputElement).checked).toBe(true)
    })

    it('切換時更新 formState.isTough', async () => {
      const formState = baseFormState({ isTough: false })
      const wrapper = mountPanel({ formState })
      await wrapper.find('input[role="switch"]').setValue(true)
      expect(formState.isTough).toBe(true)
    })
  })

  describe('額外加值輸入', () => {
    it('customHpBonus 輸入更新 formState', async () => {
      const formState = baseFormState({ customHpBonus: 0 })
      const wrapper = mountPanel({ formState })
      await wrapper.find('input#custom-hp-bonus').setValue('5')
      expect(formState.customHpBonus).toBe(5)
    })

    it('speedBonus 輸入更新 formState', async () => {
      const formState = baseFormState({ speedBonus: 0 })
      const wrapper = mountPanel({ formState })
      await wrapper.find('input#speed-bonus').setValue('10')
      expect(formState.speedBonus).toBe(10)
    })

    it('passivePerceptionBonus / passiveInsightBonus 輸入更新對應欄位', async () => {
      const formState = baseFormState()
      const wrapper = mountPanel({ formState })
      await wrapper.find('input#passive-perception-bonus').setValue('3')
      await wrapper.find('input#passive-insight-bonus').setValue('-2')
      expect(formState.passivePerceptionBonus).toBe(3)
      expect(formState.passiveInsightBonus).toBe(-2)
    })

    it('initiativeBonus 輸入更新 formState', async () => {
      const formState = baseFormState({ initiativeBonus: 0 })
      const wrapper = mountPanel({ formState })
      await wrapper.find('input#initiative-bonus').setValue('1')
      expect(formState.initiativeBonus).toBe(1)
    })

    it('空字串時數字欄位 fallback 為 0', async () => {
      const formState = baseFormState({ customHpBonus: 5 })
      const wrapper = mountPanel({ formState })
      await wrapper.find('input#custom-hp-bonus').setValue('')
      expect(formState.customHpBonus).toBe(0)
    })
  })
})
