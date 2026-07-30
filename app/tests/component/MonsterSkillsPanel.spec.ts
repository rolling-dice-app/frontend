import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SKILL_KEYS } from '@rolling-dice-app/core'
import AppInput from '~/components/common/AppInput.vue'
import SkillsPanel from '~/components/business/monster-form/SkillsPanel.vue'
import { formatModifier, getAbilityModifier } from '~/helpers/ability'
import { parseIntegerInput } from '~/utils/parse'
import { createMockMonsterFormState, createMockMonsterTemplate } from '~/tests/fixtures/monster'
import type { MonsterTemplateFormState } from '~/types/business/monster'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('getAbilityModifier', getAbilityModifier)
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// STR 8（-1）、DEX 15（+2）：推導值不等於 0，才驗得出「未填 ≠ +0」
const baseState = (overrides: Partial<MonsterTemplateFormState> = {}): MonsterTemplateFormState =>
  createMockMonsterFormState(
    createMockMonsterTemplate({
      abilities: {
        strength: 8,
        dexterity: 15,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      skills: { stealth: 6, acrobatics: 0 },
    }),
    overrides,
  )

const mountPanel = (formState: MonsterTemplateFormState = baseState()) =>
  mount(SkillsPanel, {
    props: {
      formState,
      'onUpdate:formState': (next: MonsterTemplateFormState) => Object.assign(formState, next),
    },
    global: {
      components: { CommonAppInput: AppInput },
      mocks: { formatModifier, getAbilityModifier, parseIntegerInput },
    },
  })

const skillInput = (wrapper: ReturnType<typeof mountPanel>, key: string) =>
  wrapper.find<HTMLInputElement>(`#monster-skill-${key}`)

describe('monster-form SkillsPanel', () => {
  it('渲染全 18 項技能欄位', () => {
    const wrapper = mountPanel()
    for (const key of SKILL_KEYS) {
      expect(skillInput(wrapper, key).exists()).toBe(true)
    }
  })

  it('有列出的技能顯示其值；明確填 0 者顯示 0 而非留白', () => {
    const wrapper = mountPanel()
    expect(skillInput(wrapper, 'stealth').element.value).toBe('6')
    expect(skillInput(wrapper, 'acrobatics').element.value).toBe('0')
  })

  it('未列出的技能留白，placeholder 顯示所屬屬性的調整值（不再寫死 ±0）', () => {
    const wrapper = mountPanel()
    // athletics → STR 8 → -1
    expect(skillInput(wrapper, 'athletics').element.value).toBe('')
    expect(skillInput(wrapper, 'athletics').attributes('placeholder')).toBe('-1')
    // sleightOfHand → DEX 15 → +2
    expect(skillInput(wrapper, 'sleightOfHand').attributes('placeholder')).toBe('+2')
  })

  it('輸入值寫進 skills；清空則移除 key（維持「只列有的」語意）', async () => {
    const formState = baseState()
    const wrapper = mountPanel(formState)

    await skillInput(wrapper, 'perception').setValue('4')
    expect(formState.skills.perception).toBe(4)

    await skillInput(wrapper, 'stealth').setValue('')
    expect('stealth' in formState.skills).toBe(false)
  })

  it('輸入 0 保留 key（0 是有意義的值，不等同未填）', async () => {
    const formState = baseState()
    const wrapper = mountPanel(formState)

    await skillInput(wrapper, 'perception').setValue('0')
    expect(formState.skills.perception).toBe(0)
  })
})
