import type { SharedCharacterDTO } from '@rolling-dice-app/core'

/** 公開分享端點（免登入）：依 shareId 取 server-filtered 角色投影 */
export const share = () => {
  const apiFetch = useApiFetch()

  return {
    getCharacter: (shareId: string): Promise<SharedCharacterDTO> =>
      apiFetch<SharedCharacterDTO>(`/share/characters/${shareId}`),
  }
}
