import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useApiErrorToast } from '~/composables/ui/useApiErrorToast'
import { useToast } from '~/composables/ui/useToast'

// FetchError-like：用 marker flag 判別（避免 statusCode 強制 number 影響 network 場景）
vi.mock('~/utils/api-fetch', () => ({
  isFetchError: (err: unknown): boolean =>
    err instanceof Error && (err as { _isFakeFetchError?: boolean })._isFakeFetchError === true,
  useApiFetch: () => null,
}))

interface FakeFetchError extends Error {
  _isFakeFetchError: true
  statusCode?: number
  response?: { status?: number }
  data?: { code?: string; details?: unknown }
  request?: string
}

const makeFetchError = (init: {
  code?: string
  status?: number
  url?: string
  details?: unknown
}): FakeFetchError => {
  const err = new Error(`fake fetch error ${init.code ?? init.status ?? ''}`) as FakeFetchError
  err._isFakeFetchError = true
  if (init.status !== undefined) {
    err.statusCode = init.status
    err.response = { status: init.status }
  } else {
    err.response = {}
  }
  if (init.code !== undefined) err.data = { code: init.code, details: init.details }
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
  vi.useRealTimers()
})

describe('useApiErrorToast — mapping + fallback', () => {
  it('STALE_CHARACTER_VERSION → ui.error.staleVersion', () => {
    const { items } = useToast()
    const { handle } = useApiErrorToast()
    handle(makeFetchError({ code: 'STALE_CHARACTER_VERSION', status: 409 }))
    expect(items[0]).toMatchObject({
      variant: 'error',
      message: '資料已被其他來源更新，請重新整理',
    })
  })

  it('其他 STALE_*_VERSION 變體共用同一訊息', () => {
    const { items } = useToast()
    const { handle } = useApiErrorToast()
    for (const code of [
      'STALE_COMBAT_STATE_VERSION',
      'STALE_CAMPAIGN_RECORD_VERSION',
      'STALE_USER_VERSION',
      'STALE_CURRENCY_VERSION',
    ]) {
      handle(makeFetchError({ code, status: 409 }))
    }
    expect(items).toHaveLength(4)
    for (const item of items) {
      expect(item.message).toBe('資料已被其他來源更新，請重新整理')
    }
  })

  it('RATE_LIMITED → ui.error.rateLimited', () => {
    const { items } = useToast()
    const { handle } = useApiErrorToast()
    handle(makeFetchError({ code: 'RATE_LIMITED', status: 429 }))
    expect(items[0]!.message).toBe('操作過於頻繁，請稍後再試')
  })

  it('RESTORE_COOLDOWN_ACTIVE → 內插剩餘分鐘', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-27T00:00:00Z'))
    const { items } = useToast()
    const { handle } = useApiErrorToast()
    handle(
      makeFetchError({
        code: 'RESTORE_COOLDOWN_ACTIVE',
        status: 409,
        details: { cooldownEndsAt: '2026-06-03T00:30:00Z' },
      }),
    )
    // 7 天 30 分鐘 = 10110 分鐘
    expect(items[0]!.message).toBe('角色剛還原不久，10110 分鐘後才能再刪除')
  })

  it('RESTORE_COOLDOWN_ACTIVE 已過期 / 缺 details → fallback 顯示 1 分鐘', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T00:00:00Z'))
    const { items } = useToast()
    const { handle } = useApiErrorToast()
    handle(
      makeFetchError({
        code: 'RESTORE_COOLDOWN_ACTIVE',
        status: 409,
        details: { cooldownEndsAt: '2026-06-03T00:30:00Z' },
      }),
    )
    expect(items[0]!.message).toBe('角色剛還原不久，1 分鐘後才能再刪除')
  })

  it('未 mapped code + 5xx → ui.error.serverError', () => {
    const { items } = useToast()
    const { handle } = useApiErrorToast()
    handle(makeFetchError({ code: 'AVATAR_UPLOAD_FAILED', status: 502 }))
    expect(items[0]!.message).toBe('伺服器暫時無法回應，請稍後再試')
  })

  it('FetchError 但無 status（網路失敗）→ ui.error.network', () => {
    const { items } = useToast()
    const { handle } = useApiErrorToast()
    handle(makeFetchError({}))
    expect(items[0]!.message).toBe('網路連線出問題，請檢查連線')
  })

  it('非 FetchError → ui.message.systemError', () => {
    const { items } = useToast()
    const { handle } = useApiErrorToast()
    handle(new Error('boom'))
    expect(items[0]!.message).toBe('系統錯誤，請稍後再試')
  })

  it('未 mapped 4xx code → ui.message.systemError', () => {
    const { items } = useToast()
    const { handle } = useApiErrorToast()
    handle(makeFetchError({ code: 'TEAMMATE_SHARE_ID_INVALID', status: 422 }))
    expect(items[0]!.message).toBe('系統錯誤，請稍後再試')
  })

  it('options.toastMessage 覆寫 mapping', () => {
    const { items } = useToast()
    const { handle } = useApiErrorToast()
    handle(makeFetchError({ code: 'STALE_CHARACTER_VERSION', status: 409 }), {
      toastMessage: '儲存失敗，請稍後再試',
    })
    expect(items[0]!.message).toBe('儲存失敗，請稍後再試')
  })

  it('log payload 永遠包含 code / status / url / err', () => {
    const { handle } = useApiErrorToast()
    handle(makeFetchError({ code: 'STALE_CHARACTER_VERSION', status: 409, url: '/api/foo' }))
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    const args = consoleErrorSpy.mock.calls[0]!
    expect(args[1]).toBe('[unhandled API error]')
    expect(args[2]).toMatchObject({
      code: 'STALE_CHARACTER_VERSION',
      status: 409,
      url: '/api/foo',
    })
  })
})
