import { mount } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppInput from '~/components/common/AppInput.vue'
import AppSelect from '~/components/common/AppSelect.vue'
import ArmorClassPanel from '~/components/business/character-form/combat/ArmorClassPanel.vue'
import { formatModifier, getAbilityModifier } from '~/helpers/ability'
import { getArmorDexModifier, getTotalArmorClass } from '~/helpers/character'
import { createDefaultArmorClass } from '@rolling-dice-app/core'
import { getModifierColorClass } from '~/utils/color'
import { parseIntegerInput } from '~/utils/parse'
import type { CharacterUpdateFormState, TotalAbilityScores } from '~/types/business/character-form'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('getAbilityModifier', getAbilityModifier)
  vi.stubGlobal('getTotalArmorClass', getTotalArmorClass)
  vi.stubGlobal('getArmorDexModifier', getArmorDexModifier)
  vi.stubGlobal('getModifierColorClass', getModifierColorClass)
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ABILITY_SCORES: TotalAbilityScores = {
  strength: 10,
  dexterity: 16, // mod +3
  constitution: 12,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
}

const baseFormState = (
  overrides: Partial<CharacterUpdateFormState['armorClass']> = {},
): CharacterUpdateFormState =>
  ({
    armorClass: { ...createDefaultArmorClass(), ...overrides },
  }) as unknown as CharacterUpdateFormState

const mountPanel = (
  params: {
    formState?: CharacterUpdateFormState
  } = {},
) => {
  const formState = params.formState ?? baseFormState()
  return mount(ArmorClassPanel, {
    props: {
      formState,
      'onUpdate:formState': (next: CharacterUpdateFormState) => Object.assign(formState, next),
      abilityScores: ABILITY_SCORES,
    },
    global: {
      components: { CommonAppInput: AppInput, CommonAppSelect: AppSelect },
      mocks: {
        formatModifier,
        getAbilityModifier,
        getTotalArmorClass,
        getArmorDexModifier,
        getModifierColorClass,
        parseIntegerInput,
      },
    },
  })
}

describe('ArmorClassPanel (form)', () => {
  describe('總 AC 計算', () => {
    it('無甲 + dex +3 → 13', () => {
      const wrapper = mountPanel({
        formState: baseFormState({ type: null, value: null, abilityKey: null, shieldValue: 0 }),
      })
      // outputs: dex modifier output + AC total output
      const acOutput = wrapper.findAll('output').at(-1)!
      expect(acOutput.text()).toBe('13')
    })

    it('輕甲（基礎 11）+ dex +3 + 盾牌 2 → 16', () => {
      const wrapper = mountPanel({
        formState: baseFormState({ type: 'light', value: 11, abilityKey: null, shieldValue: 2 }),
      })
      const acOutput = wrapper.findAll('output').at(-1)!
      expect(acOutput.text()).toBe('16')
    })

    it('重甲（基礎 18）忽略 dex 加值', () => {
      const wrapper = mountPanel({
        formState: baseFormState({ type: 'heavy', value: 18, abilityKey: null, shieldValue: 0 }),
      })
      const acOutput = wrapper.findAll('output').at(-1)!
      expect(acOutput.text()).toBe('18')
    })

    it('中甲（基礎 14）將 dex 加值上限為 +2', () => {
      const wrapper = mountPanel({
        formState: baseFormState({ type: 'medium', value: 14, abilityKey: null, shieldValue: 0 }),
      })
      // 14 + min(3, 2) = 16
      const acOutput = wrapper.findAll('output').at(-1)!
      expect(acOutput.text()).toBe('16')
    })
  })

  describe('調整值（dex modifier output）', () => {
    it('無甲 / 輕甲：顯示完整 dex modifier', () => {
      const wrapper = mountPanel({
        formState: baseFormState({ type: 'light', value: 11 }),
      })
      const dexOutput = wrapper.findAll('output').at(0)!
      expect(dexOutput.text()).toBe('+3')
    })

    it('中甲：顯示 cap 後的 +2', () => {
      const wrapper = mountPanel({
        formState: baseFormState({ type: 'medium', value: 14 }),
      })
      const dexOutput = wrapper.findAll('output').at(0)!
      expect(dexOutput.text()).toBe('+2')
    })

    it('重甲：顯示 +0', () => {
      const wrapper = mountPanel({
        formState: baseFormState({ type: 'heavy', value: 18 }),
      })
      const dexOutput = wrapper.findAll('output').at(0)!
      expect(dexOutput.text()).toBe('+0')
    })
  })

  describe('表單互動', () => {
    it('盾牌輸入會更新 formState.armorClass.shieldValue', async () => {
      const formState = baseFormState({ shieldValue: 0 })
      const wrapper = mountPanel({ formState })
      // 找盾牌 input 是第三個 AppInput（基礎值、生命額外…）— 用 id 找
      const shieldInput = wrapper.find('input#shield-value')
      await shieldInput.setValue('2')
      expect(formState.armorClass.shieldValue).toBe(2)
    })

    it('基礎值輸入空字串時 value 設為 null', async () => {
      const formState = baseFormState({ value: 11 })
      const wrapper = mountPanel({ formState })
      const valueInput = wrapper.find('input#armor-value')
      await valueInput.setValue('')
      expect(formState.armorClass.value).toBe(null)
    })
  })

  describe('無甲防禦（isArmored）', () => {
    it("無甲為 'none'：保留已選無甲屬性，不視為著甲清空", async () => {
      const formState = reactive(baseFormState({ type: 'none', abilityKey: 'dexterity' }))
      mountPanel({ formState })
      await nextTick()
      expect(formState.armorClass.abilityKey).toBe('dexterity')
    })

    it('未選甲（null）同樣不視為著甲清空', async () => {
      const formState = reactive(baseFormState({ type: null, abilityKey: 'dexterity' }))
      mountPanel({ formState })
      await nextTick()
      expect(formState.armorClass.abilityKey).toBe('dexterity')
    })

    it('由無甲切換為實際甲（light）時清空無甲屬性 abilityKey', async () => {
      const formState = reactive(baseFormState({ type: 'none', abilityKey: 'dexterity' }))
      mountPanel({ formState })
      formState.armorClass.type = 'light'
      await nextTick()
      expect(formState.armorClass.abilityKey).toBe(null)
    })
  })
})
