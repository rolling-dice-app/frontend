import type { User, UserProfileUpdateDTO } from '@rolling-dice-app/core'

interface AvatarUploadResponse {
  url: string
}

/**
 * /users/me — 目前使用者的 profile 與 avatar。
 * 與 backend route tree 一對一對應：
 *   - PATCH  /users/me            displayName / preference（樂觀鎖）
 *   - POST   /users/me/avatar     multipart 上傳 + 套用（atomic，無樂觀鎖）
 *   - DELETE /users/me/avatar     清除 avatar
 */
export const users = () => {
  const apiFetch = useApiFetch()

  return {
    updateProfile: (input: UserProfileUpdateDTO): Promise<User> =>
      apiFetch<User>('/users/me', { method: 'PATCH', body: input }),

    /** 上傳已裁剪的 WebP avatar blob，原子套用至本人，回傳 R2 public URL */
    uploadAvatar: (webpBlob: Blob): Promise<AvatarUploadResponse> => {
      const fd = new FormData()
      fd.append('file', webpBlob, 'avatar.webp')
      return apiFetch<AvatarUploadResponse>('/users/me/avatar', { method: 'POST', body: fd })
    },

    deleteAvatar: async (): Promise<void> => {
      await apiFetch('/users/me/avatar', { method: 'DELETE' })
    },
  }
}
