import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppSelect from '~/components/common/AppSelect.vue'
import SkillProficiencyGrid from '~/components/business/character/form/basic/SkillProficiencyGrid.vue'
import { formatModifier, getAbilityModifier } from '~/helpers/ability'
import { getSkillBonus } from '~/helpers/character'
import { applySkillProficiency } from '~/helpers/skill'
import type { CharacterFormStateBase, TotalAbilityScores } from '~/types/business/character-form'
import type { ProficiencyLevel, SkillKey } from '@rolling-dice-app/core'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('getAbilityModifier', getAbilityModifier)
  vi.stubGlobal('getSkillBonus', getSkillBonus)
  vi.stubGlobal('applySkillProficiency', applySkillProficiency)
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

const ABILITY_SCORES: TotalAbilityScores = {
  strength: 16, // mod +3
  dexterity: 14, // mod +2
  constitution: 12,
  intelligence: 10,
  wisdom: 12,
  charisma: 10,
}

const baseFormState = (overrides: Partial<CharacterFormStateBase> = {}): CharacterFormStateBase =>
  ({
    skills: {} as Partial<Record<SkillKey, Exclude<ProficiencyLevel, 'none'>>>,
    isJackOfAllTrades: false,
    ...overrides,
  }) as CharacterFormStateBase

const mountGrid = (
  params: {
    formState?: CharacterFormStateBase
    proficiencyBonus?: number
  } = {},
) => {
  const formState = params.formState ?? baseFormState()
  return mount(SkillProficiencyGrid, {
    props: {
      formState,
      'onUpdate:formState': (next: CharacterFormStateBase) => Object.assign(formState, next),
      abilityScores: ABILITY_SCORES,
      proficiencyBonus: params.proficiencyBonus ?? 2,
    },
    global: {
      stubs: { Toggle: ToggleStub },
      components: { CommonAppSelect: AppSelect },
      mocks: { formatModifier, getAbilityModifier, getSkillBonus, applySkillProficiency },
    },
  })
}

const skillRow = (wrapper: ReturnType<typeof mountGrid>, name: string) =>
  wrapper.findAll('div.flex.flex-wrap.items-center').find((d) => d.text().includes(name))

describe('SkillProficiencyGrid (form)', () => {
  describe('渲染', () => {
    it('渲染 18 個 skill row', () => {
      const wrapper = mountGrid()
      // 內層 row（rounded-md border + skill name）
      expect(wrapper.findAll('div.rounded-md.border.border-border')).toHaveLength(18)
    })

    it('proficient 技能顯示 mod + prof 加值', () => {
      // 運動（力量）proficient：mod +3 + prof 2 = +5
      const wrapper = mountGrid({
        formState: baseFormState({ skills: { athletics: 'proficient' } }),
      })
      const row = skillRow(wrapper, '運動')!
      expect(row.text()).toContain('+5')
    })

    it('expertise 技能顯示 2x prof 加值', () => {
      // 特技（敏捷）expertise：mod +2 + 2*prof 2 = +6
      const wrapper = mountGrid({
        formState: baseFormState({ skills: { acrobatics: 'expertise' } }),
      })
      const row = skillRow(wrapper, '特技')!
      expect(row.text()).toContain('+6')
    })

    it('未熟練技能僅顯示 ability mod', () => {
      const wrapper = mountGrid()
      const row = skillRow(wrapper, '隱匿')!
      expect(row.text()).toContain('+2')
    })
  })

  describe('全能高手', () => {
    it('啟用後未熟練技能加 floor(prof/2)', () => {
      // 隱匿 mod +2 + jack 2 = +4
      const wrapper = mountGrid({
        formState: baseFormState({ isJackOfAllTrades: true }),
        proficiencyBonus: 4,
      })
      const row = skillRow(wrapper, '隱匿')!
      expect(row.text()).toContain('+4')
    })

    it('toggle 切換更新 formState.isJackOfAllTrades', async () => {
      const formState = baseFormState({ isJackOfAllTrades: false })
      const wrapper = mountGrid({ formState })
      await wrapper.find('input[role="switch"]').setValue(true)
      expect(formState.isJackOfAllTrades).toBe(true)
    })
  })

  describe('skill proficiency 編輯', () => {
    it('select 改為 proficient 時更新 formState.skills', async () => {
      const formState = baseFormState({ skills: {} })
      const wrapper = mountGrid({ formState })
      const selects = wrapper.findAllComponents({ name: 'Select' })
      const athleticsSelect = selects[0]! // 第 1 個 skill 是運動
      athleticsSelect.vm.$emit('update:modelValue', 'proficient')
      expect(formState.skills.athletics).toBe('proficient')
    })

    it('select 改為 none 時從 skills 移除 key', async () => {
      const formState = baseFormState({ skills: { athletics: 'proficient' } })
      const wrapper = mountGrid({ formState })
      const selects = wrapper.findAllComponents({ name: 'Select' })
      const athleticsSelect = selects[0]!
      athleticsSelect.vm.$emit('update:modelValue', 'none')
      expect(formState.skills.athletics).toBeUndefined()
    })
  })
})
