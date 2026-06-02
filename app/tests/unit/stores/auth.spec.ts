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

describe('useAuthStore — ensureReady()', () => {
  it('首次呼叫觸發 refresh 並寫回 user', async () => {
    const apiFetch = vi.fn().mockResolvedValue(sampleMe)
    vi.stubGlobal('useApiFetch', () => apiFetch)

    const store = useAuthStore()
    await store.ensureReady()

    expect(apiFetch).toHaveBeenCalledOnce()
    expect(store.user).toEqual(sampleUser)
  })

  it('重入共用同一輪 refresh，只打一次 /auth/me（plugin fire-and-forget 與 middleware await 共用）', async () => {
    const apiFetch = vi.fn().mockResolvedValue(sampleMe)
    vi.stubGlobal('useApiFetch', () => apiFetch)

    const store = useAuthStore()
    await Promise.all([store.ensureReady(), store.ensureReady(), store.ensureReady()])

    expect(apiFetch).toHaveBeenCalledOnce()
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
  it('POST /auth/logout 並透過 clearSessionBoundState 清 auth + 各私有 store', async () => {
    const apiFetch = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('useApiFetch', () => apiFetch)
    const characterReset = vi.fn()
    const inventoryReset = vi.fn()
    const spellsReset = vi.fn()
    vi.stubGlobal('useCharacterStore', () => ({ reset: characterReset }))
    vi.stubGlobal('useCharacterInventoryStore', () => ({ reset: inventoryReset }))
    vi.stubGlobal('useCharacterSpellsStore', () => ({ reset: spellsReset }))

    const store = useAuthStore()
    store.user = sampleUser
    store.limits = sampleLimits
    await store.logout()

    expect(apiFetch).toHaveBeenCalledWith('/auth/logout', { method: 'POST' })
    expect(store.user).toBe(null)
    expect(store.limits).toBe(null)
    // 換帳號污染防線：登出時連同各角色私有 store 一併清空
    expect(characterReset).toHaveBeenCalledOnce()
    expect(inventoryReset).toHaveBeenCalledOnce()
    expect(spellsReset).toHaveBeenCalledOnce()
  })
})

describe('useAuthStore — clearSessionBoundState()', () => {
  it('清 auth 自身 user/limits 並呼叫各私有 store 的 reset', () => {
    vi.stubGlobal('useApiFetch', () => () => Promise.resolve(null))
    const characterReset = vi.fn()
    const inventoryReset = vi.fn()
    const spellsReset = vi.fn()
    vi.stubGlobal('useCharacterStore', () => ({ reset: characterReset }))
    vi.stubGlobal('useCharacterInventoryStore', () => ({ reset: inventoryReset }))
    vi.stubGlobal('useCharacterSpellsStore', () => ({ reset: spellsReset }))

    const store = useAuthStore()
    store.user = sampleUser
    store.limits = sampleLimits

    store.clearSessionBoundState()

    expect(store.user).toBe(null)
    expect(store.limits).toBe(null)
    expect(characterReset).toHaveBeenCalledOnce()
    expect(inventoryReset).toHaveBeenCalledOnce()
    expect(spellsReset).toHaveBeenCalledOnce()
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
  it('委派 updateProfile：帶 merged preference + 當前 updatedAt，回傳寫回 user', async () => {
    const updated: User = {
      ...sampleUser,
      preference: { characterListLayout: 'grid', applyMoneyToCurrency: false },
      updatedAt: '2026-02-01T00:00:00Z',
    }
    const mockUpdateProfile = vi.fn().mockResolvedValue(updated)
    vi.stubGlobal('users', () => ({ updateProfile: mockUpdateProfile }))

    const store = useAuthStore()
    store.user = sampleUser
    await store.updatePreference({ applyMoneyToCurrency: false })

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      preference: { characterListLayout: 'grid', applyMoneyToCurrency: false },
      updatedAt: '2026-01-01T00:00:00Z',
    })
    expect(store.user).toEqual(updated)
  })

  it('失敗時保留原 user 不動，把錯誤往外拋（caller 自行處理 toast / rollback）', async () => {
    const mockUpdateProfile = vi.fn().mockRejectedValue(fetchErrorWith(409))
    vi.stubGlobal('users', () => ({ updateProfile: mockUpdateProfile }))

    const store = useAuthStore()
    store.user = sampleUser
    await expect(store.updatePreference({ applyMoneyToCurrency: false })).rejects.toMatchObject({
      statusCode: 409,
    })
    expect(store.user).toEqual(sampleUser)
  })

  it('user 未登入時直接拋錯，不發請求', async () => {
    const mockUpdateProfile = vi.fn()
    vi.stubGlobal('users', () => ({ updateProfile: mockUpdateProfile }))

    const store = useAuthStore()
    await expect(store.updatePreference({ applyMoneyToCurrency: false })).rejects.toThrow()
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })
})

describe('useAuthStore — updateProfile()', () => {
  it('displayName + preference 同時更新：preference 與當前 merge，帶 updatedAt，回傳寫回 user', async () => {
    const updated: User = {
      ...sampleUser,
      displayName: 'Alice 2',
      preference: { characterListLayout: 'list', applyMoneyToCurrency: true },
      updatedAt: '2026-03-01T00:00:00Z',
    }
    const mockUpdateProfile = vi.fn().mockResolvedValue(updated)
    vi.stubGlobal('users', () => ({ updateProfile: mockUpdateProfile }))

    const store = useAuthStore()
    store.user = sampleUser
    await store.updateProfile({
      displayName: 'Alice 2',
      preference: { characterListLayout: 'list' },
    })

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      displayName: 'Alice 2',
      preference: { characterListLayout: 'list', applyMoneyToCurrency: true },
      updatedAt: '2026-01-01T00:00:00Z',
    })
    expect(store.user).toEqual(updated)
  })

  it('只傳 displayName 時 body 不含 preference key', async () => {
    const mockUpdateProfile = vi.fn().mockResolvedValue({ ...sampleUser, displayName: 'Bob' })
    vi.stubGlobal('users', () => ({ updateProfile: mockUpdateProfile }))

    const store = useAuthStore()
    store.user = sampleUser
    await store.updateProfile({ displayName: 'Bob' })

    const body = mockUpdateProfile.mock.calls[0]![0] as Record<string, unknown>
    expect(body).toEqual({ displayName: 'Bob', updatedAt: '2026-01-01T00:00:00Z' })
    expect('preference' in body).toBe(false)
  })

  it('PATCH 失敗（409）時保留原 user 不動，錯誤往外拋', async () => {
    const mockUpdateProfile = vi.fn().mockRejectedValue(fetchErrorWith(409))
    vi.stubGlobal('users', () => ({ updateProfile: mockUpdateProfile }))

    const store = useAuthStore()
    store.user = sampleUser
    await expect(store.updateProfile({ displayName: 'X' })).rejects.toMatchObject({
      statusCode: 409,
    })
    expect(store.user).toEqual(sampleUser)
  })

  it('user 未登入時直接拋錯，不發 PATCH', async () => {
    const mockUpdateProfile = vi.fn()
    vi.stubGlobal('users', () => ({ updateProfile: mockUpdateProfile }))

    const store = useAuthStore()
    await expect(store.updateProfile({ displayName: 'X' })).rejects.toThrow()
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })
})
