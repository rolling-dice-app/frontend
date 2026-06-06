import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SharedCharacterProfileDTO } from '@rolling-dice-app/core'
import ProfileTab from '~/components/business/character-detail/ProfileTab.vue'
import { createMockCharacter } from '~/tests/fixtures/character'
import { t } from '~/i18n'
import { formatModifier, getAbilityModifier, getTotalScore } from '~/helpers/ability'
import { calculateSavingThrowBonuses } from '~/helpers/character'
import { calculateSkillBonuses } from '~/helpers/skill'
import { CLASS_IMAGES } from '~/utils/images'

/**
 * The detail page's ProfileTab is the only detail tab with no e2e slice (tab
 * mechanics belong to @ui, deep per-tab data to the other slices), so its own job
 * — mapping a character DTO onto the displayed profile — is covered here instead.
 *
 * The derived-stats composable (`useCharacterDerivedStatsFromCharacter`) imports
 * its helpers explicitly, so it runs for real; only the helpers ProfileTab calls
 * directly are Nuxt auto-imports absent from the test env, so they're bridged with
 * their real implementations via `stubGlobal` (script scope) + `global.mocks`
 * (template scope). We assert ProfileTab's mapping, not those helpers' maths.
 */
const helperGlobals = {
  getTotalScore,
  getAbilityModifier,
  formatModifier,
  calculateSavingThrowBonuses,
  calculateSkillBonuses,
  CLASS_IMAGES,
}

beforeEach(() => {
  for (const [name, value] of Object.entries(helperGlobals)) vi.stubGlobal(name, value)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const mountTab = (overrides: Parameters<typeof createMockCharacter>[0] = {}) =>
  mount(ProfileTab, {
    props: {
      character: createMockCharacter(overrides) as unknown as SharedCharacterProfileDTO,
    },
    global: { mocks: helperGlobals },
  })

describe('DetailProfileTab', () => {
  it('maps the character identity fields into the view', () => {
    const wrapper = mountTab({ name: '英雄阿剛', background: '貴族', race: 'elf' })
    const text = wrapper.text()
    expect(text).toContain('英雄阿剛')
    expect(text).toContain('貴族')
    expect(text).toContain('elf')
  })

  it('renders a class row for each class in a multiclass build', () => {
    const wrapper = mountTab({
      classes: [
        { classKey: 'fighter', level: 5, subclass: null },
        { classKey: 'wizard', level: 3, subclass: null },
      ],
    })
    const text = wrapper.text()
    expect(text).toContain(t('class.label.fighter'))
    expect(text).toContain(t('class.label.wizard'))
  })

  it('shows the background story when present', () => {
    const wrapper = mountTab({ story: '一段勇者的傳說' })
    expect(wrapper.text()).toContain('一段勇者的傳說')
  })

  it('shows the empty placeholder when the background story is absent', () => {
    const wrapper = mountTab({ story: null })
    expect(wrapper.text()).toContain(t('character.emptyParenthesized'))
  })
})
