import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useApiErrorToast } from '~/composables/ui/useApiErrorToast'
import { useToast } from '~/composables/ui/useToast'

// FetchError-like：避免直接 import ofetch（與 stores/auth.spec.ts 同模式）
vi.mock('~/utils/api-fetch', () => ({
  isFetchError: (err: unknown): boolean =>
    err instanceof Error && typeof (err as { statusCode?: unknown }).statusCode === 'number',
  useApiFetch: () => null,
}))

interface FakeFetchError extends Error {
  statusCode: number
  response?: { status: number }
  data?: { code?: string }
  request?: string
}

const makeFetchError = (init: { code?: string; status?: number; url?: string }): FakeFetchError => {
  const err = new Error(`fake fetch error ${init.code ?? init.status ?? ''}`) as FakeFetchError
  err.statusCode = init.status ?? 500
  err.response = { status: init.status ?? 500 }
  if (init.code !== undefined) err.data = { code: init.code }
  if (init.url !== undefined) err.request = init.url
  return err
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  useToast().clear()
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

describe('useApiErrorToast — 統一吐 systemError + log', () => {
  it('FetchError（任意 code）→ systemError toast', () => {
    const { items } = useToast()
    const { handle } = useApiErrorToast()
    handle(makeFetchError({ code: 'STALE_CHARACTER_VERSION', status: 409, url: '/api/foo' }))
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      variant: 'error',
      message: '系統錯誤，請稍後再試',
    })
  })

  it('log payload 應包含 code / status / url / err', () => {
    const { handle } = useApiErrorToast()
    handle(makeFetchError({ code: 'WHATEVER', status: 500, url: '/api/bar' }))
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    const args = consoleErrorSpy.mock.calls[0]!
    expect(args[0]).toContain('[ApiError]')
    expect(args[1]).toBe('[unhandled API error]')
    expect(args[2]).toMatchObject({
      code: 'WHATEVER',
      status: 500,
      url: '/api/bar',
    })
    expect((args[2] as { err: unknown }).err).toBeInstanceOf(Error)
  })

  it('非 FetchError → systemError toast + log（code/status/url 皆 undefined）', () => {
    const { items } = useToast()
    const { handle } = useApiErrorToast()
    handle(new Error('boom'))
    expect(items[0]!.message).toBe('系統錯誤，請稍後再試')
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy.mock.calls[0]![2]).toMatchObject({
      code: undefined,
      status: undefined,
      url: undefined,
    })
  })

  it('FetchError 但無 code → systemError toast + log 仍帶 status', () => {
    const { items } = useToast()
    const { handle } = useApiErrorToast()
    handle(makeFetchError({ status: 502 }))
    expect(items[0]!.message).toBe('系統錯誤，請稍後再試')
    expect(consoleErrorSpy.mock.calls[0]![2]).toMatchObject({
      code: undefined,
      status: 502,
    })
  })

  it('toastMessage 覆寫應只動 toast 文案、log payload 維持一致', () => {
    const { items } = useToast()
    const { handle } = useApiErrorToast()
    handle(makeFetchError({ status: 500, url: '/api/foo' }), {
      toastMessage: '儲存失敗，請稍後再試',
    })
    expect(items[0]!.message).toBe('儲存失敗，請稍後再試')
    expect(consoleErrorSpy.mock.calls[0]![2]).toMatchObject({
      status: 500,
      url: '/api/foo',
    })
  })
})
