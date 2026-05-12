import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockApiFetch = vi.fn<(...args: unknown[]) => Promise<unknown>>()

beforeEach(() => {
  mockApiFetch.mockReset()
  vi.stubGlobal('useApiFetch', () => mockApiFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('uploads().avatar', () => {
  it('成功上傳：以 multipart/form-data 帶 file 欄位呼叫 /uploads/avatar，回傳 url', async () => {
    mockApiFetch.mockResolvedValue({ url: 'https://avatars.example.com/u1/a.webp' })
    const { uploads } = await import('~/api/uploads')

    const blob = new Blob(['x'], { type: 'image/webp' })
    const url = await uploads().avatar(blob)

    expect(url).toBe('https://avatars.example.com/u1/a.webp')
    expect(mockApiFetch).toHaveBeenCalledOnce()
    const [path, options] = mockApiFetch.mock.calls[0]!
    expect(path).toBe('/uploads/avatar')
    const opt = options as { method: string; body: FormData }
    expect(opt.method).toBe('POST')
    expect(opt.body).toBeInstanceOf(FormData)
    const file = opt.body.get('file')
    expect(file).toBeInstanceOf(Blob)
    expect((file as File).name ?? 'avatar.webp').toBe('avatar.webp')
  })

  it('apiFetch reject 時，error 透傳給呼叫端', async () => {
    const err = new Error('network down')
    mockApiFetch.mockRejectedValue(err)
    const { uploads } = await import('~/api/uploads')

    const blob = new Blob(['x'], { type: 'image/webp' })
    await expect(uploads().avatar(blob)).rejects.toBe(err)
  })
})
