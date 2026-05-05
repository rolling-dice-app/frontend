import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useId } from 'vue'
import AppInput from '~/components/common/AppInput.vue'
import SpellcastingModifiersList from '~/components/business/character/form/spells/SpellcastingModifiersList.vue'
import { formatModifier, getAbilityModifier } from '~/helpers/ability'
import { parseIntegerInput } from '~/utils/parse'
import type { TotalAbilityScores } from '~/types/business/character-form'
import type { AbilityKey } from '@rolling-dice-app/types'

const ABILITY_SCORES: TotalAbilityScores = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 18, // mod +4
  wisdom: 14, // mod +2
  charisma: 16, // mod +3
}

beforeEach(() => {
  vi.stubGlobal('useId', useId)
  vi.stubGlobal('getAbilityModifier', getAbilityModifier)
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const mountList = (
  selected: AbilityKey[],
  customBonuses: Partial<Record<AbilityKey, number>> = {},
  proficiencyBonus = 3,
) =>
  mount(SpellcastingModifiersList, {
    props: {
      selectedAbilities: selected,
      proficiencyBonus,
      abilityScores: ABILITY_SCORES,
      customBonuses,
      'onUpdate:customBonuses': () => {},
    },
    global: {
      components: { CommonAppInput: AppInput },
      mocks: { formatModifier, getAbilityModifier, parseIntegerInput },
    },
  })

describe('SpellcastingModifiersList', () => {
  it('未選任何屬性時顯示提示文字', () => {
    const wrapper = mountList([])
    expect(wrapper.text()).toContain('尚未選擇施法主屬性')
    expect(wrapper.findAll('li')).toHaveLength(0)
  })

  it('每個選定屬性渲染一行，施法調整值 = 熟練 + 屬性調整值', () => {
    const wrapper = mountList(['intelligence', 'charisma'])
    const items = wrapper.findAll('li')
    expect(items).toHaveLength(2)
    // intelligence: prof 3 + mod 4 = +7
    expect(items[0]!.text()).toContain('智力')
    expect(items[0]!.text()).toContain('+7')
    // charisma: prof 3 + mod 3 = +6
    expect(items[1]!.text()).toContain('魅力')
    expect(items[1]!.text()).toContain('+6')
  })

  it('已存在的自定義值應顯示於 input', () => {
    const wrapper = mountList(['intelligence'], { intelligence: 2 })
    const input = wrapper.findComponent({ name: 'Input' })
    expect(input.props('modelValue')).toBe('2')
  })

  it('輸入新值時 emit update:customBonuses 寫入該屬性', async () => {
    const wrapper = mountList(['intelligence'], {})
    const input = wrapper.findComponent({ name: 'Input' })
    await input.vm.$emit('update:modelValue', '3')
    expect(wrapper.emitted('update:customBonuses')?.at(-1)).toEqual([{ intelligence: 3 }])
  })

  it('輸入 0 時 emit 應移除該屬性鍵（不留 0）', async () => {
    const wrapper = mountList(['intelligence', 'charisma'], { intelligence: 2, charisma: 1 })
    const inputs = wrapper.findAllComponents({ name: 'Input' })
    await inputs[0]!.vm.$emit('update:modelValue', '0')
    expect(wrapper.emitted('update:customBonuses')?.at(-1)).toEqual([{ charisma: 1 }])
  })
})
