import type {
  CampaignRecordCreateBody,
  CampaignRecordDTO,
  CampaignRecordUpdateBody,
  CharacterCurrencyDTO,
  CharacterCurrencyUpdateBody,
  CharacterCreateDTO,
  CharacterDTO,
  CharacterSummaryDTO,
  CharacterUpdateDTO,
  CombatStateDTO,
  CombatStateUpdateDTO,
  InventoryItemCreateBody,
  InventoryItemDTO,
  InventoryItemUpdateBody,
  SpellEntryCreateBody,
  SpellEntryDTO,
  SpellEntryUpdateBody,
} from '@rolling-dice-app/core'

/**
 * /characters 及其 sub-resource 的單一 API 入口。
 * 與 backend route tree 一對一對應：
 *   - 主資源    /characters[/:id]
 *   - sub      /characters/:id/spells[/:spellId]
 *   - sub      /characters/:id/inventory[/items[/:itemId]]
 *   - sub      /characters/:id/currency
 *   - sub      /characters/:id/combat-state
 *   - sub      /characters/:id/campaign-records[/:recordId]
 */
export const characters = () => {
  const apiFetch = useApiFetch()

  return {
    list: (): Promise<CharacterSummaryDTO[]> => apiFetch<CharacterSummaryDTO[]>('/characters'),

    get: (id: string): Promise<CharacterDTO> => apiFetch<CharacterDTO>(`/characters/${id}`),

    create: (input: CharacterCreateDTO): Promise<CharacterDTO> =>
      apiFetch<CharacterDTO>('/characters', { method: 'POST', body: input }),

    update: async (id: string, input: CharacterUpdateDTO): Promise<void> => {
      await apiFetch(`/characters/${id}`, { method: 'PATCH', body: input })
    },

    remove: async (id: string): Promise<void> => {
      await apiFetch(`/characters/${id}`, { method: 'DELETE' })
    },

    spells: {
      list: (id: string): Promise<SpellEntryDTO[]> =>
        apiFetch<SpellEntryDTO[]>(`/characters/${id}/spells`),

      learn: (id: string, body: SpellEntryCreateBody): Promise<SpellEntryDTO> =>
        apiFetch<SpellEntryDTO>(`/characters/${id}/spells`, { method: 'POST', body }),

      forget: async (id: string, spellId: string): Promise<void> => {
        await apiFetch(`/characters/${id}/spells/${spellId}`, { method: 'DELETE' })
      },

      patch: async (id: string, spellId: string, body: SpellEntryUpdateBody): Promise<void> => {
        await apiFetch(`/characters/${id}/spells/${spellId}`, { method: 'PATCH', body })
      },
    },

    inventory: {
      list: (id: string): Promise<InventoryItemDTO[]> =>
        apiFetch<InventoryItemDTO[]>(`/characters/${id}/inventory`),

      add: (id: string, body: InventoryItemCreateBody): Promise<InventoryItemDTO> =>
        apiFetch<InventoryItemDTO>(`/characters/${id}/inventory/items`, { method: 'POST', body }),

      patch: async (id: string, itemId: string, body: InventoryItemUpdateBody): Promise<void> => {
        await apiFetch(`/characters/${id}/inventory/items/${itemId}`, { method: 'PATCH', body })
      },

      remove: async (id: string, itemId: string): Promise<void> => {
        await apiFetch(`/characters/${id}/inventory/items/${itemId}`, { method: 'DELETE' })
      },
    },

    currency: {
      get: (id: string): Promise<CharacterCurrencyDTO> =>
        apiFetch<CharacterCurrencyDTO>(`/characters/${id}/currency`),

      patch: async (id: string, body: CharacterCurrencyUpdateBody): Promise<void> => {
        await apiFetch(`/characters/${id}/currency`, { method: 'PATCH', body })
      },
    },

    combatState: {
      get: (id: string): Promise<CombatStateDTO> =>
        apiFetch<CombatStateDTO>(`/characters/${id}/combat-state`),

      patch: async (id: string, body: CombatStateUpdateDTO): Promise<void> => {
        await apiFetch(`/characters/${id}/combat-state`, { method: 'PATCH', body })
      },

      shortRest: async (id: string): Promise<void> => {
        await apiFetch(`/characters/${id}/combat-state/short-rest`, { method: 'POST' })
      },

      longRest: async (id: string): Promise<void> => {
        await apiFetch(`/characters/${id}/combat-state/long-rest`, { method: 'POST' })
      },

      reset: async (id: string): Promise<void> => {
        await apiFetch(`/characters/${id}/combat-state/reset`, { method: 'POST' })
      },
    },

    campaignRecords: {
      list: (id: string): Promise<CampaignRecordDTO[]> =>
        apiFetch<CampaignRecordDTO[]>(`/characters/${id}/campaign-records`),

      create: (id: string, body: CampaignRecordCreateBody): Promise<CampaignRecordDTO> =>
        apiFetch<CampaignRecordDTO>(`/characters/${id}/campaign-records`, {
          method: 'POST',
          body,
        }),

      patch: async (
        id: string,
        recordId: string,
        body: CampaignRecordUpdateBody,
      ): Promise<void> => {
        await apiFetch(`/characters/${id}/campaign-records/${recordId}`, {
          method: 'PATCH',
          body,
        })
      },

      remove: async (id: string, recordId: string): Promise<void> => {
        await apiFetch(`/characters/${id}/campaign-records/${recordId}`, { method: 'DELETE' })
      },
    },
  }
}
