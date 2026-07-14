import type {
  DmSessionContainerCreateBody,
  DmSessionContainerDTO,
  DmSessionContainerSummaryDTO,
  DmSessionContainerUpdateBody,
  DmSessionLogCreateBody,
  DmSessionLogDTO,
  DmSessionLogUpdateBody,
} from '@rolling-dice-app/core'

/**
 * /dm-session-containers 的單一 API 入口，與 backend route tree 一對一對應（含 session-logs 子資源）。
 * DELETE 為 hard-delete（容器刪除 cascade 帶走 logs）；PATCH 以 body.updatedAt 作樂觀鎖。
 */
export const dmSessionContainers = () => {
  const apiFetch = useApiFetch()

  return {
    list: (): Promise<DmSessionContainerSummaryDTO[]> =>
      apiFetch<DmSessionContainerSummaryDTO[]>('/dm-session-containers'),

    get: (id: string): Promise<DmSessionContainerDTO> =>
      apiFetch<DmSessionContainerDTO>(`/dm-session-containers/${encodeURIComponent(id)}`),

    create: (body: DmSessionContainerCreateBody): Promise<DmSessionContainerDTO> =>
      apiFetch<DmSessionContainerDTO>('/dm-session-containers', { method: 'POST', body }),

    update: async (id: string, body: DmSessionContainerUpdateBody): Promise<void> => {
      await apiFetch(`/dm-session-containers/${encodeURIComponent(id)}`, { method: 'PATCH', body })
    },

    remove: async (id: string): Promise<void> => {
      await apiFetch(`/dm-session-containers/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },

    createLog: (containerId: string, body: DmSessionLogCreateBody): Promise<DmSessionLogDTO> =>
      apiFetch<DmSessionLogDTO>(
        `/dm-session-containers/${encodeURIComponent(containerId)}/session-logs`,
        { method: 'POST', body },
      ),

    getLog: (containerId: string, logId: string): Promise<DmSessionLogDTO> =>
      apiFetch<DmSessionLogDTO>(
        `/dm-session-containers/${encodeURIComponent(containerId)}/session-logs/${encodeURIComponent(logId)}`,
      ),

    updateLog: async (
      containerId: string,
      logId: string,
      body: DmSessionLogUpdateBody,
    ): Promise<void> => {
      await apiFetch(
        `/dm-session-containers/${encodeURIComponent(containerId)}/session-logs/${encodeURIComponent(logId)}`,
        { method: 'PATCH', body },
      )
    },

    removeLog: async (containerId: string, logId: string): Promise<void> => {
      await apiFetch(
        `/dm-session-containers/${encodeURIComponent(containerId)}/session-logs/${encodeURIComponent(logId)}`,
        { method: 'DELETE' },
      )
    },
  }
}
