import type { SpellDTO } from '@rolling-dice-app/core'

export const useSpellApi = () => {
  const apiFetch = useApiFetch()

  const listSpells = (): Promise<SpellDTO[]> => apiFetch<SpellDTO[]>('/spells')

  return { listSpells }
}
