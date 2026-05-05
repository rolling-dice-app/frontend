import type { CharacterUpdateFormState } from '~/types/business/character-form'

/** 角色法術（CharacterCapabilities.spells）的 form mutation 包裝 */
export function useCharacterSpellsForm(formState: CharacterUpdateFormState) {
  function toggleLearnedSpell(id: string): void {
    const index = formState.spells.findIndex((entry) => entry.id === id)
    if (index === -1) {
      formState.spells.push({ id, isPrepared: false, isFavorite: false })
      return
    }
    formState.spells.splice(index, 1)
  }

  return { toggleLearnedSpell }
}
