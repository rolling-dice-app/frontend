import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useId } from 'vue'
import AppSelect from '~/components/common/AppSelect.vue'
import SpellcastingAbilitySelect from '~/components/business/character/form/spells/SpellcastingAbilitySelect.vue'
import { ABILITY_KEYS, ABILITY_NAMES } from '~/constants/dnd'
import type { AbilityKey } from '@rolling-dice-app/core'

vi.stubGlobal('useId', useId)

const mountSelect = (initial: AbilityKey[] = []) =>
  mount(SpellcastingAbilitySelect, {
    props: { abilities: initial, 'onUpdate:abilities': () => {} },
    global: {
      components: { CommonAppSelect: AppSelect },
    },
  })

describe('SpellcastingAbilitySelect', () => {
  it('應顯示六項屬性供選擇', () => {
    const wrapper = mountSelect()
    const select = wrapper.findComponent({ name: 'Select' })
    const options = select.props('options') as { value: string; label: string }[]
    expect(options).toHaveLength(6)
    expect(options.map((o) => o.value)).toEqual([...ABILITY_KEYS])
    expect(options.map((o) => o.label)).toEqual(ABILITY_KEYS.map((k) => ABILITY_NAMES[k]))
  })

  it('CommonAppSelect 應啟用 multiple', () => {
    const wrapper = mountSelect()
    const select = wrapper.findComponent({ name: 'Select' })
    expect(select.props('multiple')).toBe(true)
  })

  it('應將 v-model:abilities 傳遞至 Select', () => {
    const wrapper = mountSelect(['intelligence', 'charisma'])
    const select = wrapper.findComponent({ name: 'Select' })
    expect(select.props('modelValue')).toEqual(['intelligence', 'charisma'])
  })

  it('Select 觸發 update:modelValue 時應 emit update:abilities', async () => {
    const wrapper = mountSelect(['intelligence'])
    const select = wrapper.findComponent({ name: 'Select' })
    await select.vm.$emit('update:modelValue', ['intelligence', 'wisdom'])
    expect(wrapper.emitted('update:abilities')?.at(-1)).toEqual([['intelligence', 'wisdom']])
  })
})
