import type { AttackDraft, CharacterUpdateFormState } from '~/types/business/character-form'

/** 角色自訂攻擊（CharacterCapabilities.attacks）的 form mutation 包裝 */
export function useCharacterAttacksForm(formState: CharacterUpdateFormState) {
  function addAttack(entry: AttackDraft): void {
    formState.attacks.push({ id: crypto.randomUUID(), ...entry })
  }

  function removeAttack(id: string): void {
    const index = formState.attacks.findIndex((a) => a.id === id)
    if (index !== -1) formState.attacks.splice(index, 1)
  }

  function updateAttack(id: string, data: AttackDraft): void {
    const index = formState.attacks.findIndex((a) => a.id === id)
    if (index !== -1) formState.attacks[index] = { id, ...data }
  }

  return { addAttack, removeAttack, updateAttack }
}
