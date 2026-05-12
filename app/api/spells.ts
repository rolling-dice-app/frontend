import type { SpellDTO } from '@rolling-dice-app/core'

/** /spells catalog API（與 character.spells sub-resource 無關，純法術圖鑑） */
export const spells = () => {
  const apiFetch = useApiFetch()

  return {
    list: (): Promise<SpellDTO[]> => apiFetch<SpellDTO[]>('/spells'),
  }
}
