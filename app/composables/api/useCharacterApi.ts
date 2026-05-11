import type {
  CharacterCreateDTO,
  CharacterDTO,
  CharacterSummaryDTO,
  CharacterUpdateDTO,
} from '@rolling-dice-app/core'

export const useCharacterApi = () => {
  const apiFetch = useApiFetch()

  const listCharacters = (): Promise<CharacterSummaryDTO[]> =>
    apiFetch<CharacterSummaryDTO[]>('/characters')

  const getCharacter = (id: string): Promise<CharacterDTO> =>
    apiFetch<CharacterDTO>(`/characters/${id}`)

  const createCharacter = (input: CharacterCreateDTO): Promise<CharacterDTO> =>
    apiFetch<CharacterDTO>('/characters', { method: 'POST', body: input })

  const updateCharacter = async (id: string, input: CharacterUpdateDTO): Promise<void> => {
    await apiFetch(`/characters/${id}`, { method: 'PATCH', body: input })
  }

  const deleteCharacter = async (id: string): Promise<void> => {
    await apiFetch(`/characters/${id}`, { method: 'DELETE' })
  }

  return { listCharacters, getCharacter, createCharacter, updateCharacter, deleteCharacter }
}
