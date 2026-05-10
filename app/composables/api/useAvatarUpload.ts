/** POST /uploads/avatar 的回傳形狀 */
interface AvatarUploadResponse {
  url: string
}

export const useAvatarUpload = () => {
  const apiFetch = useApiFetch()

  /** 上傳已裁剪的 WebP blob，回傳 R2 public URL */
  const upload = async (webpBlob: Blob): Promise<string> => {
    const fd = new FormData()
    fd.append('file', webpBlob, 'avatar.webp')
    const { url } = await apiFetch<AvatarUploadResponse>('/uploads/avatar', {
      method: 'POST',
      body: fd,
    })
    return url
  }

  return { upload }
}
