import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SavingThrowPanel from '~/components/business/character/form/combat/SavingThrowPanel.vue'
import { formatModifier, getAbilityModifier } from '~/helpers/ability'
import { getSavingThrowBonus } from '~/helpers/character'
import type { ProfessionEntry } from '@rolling-dice-app/types'
import type { CharacterUpdateFormState, TotalAbilityScores } from '~/types/business/character-form'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('getAbilityModifier', getAbilityModifier)
  vi.stubGlobal('getSavingThrowBonus', getSavingThrowBonus)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ABILITY_SCORES: TotalAbilityScores = {
  strength: 16, // mod +3
  dexterity: 14, // mod +2
  constitution: 12, // mod +1
  intelligence: 10,
  wisdom: 10,
  charisma: 8, // mod -1
}

const CheckboxStub = {
  name: 'Checkbox',
  props: ['modelValue', 'disabled', 'size', 'color'],
  emits: ['update:modelValue'],
  template: `
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :aria-label="$attrs['aria-label']"
      @change="$emit('update:modelValue', $event.target.checked)"
    />`,
  inheritAttrs: false,
}

const baseFormState = (
  overrides: Partial<CharacterUpdateFormState> = {},
): CharacterUpdateFormState =>
  ({
    savingThrowExtras: [],
    ...overrides,
  }) as unknown as CharacterUpdateFormState

const mountPanel = (
  params: {
    formState?: CharacterUpdateFormState
    professions?: ProfessionEntry[]
    proficiencyBonus?: number
  } = {},
) => {
  const formState = params.formState ?? baseFormState()
  return mount(SavingThrowPanel, {
    props: {
      formState,
      'onUpdate:formState': (next: CharacterUpdateFormState) => Object.assign(formState, next),
      professions: params.professions ?? [],
      abilityScores: ABILITY_SCORES,
      proficiencyBonus: params.proficiencyBonus ?? 2,
    },
    global: {
      stubs: { Checkbox: CheckboxStub },
      mocks: { formatModifier, getAbilityModifier, getSavingThrowBonus },
    },
  })
}

const checkboxFor = (wrapper: ReturnType<typeof mountPanel>, name: string) =>
  wrapper.findAll('input[type="checkbox"]').find((c) => {
    const label = c.attributes('aria-label') ?? ''
    return label.startsWith(`${name} 豁免熟練`)
  })!

describe('SavingThrowPanel (form)', () => {
  describe('渲染', () => {
    it('渲染 6 個屬性 row', () => {
      const wrapper = mountPanel()
      expect(wrapper.findAll('ul > li')).toHaveLength(6)
    })

    it('每個屬性顯示名稱', () => {
      const wrapper = mountPanel()
      const text = wrapper.text()
      expect(text).toContain('力量')
      expect(text).toContain('魅力')
    })
  })

  describe('主職業 baseline 鎖定', () => {
    it('fighter 鎖定 strength / constitution，checkbox disabled', () => {
      const wrapper = mountPanel({
        professions: [{ profession: 'fighter', level: 1, subprofession: null }],
      })
      expect(checkboxFor(wrapper, '力量').attributes('disabled')).toBeDefined()
      expect(checkboxFor(wrapper, '體質').attributes('disabled')).toBeDefined()
      expect(checkboxFor(wrapper, '敏捷').attributes('disabled')).toBeUndefined()
    })

    it('鎖定的 row aria-label 包含「主職業，不可變更」', () => {
      const wrapper = mountPanel({
        professions: [{ profession: 'fighter', level: 1, subprofession: null }],
      })
      expect(checkboxFor(wrapper, '力量').attributes('aria-label')).toContain('主職業，不可變更')
    })

    it('鎖定屬性 checkbox 顯示已勾（proficient）', () => {
      const wrapper = mountPanel({
        professions: [{ profession: 'fighter', level: 1, subprofession: null }],
      })
      expect((checkboxFor(wrapper, '力量').element as HTMLInputElement).checked).toBe(true)
    })
  })

  describe('extra 熟練勾選', () => {
    it('savingThrowExtras 中的屬性 checkbox 勾選', () => {
      const wrapper = mountPanel({
        formState: baseFormState({ savingThrowExtras: ['wisdom'] }),
      })
      expect((checkboxFor(wrapper, '感知').element as HTMLInputElement).checked).toBe(true)
      expect((checkboxFor(wrapper, '力量').element as HTMLInputElement).checked).toBe(false)
    })

    it('勾選未鎖定屬性會寫入 savingThrowExtras', async () => {
      const formState = baseFormState({ savingThrowExtras: [] })
      const wrapper = mountPanel({ formState })
      const cb = checkboxFor(wrapper, '感知')
      await cb.setValue(true)
      expect(formState.savingThrowExtras).toEqual(['wisdom'])
    })

    it('取消勾選會從 savingThrowExtras 移除', async () => {
      const formState = baseFormState({ savingThrowExtras: ['wisdom', 'charisma'] })
      const wrapper = mountPanel({ formState })
      const cb = checkboxFor(wrapper, '感知')
      await cb.setValue(false)
      expect(formState.savingThrowExtras).toEqual(['charisma'])
    })

    it('鎖定屬性即使被觸發也不寫入 extras', async () => {
      const formState = baseFormState({ savingThrowExtras: [] })
      const wrapper = mountPanel({
        formState,
        professions: [{ profession: 'fighter', level: 1, subprofession: null }],
      })
      // 鎖定的 checkbox 是 disabled，但測試 onToggle guard：強制 setValue 不應寫入
      const cb = checkboxFor(wrapper, '力量')
      await cb.setValue(false)
      expect(formState.savingThrowExtras).toEqual([])
    })
  })

  describe('bonus 顯示', () => {
    it('熟練屬性 bonus = mod + prof', () => {
      // 力量熟練（fighter）：mod +3 + prof 2 = +5
      const wrapper = mountPanel({
        professions: [{ profession: 'fighter', level: 1, subprofession: null }],
        proficiencyBonus: 2,
      })
      const strengthRow = wrapper.findAll('ul > li')[0]!
      expect(strengthRow.text()).toContain('+5')
    })

    it('未熟練屬性 bonus = mod', () => {
      // 敏捷未熟練：mod +2 = +2
      const wrapper = mountPanel({ proficiencyBonus: 2 })
      const dexRow = wrapper.findAll('ul > li')[1]!
      expect(dexRow.text()).toContain('+2')
    })

    it('bonus < 0 顯示 text-danger', () => {
      // 魅力 mod -1，未熟練 → -1
      const wrapper = mountPanel({ proficiencyBonus: 2 })
      const charismaRow = wrapper.findAll('ul > li')[5]!
      expect(charismaRow.find('span.text-danger').exists()).toBe(true)
    })
  })
})
