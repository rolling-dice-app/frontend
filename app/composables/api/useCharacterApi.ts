import type { Character, CharacterCreateInput, CharacterSummary } from '@rolling-dice-app/core'

export const useCharacterApi = () => {
  const apiFetch = useApiFetch()

  const listCharacters = (): Promise<CharacterSummary[]> =>
    apiFetch<CharacterSummary[]>('/characters')

  const getCharacter = (id: string): Promise<Character> => apiFetch<Character>(`/characters/${id}`)

  const createCharacter = (input: CharacterCreateInput): Promise<Character> =>
    apiFetch<Character>('/characters', { method: 'POST', body: input })

  return { listCharacters, getCharacter, createCharacter }
}
