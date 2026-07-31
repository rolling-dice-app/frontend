import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ABILITY_KEYS } from '@rolling-dice-app/core'
import AppInput from '~/components/common/AppInput.vue'
import AbilitiesPanel from '~/components/business/monster-form/AbilitiesPanel.vue'
import { formatModifier, getAbilityModifier } from '~/helpers/ability'
import { getModifierColorClass } from '~/utils/color'
import { parseIntegerInput } from '~/utils/parse'
import { createMockMonsterFormState, createMockMonsterTemplate } from '~/tests/fixtures/monster'
import type { MonsterTemplateFormState } from '~/types/business/monster'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('getAbilityModifier', getAbilityModifier)
  vi.stubGlobal('getModifierColorClass', getModifierColorClass)
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// STR 8（-1）、DEX 15（+2）、WIS 7（-2）：推導值不等於 0
const baseState = (overrides: Partial<MonsterTemplateFormState> = {}): MonsterTemplateFormState =>
  createMockMonsterFormState(
    createMockMonsterTemplate({
      abilities: {
        strength: 8,
        dexterity: 15,
        constitution: 10,
        intelligence: 10,
        wisdom: 7,
        charisma: 10,
      },
      savingThrows: { dexterity: 4, strength: 0 },
    }),
    overrides,
  )

const mountPanel = (formState: MonsterTemplateFormState = baseState()) =>
  mount(AbilitiesPanel, {
    props: {
      formState,
      'onUpdate:formState': (next: MonsterTemplateFormState) => Object.assign(formState, next),
    },
    global: {
      components: { CommonAppInput: AppInput },
      mocks: { formatModifier, getAbilityModifier, getModifierColorClass, parseIntegerInput },
    },
  })

const saveInput = (wrapper: ReturnType<typeof mountPanel>, key: string) =>
  wrapper.find<HTMLInputElement>(`#monster-save-${key}`)

describe('monster-form AbilitiesPanel', () => {
  it('渲染六屬性與各自的豁免欄位', () => {
    const wrapper = mountPanel()
    for (const key of ABILITY_KEYS) {
      expect(wrapper.find(`#monster-ability-${key}`).exists()).toBe(true)
      expect(saveInput(wrapper, key).exists()).toBe(true)
    }
  })

  it('有列出的豁免顯示其值；明確填 0 者顯示 0 而非留白', () => {
    const wrapper = mountPanel()
    expect(saveInput(wrapper, 'dexterity').element.value).toBe('4')
    expect(saveInput(wrapper, 'strength').element.value).toBe('0')
  })

  it('未列出的豁免留白，placeholder 顯示該屬性的調整值（不再寫死 ±0）', () => {
    const wrapper = mountPanel()
    expect(saveInput(wrapper, 'wisdom').element.value).toBe('')
    expect(saveInput(wrapper, 'wisdom').attributes('placeholder')).toBe('-2')
    expect(saveInput(wrapper, 'constitution').attributes('placeholder')).toBe('+0')
  })

  it('改屬性分數後，未填豁免的 placeholder 跟著變', async () => {
    const formState = baseState()
    const wrapper = mountPanel(formState)

    await wrapper.find('#monster-ability-wisdom').setValue('20')
    expect(formState.abilities.wisdom).toBe(20)
    expect(saveInput(wrapper, 'wisdom').attributes('placeholder')).toBe('+5')
  })

  it('輸入值寫進 savingThrows；清空則移除 key，輸入 0 保留 key', async () => {
    const formState = baseState()
    const wrapper = mountPanel(formState)

    await saveInput(wrapper, 'wisdom').setValue('3')
    expect(formState.savingThrows.wisdom).toBe(3)

    await saveInput(wrapper, 'wisdom').setValue('0')
    expect(formState.savingThrows.wisdom).toBe(0)

    await saveInput(wrapper, 'dexterity').setValue('')
    expect('dexterity' in formState.savingThrows).toBe(false)
  })
})
