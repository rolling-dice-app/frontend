import type {
  BattlefieldCreateBody,
  BattlefieldDTO,
  BattlefieldSessionOption,
  BattlefieldUpdateBody,
} from '@rolling-dice-app/core'

/**
 * /battlefields 的單一 API 入口，與 backend route tree 一對一對應。
 * DELETE 為 hard-delete（無 restore）；PATCH 以 body.updatedAt 作樂觀鎖、units 整列 replace。
 */
export const battlefields = () => {
  const apiFetch = useApiFetch()

  return {
    /** 入口頁團務選項投影（container createdAt desc → session date asc） */
    sessionOptions: (): Promise<BattlefieldSessionOption[]> =>
      apiFetch<BattlefieldSessionOption[]>('/battlefields/session-options'),

    get: (id: string): Promise<BattlefieldDTO> =>
      apiFetch<BattlefieldDTO>(`/battlefields/${encodeURIComponent(id)}`),

    create: (body: BattlefieldCreateBody): Promise<BattlefieldDTO> =>
      apiFetch<BattlefieldDTO>('/battlefields', { method: 'POST', body }),

    update: async (id: string, body: BattlefieldUpdateBody): Promise<void> => {
      await apiFetch(`/battlefields/${encodeURIComponent(id)}`, { method: 'PATCH', body })
    },

    remove: async (id: string): Promise<void> => {
      await apiFetch(`/battlefields/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
  }
}
