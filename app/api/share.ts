import type {
  ResolveSharedCharactersBody,
  ResolveSharedCharactersResponse,
  SharedCharacterDTO,
} from '@rolling-dice-app/core'

/** 公開分享端點（免登入）：依 shareId 取 server-filtered 角色投影 */
export const share = () => {
  const apiFetch = useApiFetch()

  return {
    getCharacter: (shareId: string): Promise<SharedCharacterDTO> =>
      apiFetch<SharedCharacterDTO>(`/share/characters/${shareId}`),

    /** 依 shareId 批次解析 shareable 角色卡公開預覽，回傳順序與輸入一致 */
    resolveSharedCharacters: (shareIds: string[]): Promise<ResolveSharedCharactersResponse> =>
      apiFetch<ResolveSharedCharactersResponse>('/share/characters/resolve', {
        method: 'POST',
        body: { shareIds } satisfies ResolveSharedCharactersBody,
      }),
  }
}
