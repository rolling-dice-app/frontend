import type {
  MonsterTemplateCreateBody,
  MonsterTemplateDTO,
  MonsterTemplateSummaryDTO,
  MonsterTemplateUpdateBody,
} from '@rolling-dice-app/core'

/**
 * /monster-templates 的單一 API 入口，與 backend route tree 一對一對應。
 * DELETE 為 hard-delete（無 trash / restore）；PATCH 以 body.updatedAt 作樂觀鎖。
 */
export const monsterTemplates = () => {
  const apiFetch = useApiFetch()

  return {
    list: (): Promise<MonsterTemplateSummaryDTO[]> =>
      apiFetch<MonsterTemplateSummaryDTO[]>('/monster-templates'),

    get: (id: string): Promise<MonsterTemplateDTO> =>
      apiFetch<MonsterTemplateDTO>(`/monster-templates/${encodeURIComponent(id)}`),

    create: (body: MonsterTemplateCreateBody): Promise<MonsterTemplateDTO> =>
      apiFetch<MonsterTemplateDTO>('/monster-templates', { method: 'POST', body }),

    update: async (id: string, body: MonsterTemplateUpdateBody): Promise<void> => {
      await apiFetch(`/monster-templates/${encodeURIComponent(id)}`, { method: 'PATCH', body })
    },

    remove: async (id: string): Promise<void> => {
      await apiFetch(`/monster-templates/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
  }
}
