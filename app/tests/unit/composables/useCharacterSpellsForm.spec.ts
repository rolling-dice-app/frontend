import { reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import { createMockUpdateFormState } from '~/tests/fixtures/character'
import { useCharacterSpellsForm } from '~/composables/domain/useCharacterSpellsForm'

const FIREBALL_ID = 'cccccccc-0000-0000-0000-000000000001'

function setup() {
  const formState = reactive(createMockUpdateFormState())
  const spells = useCharacterSpellsForm(formState)
  return { formState, spells }
}

describe('useCharacterSpellsForm', () => {
  it('toggleLearnedSpell 可新增與移除掌握的法術', () => {
    const { formState, spells } = setup()
    spells.toggleLearnedSpell(FIREBALL_ID)
    expect(formState.spells).toEqual([
      { spellId: FIREBALL_ID, isPrepared: false, isFavorite: false },
    ])
    spells.toggleLearnedSpell(FIREBALL_ID)
    expect(formState.spells).toEqual([])
  })

  it('取消掌握法術時，整筆 entry（含 isPrepared / isFavorite）一併移除', () => {
    const { formState, spells } = setup()
    spells.toggleLearnedSpell(FIREBALL_ID)
    const entry = formState.spells[0]!
    entry.isPrepared = true
    entry.isFavorite = true

    spells.toggleLearnedSpell(FIREBALL_ID)
    expect(formState.spells).toEqual([])
  })
})
