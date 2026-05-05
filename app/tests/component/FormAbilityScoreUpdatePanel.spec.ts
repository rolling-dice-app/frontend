import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AbilityScoreUpdatePanel from '~/components/business/character/form/basic/AbilityScoreUpdatePanel.vue'
import { formatModifier, getAbilityModifier, getTotalScore } from '~/helpers/ability'
import type { CharacterUpdateFormState } from '~/types/business/character-form'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('getAbilityModifier', getAbilityModifier)
  vi.stubGlobal('getTotalScore', getTotalScore)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const baseFormState = (
  overrides: Partial<CharacterUpdateFormState['abilities']> = {},
): CharacterUpdateFormState =>
  ({
    abilities: {
      strength: { origin: 14, race: 0, bonusScore: 0 },
      dexterity: { origin: 12, race: 0, bonusScore: 0 },
      constitution: { origin: 13, race: 0, bonusScore: 0 },
      intelligence: { origin: 10, race: 0, bonusScore: 0 },
      wisdom: { origin: 10, race: 0, bonusScore: 0 },
      charisma: { origin: 10, race: 0, bonusScore: 0 },
      ...overrides,
    },
  }) as unknown as CharacterUpdateFormState

const mountPanel = (formState: CharacterUpdateFormState = baseFormState()) =>
  mount(AbilityScoreUpdatePanel, {
    props: {
      formState,
      'onUpdate:formState': (next: CharacterUpdateFormState) => Object.assign(formState, next),
    },
    global: {
      stubs: { Icon: true },
      mocks: { formatModifier, getAbilityModifier, getTotalScore },
    },
  })

const decBtn = (wrapper: ReturnType<typeof mountPanel>, abilityIndex: number) =>
  wrapper.findAll('button').filter((b) => b.attributes('aria-label') === '減少額外加值')[
    abilityIndex
  ]!
const incBtn = (wrapper: ReturnType<typeof mountPanel>, abilityIndex: number) =>
  wrapper.findAll('button').filter((b) => b.attributes('aria-label') === '增加額外加值')[
    abilityIndex
  ]!

describe('AbilityScoreUpdatePanel (form)', () => {
  describe('渲染', () => {
    it('六屬性各一行', () => {
      const wrapper = mountPanel()
      expect(wrapper.findAll('button[aria-label="減少額外加值"]')).toHaveLength(6)
      expect(wrapper.findAll('button[aria-label="增加額外加值"]')).toHaveLength(6)
    })

    it('顯示原始值與種族加值（race 為 0 顯示 +0）', () => {
      const wrapper = mountPanel(
        baseFormState({
          strength: { origin: 14, race: 2, bonusScore: 0 },
        } as CharacterUpdateFormState['abilities']),
      )
      // 力量原始 14、race +2
      const text = wrapper.text()
      expect(text).toContain('14')
      expect(text).toContain('+2')
    })

    it('總值 > 20 仍正確顯示（超出標準上限的場景）', () => {
      const wrapper = mountPanel(
        baseFormState({
          strength: { origin: 18, race: 2, bonusScore: 1 }, // 21
        } as unknown as CharacterUpdateFormState['abilities']),
      )
      expect(wrapper.text()).toContain('21')
    })
  })

  describe('bonus 調整', () => {
    it('+1 按鈕點擊增加 bonusScore', async () => {
      const formState = baseFormState()
      const wrapper = mountPanel(formState)
      await incBtn(wrapper, 0).trigger('click')
      expect(formState.abilities.strength.bonusScore).toBe(1)
    })

    it('-1 按鈕點擊減少 bonusScore', async () => {
      const formState = baseFormState({
        strength: { origin: 14, race: 0, bonusScore: 2 },
      } as CharacterUpdateFormState['abilities'])
      const wrapper = mountPanel(formState)
      await decBtn(wrapper, 0).trigger('click')
      expect(formState.abilities.strength.bonusScore).toBe(1)
    })

    it('bonusScore = 0 時 - 按鈕 disabled、不變動', async () => {
      const formState = baseFormState()
      const wrapper = mountPanel(formState)
      expect(decBtn(wrapper, 0).attributes('disabled')).toBeDefined()
      await decBtn(wrapper, 0).trigger('click')
      expect(formState.abilities.strength.bonusScore).toBe(0)
    })

    it('總值 = ABILITY_HARD_MAX (30) 時 + 按鈕 disabled', () => {
      const wrapper = mountPanel(
        baseFormState({
          strength: { origin: 20, race: 5, bonusScore: 5 }, // 30
        } as CharacterUpdateFormState['abilities']),
      )
      expect(incBtn(wrapper, 0).attributes('disabled')).toBeDefined()
    })

    it('總值即將超過 hard max 時 + 點擊不變動', async () => {
      const formState = baseFormState({
        strength: { origin: 20, race: 5, bonusScore: 5 }, // 30
      } as CharacterUpdateFormState['abilities'])
      const wrapper = mountPanel(formState)
      await incBtn(wrapper, 0).trigger('click')
      expect(formState.abilities.strength.bonusScore).toBe(5)
    })
  })
})
