import type { UserDTO } from '@rolling-dice-app/core'

/**
 * 使用者登入狀態 store。
 *
 * - `refresh()` 同步 backend session：200 回 UserDTO 寫入；401 由 apiFetch 攔截
 *   器先把 user 設 null，store 不重複處理；其他錯誤往外拋
 * - `login(next?)` 觸發 OAuth redirect dance（不能用 fetch，會被 CORS preflight
 *   擋住）
 * - `logout()` 呼 backend 並清空 state
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserDTO | null>(null)
  const isLoggedIn = computed(() => user.value !== null)

  const refresh = async () => {
    try {
      user.value = await useApiFetch()<UserDTO>('/auth/me')
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
  }

  return { user, isLoggedIn, refresh, login, logout }
})
