import type {
  MeResponseDTO,
  PlanLimits,
  User,
  UserPreference,
  UserProfileUpdateDTO,
} from '@rolling-dice-app/core'

/**
 * 使用者登入狀態 store。
 *
 * - `refresh()` 同步 backend session：200 回 MeResponseDTO 解出 user / limits 寫入；401 由 apiFetch 攔截器經 clearSessionBoundState 清空 session-bound state，store 不重複處理；其他錯誤往外拋
 * - `ensureReady()` memoize 首輪 refresh：plugin fire-and-forget 啟動、auth middleware await 它確保判登入前狀態已就緒
 * - `login(next)` 觸發 OAuth redirect dance（不能用 fetch，會被 CORS preflight擋住）
 * - `logout()` 呼 backend 並 clearSessionBoundState
 * - `clearSession()` 清空 auth 自身 state（user/limits）
 * - `clearSessionBoundState()` 連同 character / inventory / spells 等私有 store 一併清空；401 攔截與 logout 共用，避免換帳號殘留
 * - `updatePreference(patch)` 委派 updateProfile 改偏好（樂觀鎖）；失敗外拋讓 caller 決定 UX
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const limits = ref<PlanLimits | null>(null)
  const isLoggedIn = computed(() => user.value !== null)

  const clearSession = () => {
    user.value = null
    limits.value = null
  }

  // 跨 store 以 useXStore() 於函式內延遲解析，避免在 state 初始化期建立依賴
  const clearSessionBoundState = () => {
    clearSession()
    useCharacterStore().reset()
    useCharacterInventoryStore().reset()
    useCharacterSpellsStore().reset()
  }

  const refresh = async () => {
    try {
      const response = await useApiFetch()<MeResponseDTO>('/auth/me')
      user.value = response.user
      limits.value = response.limits
    } catch (err: unknown) {
      if (isFetchError(err) && err.statusCode === 401) return
      throw err
    }
  }

  // app boot 的 /auth/me 同步：memoize 首輪 refresh，讓 auth-init plugin 可 fire-and-forget
  // 而 auth middleware 仍能 await「狀態已就緒」再判登入，避免 refresh 未完成前誤導回首頁。
  let readyPromise: Promise<void> | null = null
  const ensureReady = (): Promise<void> => {
    readyPromise ??= refresh()
    return readyPromise
  }

  const login = (next?: string) => {
    // OAuth redirect 僅在 client 進行；SSR 期間無 window，直接 no-op。
    if (typeof window === 'undefined') return
    const target = next ?? window.location.pathname + window.location.search
    const apiBase = useRuntimeConfig().public.apiBase
    window.location.href = `${apiBase}/auth/google/start?next=${encodeURIComponent(target)}`
  }

  const logout = async () => {
    await useApiFetch()('/auth/logout', { method: 'POST' })
    clearSessionBoundState()
  }

  /** 僅更新 preference；委派 updateProfile 收斂單一 PATCH 路徑（含樂觀鎖 updatedAt）。 */
  const updatePreference = (patch: Partial<UserPreference>): Promise<void> =>
    updateProfile({ preference: patch })

  /** PATCH /users/me 更新 displayName / preference（樂觀鎖）；回傳新 user 寫回 store；409 外拋。 */
  const updateProfile = async (patch: {
    displayName?: string
    preference?: Partial<UserPreference>
  }): Promise<void> => {
    const current = user.value
    if (!current) throw new Error('updateProfile called without authed user')
    const body: UserProfileUpdateDTO = { updatedAt: current.updatedAt }
    if (patch.displayName !== undefined) body.displayName = patch.displayName
    if (patch.preference !== undefined) {
      body.preference = { ...current.preference, ...patch.preference }
    }
    user.value = await users().updateProfile(body)
  }

  return {
    user,
    limits,
    isLoggedIn,
    clearSession,
    clearSessionBoundState,
    refresh,
    ensureReady,
    login,
    logout,
    updatePreference,
    updateProfile,
  }
})
