import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MeResponseDTO, PlanLimits, User } from '@rolling-dice-app/core'
import { useAuthStore } from '~/stores/auth'

const sampleUser: User = {
  id: 'u-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: null,
  preference: { characterListLayout: 'grid', applyMoneyToCurrency: true },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const sampleLimits: PlanLimits = {
  maxCharacters: 20,
  maxActiveCharacters: 10,
  maxCampaignRecordsPerCharacter: 100,
}

const sampleMe: MeResponseDTO = { user: sampleUser, limits: sampleLimits }

// FetchError-like：避免在 test 直接 import ofetch（transitive dep，vitest 解不到）
const fetchErrorWith = (status: number) =>
  Object.assign(new Error(`status ${status}`), { statusCode: status })

const stubLocation = (pathname: string, search = '') => {
  const hrefSpy = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      pathname,
      search,
      set href(value: string) {
        hrefSpy(value)
      },
    },
  })
  return hrefSpy
}

beforeEach(() => {
  setActivePinia(createPinia())
  // 測試環境用 duck-typing 判斷 FetchError-like，避免 import ofetch
  vi.stubGlobal(
    'isFetchError',
    (err: unknown) =>
      err instanceof Error && typeof (err as { statusCode?: unknown }).statusCode === 'number',
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAuthStore — 初始狀態', () => {
  it('user 初始為 null、isLoggedIn 為 false', () => {
    vi.stubGlobal('useApiFetch', () => () => Promise.resolve(null))
    const store = useAuthStore()
    expect(store.user).toBe(null)
    expect(store.isLoggedIn).toBe(false)
  })
})

describe('useAuthStore — refresh()', () => {
  it('200 → MeResponseDTO 解出 user / limits 寫入，isLoggedIn 變 true', async () => {
    const apiFetch = vi.fn().mockResolvedValue(sampleMe)
    vi.stubGlobal('useApiFetch', () => apiFetch)

    const store = useAuthStore()
    await store.refresh()

    expect(apiFetch).toHaveBeenCalledWith('/auth/me')
    expect(store.user).toEqual(sampleUser)
    expect(store.limits).toEqual(sampleLimits)
    expect(store.isLoggedIn).toBe(true)
  })

  it('401 → 不外拋（攔截器負責清 state）', async () => {
    const apiFetch = vi.fn().mockRejectedValue(fetchErrorWith(401))
    vi.stubGlobal('useApiFetch', () => apiFetch)

    const store = useAuthStore()
    await expect(store.refresh()).resolves.toBeUndefined()
    expect(store.user).toBe(null)
  })

  it('500 → 外拋', async () => {
    const apiFetch = vi.fn().mockRejectedValue(fetchErrorWith(500))
    vi.stubGlobal('useApiFetch', () => apiFetch)

    const store = useAuthStore()
    await expect(store.refresh()).rejects.toMatchObject({ statusCode: 500 })
  })
})

describe('useAuthStore — login()', () => {
  it('未傳 next 時用 window.location.pathname，URL encode 後接到 OAuth start', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'http://api' } }))
    const hrefSpy = stubLocation('/character')

    const store = useAuthStore()
    store.login()

    expect(hrefSpy).toHaveBeenCalledWith('http://api/auth/google/start?next=%2Fcharacter')
  })

  it('傳入 next 時優先使用該值', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'http://api' } }))
    const hrefSpy = stubLocation('/anywhere')

    const store = useAuthStore()
    store.login('/dashboard?tab=stats')

    expect(hrefSpy).toHaveBeenCalledWith(
      'http://api/auth/google/start?next=%2Fdashboard%3Ftab%3Dstats',
    )
  })
})

describe('useAuthStore — logout()', () => {
  it('POST /auth/logout 並把 user / limits 清為 null', async () => {
    const apiFetch = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('useApiFetch', () => apiFetch)

    const store = useAuthStore()
    store.user = sampleUser
    store.limits = sampleLimits
    await store.logout()

    expect(apiFetch).toHaveBeenCalledWith('/auth/logout', { method: 'POST' })
    expect(store.user).toBe(null)
    expect(store.limits).toBe(null)
  })
})

describe('useAuthStore — clearSession()', () => {
  it('同時把 user 與 limits 清為 null', () => {
    vi.stubGlobal('useApiFetch', () => () => Promise.resolve(null))
    const store = useAuthStore()
    store.user = sampleUser
    store.limits = sampleLimits

    store.clearSession()

    expect(store.user).toBe(null)
    expect(store.limits).toBe(null)
  })
})

describe('useAuthStore — updatePreference()', () => {
  it('PATCH /users/me 帶 merged preference + 當前 updatedAt，回傳寫回 user', async () => {
    const updated: User = {
      ...sampleUser,
      preference: { characterListLayout: 'grid', applyMoneyToCurrency: false },
      updatedAt: '2026-02-01T00:00:00Z',
    }
    const apiFetch = vi.fn().mockResolvedValue(updated)
    vi.stubGlobal('useApiFetch', () => apiFetch)

    const store = useAuthStore()
    store.user = sampleUser
    await store.updatePreference({ applyMoneyToCurrency: false })

    expect(apiFetch).toHaveBeenCalledWith('/users/me', {
      method: 'PATCH',
      body: {
        preference: { characterListLayout: 'grid', applyMoneyToCurrency: false },
        updatedAt: '2026-01-01T00:00:00Z',
      },
    })
    expect(store.user).toEqual(updated)
  })

  it('PATCH 失敗時保留原 user 不動，把錯誤往外拋（caller 自行處理 toast / rollback）', async () => {
    const apiFetch = vi.fn().mockRejectedValue(fetchErrorWith(409))
    vi.stubGlobal('useApiFetch', () => apiFetch)

    const store = useAuthStore()
    store.user = sampleUser
    await expect(store.updatePreference({ applyMoneyToCurrency: false })).rejects.toMatchObject({
      statusCode: 409,
    })
    expect(store.user).toEqual(sampleUser)
  })

  it('user 未登入時直接拋錯，不發 PATCH', async () => {
    const apiFetch = vi.fn()
    vi.stubGlobal('useApiFetch', () => apiFetch)

    const store = useAuthStore()
    await expect(store.updatePreference({ applyMoneyToCurrency: false })).rejects.toThrow()
    expect(apiFetch).not.toHaveBeenCalled()
  })
})
