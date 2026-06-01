import { describe, expect, it } from 'vitest'
import { useSpellSelectOptions } from '~/composables/ui/useSpellSelectOptions'
import { CLASS_KEYS, SPELL_SCHOOLS } from '@rolling-dice-app/core'

describe('useSpellSelectOptions — levelOptions', () => {
  it('第一項為戲法（value=0）', () => {
    const { levelOptions } = useSpellSelectOptions()
    expect(levelOptions.value[0]).toEqual({ value: 0, label: '戲法' })
  })

  it('共 10 項（戲法 + 1~9 環）', () => {
    const { levelOptions } = useSpellSelectOptions()
    expect(levelOptions.value).toHaveLength(10)
  })

  it('1~9 環的 label 為「N 環」格式', () => {
    const { levelOptions } = useSpellSelectOptions()
    expect(levelOptions.value[1]).toEqual({ value: 1, label: '1 環' })
    expect(levelOptions.value[9]).toEqual({ value: 9, label: '9 環' })
  })
})

describe('useSpellSelectOptions — schoolOptions', () => {
  it('八大學派全數出現且依 SPELL_SCHOOLS 順序', () => {
    const { schoolOptions } = useSpellSelectOptions()
    expect(schoolOptions.value.map((o) => o.value)).toEqual([...SPELL_SCHOOLS])
  })

  it('label 對應 i18n spell.school.* 中文', () => {
    const { schoolOptions } = useSpellSelectOptions()
    const evocation = schoolOptions.value.find((o) => o.value === 'evocation')
    expect(evocation?.label).toBe('塑能')
  })
})

describe('useSpellSelectOptions — classOptions', () => {
  it('13 職業全數出現且依 CLASS_KEYS 順序', () => {
    const { classOptions } = useSpellSelectOptions()
    expect(classOptions.value.map((o) => o.value)).toEqual([...CLASS_KEYS])
  })

  it('label 對應 i18n class.label.* 中文', () => {
    const { classOptions } = useSpellSelectOptions()
    const wizard = classOptions.value.find((o) => o.value === 'wizard')
    expect(wizard?.label).toBe('法師')
  })
})

describe('useSpellSelectOptions — sourceOptions', () => {
  it('value 與 label 相同（皆為 sourcebook 縮寫）', () => {
    const { sourceOptions } = useSpellSelectOptions()
    for (const option of sourceOptions.value) {
      expect(option.value).toBe(option.label)
    }
  })

  it('包含 PHB', () => {
    const { sourceOptions } = useSpellSelectOptions()
    expect(sourceOptions.value.some((o) => o.value === 'PHB')).toBe(true)
  })
})
