import type { CharacterUpdateFormState } from '~/types/business/character-form'

/** 角色法術 form buffer 的 mutation 包裝；submit 時與原始 spell list diff 後送 sub-endpoint */
export function useCharacterSpellsForm(formState: CharacterUpdateFormState) {
  const toggleLearnedSpell = (spellId: string): void => {
    const index = formState.spells.findIndex((entry) => entry.spellId === spellId)
    if (index === -1) {
      formState.spells.push({ spellId, isPrepared: false, isFavorite: false })
      return
    }
    formState.spells.splice(index, 1)
  }

  return { toggleLearnedSpell }
}
