interface AvatarUploadResponse {
  url: string
}

/** /uploads/* — 媒體上傳（目前只有 avatar，未來可擴充其他 blob 類型） */
export const uploads = () => {
  const apiFetch = useApiFetch()

  return {
    /** 上傳已裁剪的 WebP avatar blob，回傳 R2 public URL */
    avatar: async (webpBlob: Blob): Promise<string> => {
      const fd = new FormData()
      fd.append('file', webpBlob, 'avatar.webp')
      const { url } = await apiFetch<AvatarUploadResponse>('/uploads/avatar', {
        method: 'POST',
        body: fd,
      })
      return url
    },
  }
}
