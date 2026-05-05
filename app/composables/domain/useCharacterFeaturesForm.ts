import type { CharacterUpdateFormState, FeatureDraft } from '~/types/business/character-form'

/** 角色特性（CharacterCapabilities.features）的 form mutation 包裝 */
export function useCharacterFeaturesForm(formState: CharacterUpdateFormState) {
  function addFeature(draft: FeatureDraft): void {
    formState.features.push({ id: crypto.randomUUID(), ...draft, usage: { ...draft.usage } })
  }

  function removeFeature(id: string): void {
    const index = formState.features.findIndex((f) => f.id === id)
    if (index !== -1) formState.features.splice(index, 1)
  }

  function updateFeature(id: string, draft: FeatureDraft): void {
    const index = formState.features.findIndex((f) => f.id === id)
    if (index !== -1) {
      formState.features[index] = { id, ...draft, usage: { ...draft.usage } }
    }
  }

  function moveFeature(fromIndex: number, toIndex: number): void {
    const length = formState.features.length
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= length) return
    if (toIndex < 0 || toIndex >= length) return
    const [moved] = formState.features.splice(fromIndex, 1)
    if (!moved) return
    formState.features.splice(toIndex, 0, moved)
  }

  return { addFeature, removeFeature, updateFeature, moveFeature }
}
