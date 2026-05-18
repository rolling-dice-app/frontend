import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppInput from '~/components/common/AppInput.vue'
import RaceAbilityBonusPanel from '~/components/business/character-form/basic/RaceAbilityBonusPanel.vue'
import { parseIntegerInput } from '~/utils/parse'
import type { CharacterFormState } from '~/types/business/character-form'

beforeEach(() => {
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const baseFormState = (
  overrides: Partial<CharacterFormState['abilities']> = {},
): CharacterFormState =>
  ({
    abilities: {
      strength: { origin: 10, race: 0, bonusScore: 0 },
      dexterity: { origin: 10, race: 0, bonusScore: 0 },
      constitution: { origin: 10, race: 0, bonusScore: 0 },
      intelligence: { origin: 10, race: 0, bonusScore: 0 },
      wisdom: { origin: 10, race: 0, bonusScore: 0 },
      charisma: { origin: 10, race: 0, bonusScore: 0 },
      ...overrides,
    },
  }) as unknown as CharacterFormState

const mountPanel = (formState: CharacterFormState = baseFormState()) =>
  mount(RaceAbilityBonusPanel, {
    props: {
      formState,
      'onUpdate:formState': (next: CharacterFormState) => Object.assign(formState, next),
    },
    global: { components: { CommonAppInput: AppInput } },
  })

describe('RaceAbilityBonusPanel (form)', () => {
  it('六屬性各自一個 input、值反映 race', () => {
    const wrapper = mountPanel(
      baseFormState({
        strength: { origin: 10, race: 2, bonusScore: 0 },
        intelligence: { origin: 10, race: 1, bonusScore: 0 },
      } as unknown as CharacterFormState['abilities']),
    )
    expect(wrapper.findAll('input[type="number"]')).toHaveLength(6)
    expect((wrapper.find('input#race-bonus-strength').element as HTMLInputElement).value).toBe('2')
    expect((wrapper.find('input#race-bonus-intelligence').element as HTMLInputElement).value).toBe(
      '1',
    )
  })

  it('輸入新值更新 formState.abilities[key].race', async () => {
    const formState = baseFormState()
    const wrapper = mountPanel(formState)
    await wrapper.find('input#race-bonus-strength').setValue('2')
    expect(formState.abilities.strength.race).toBe(2)
  })

  it('小數輸入 trunc 為整數', async () => {
    const formState = baseFormState()
    const wrapper = mountPanel(formState)
    await wrapper.find('input#race-bonus-dexterity').setValue('1.7')
    expect(formState.abilities.dexterity.race).toBe(1)
  })

  it('非數字輸入回退為 0', async () => {
    const formState = baseFormState({
      charisma: { origin: 10, race: 5, bonusScore: 0 },
    } as unknown as CharacterFormState['abilities'])
    const wrapper = mountPanel(formState)
    await wrapper.find('input#race-bonus-charisma').setValue('abc')
    expect(formState.abilities.charisma.race).toBe(0)
  })

  it('負數輸入直接寫入 race', async () => {
    const formState = baseFormState()
    const wrapper = mountPanel(formState)
    await wrapper.find('input#race-bonus-wisdom').setValue('-1')
    expect(formState.abilities.wisdom.race).toBe(-1)
  })
})
