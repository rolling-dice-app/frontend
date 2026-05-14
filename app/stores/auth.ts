import type { MeResponseDTO, PlanLimits, User, UserPreference } from '@rolling-dice-app/core'

/**
 * 使用者登入狀態 store。
 *
 * - `refresh()` 同步 backend session：200 回 MeResponseDTO 解出 user / limits 寫入；401 由 apiFetch 攔截器先把 user 設 null，store 不重複處理；其他錯誤往外拋
 * - `login(next)` 觸發 OAuth redirect dance（不能用 fetch，會被 CORS preflight擋住）
 * - `logout()` 呼 backend 並清空 state
 * - `updatePreference(patch)` PATCH /users/me 改偏好，回傳的新 user 寫回 store（同步新 updatedAt）；失敗外拋讓 caller 決定 UX
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const limits = ref<PlanLimits | null>(null)
  const isLoggedIn = computed(() => user.value !== null)

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

  const login = (next?: string) => {
    const target =
      next ??
      (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/')
    const apiBase = useRuntimeConfig().public.apiBase
    window.location.href = `${apiBase}/auth/google/start?next=${encodeURIComponent(target)}`
  }

  const logout = async () => {
    await useApiFetch()('/auth/logout', { method: 'POST' })
    user.value = null
    limits.value = null
  }

  const updatePreference = async (patch: Partial<UserPreference>): Promise<void> => {
    const current = user.value
    if (!current) throw new Error('updatePreference called without authed user')
    const merged: UserPreference = { ...current.preference, ...patch }
    const updated = await useApiFetch()<User>('/users/me', {
      method: 'PATCH',
      body: { preference: merged, updatedAt: current.updatedAt },
    })
    user.value = updated
  }

  return { user, limits, isLoggedIn, refresh, login, logout, updatePreference }
})
