import { describe, expect, it } from 'vitest'
import { useProficiencyOptions } from '~/composables/ui/useProficiencyOptions'

describe('useProficiencyOptions', () => {
  it('依 none / proficient / expertise 順序產生 3 項', () => {
    const { options } = useProficiencyOptions()
    expect(options.value.map((o) => o.value)).toEqual(['none', 'proficient', 'expertise'])
  })

  it('label 對應 i18n skill.proficiency.* 中文', () => {
    const { options } = useProficiencyOptions()
    expect(options.value).toEqual([
      { value: 'none', label: '無' },
      { value: 'proficient', label: '熟練' },
      { value: 'expertise', label: '專精' },
    ])
  })
})
