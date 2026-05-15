/**
 * 守住需登入頁面：未登入時跳出 toast 提示並導回首頁，由 Header 的 Log in
 * 入口統一觸發 OAuth flow（單 provider 簡化路徑，不另設 /login picker）。
 * Opt-in via `definePageMeta({ middleware: 'auth' })`。
 */
export default defineNuxtRouteMiddleware((to) => {
  // auth-init 是 client-only plugin，SSR 期間 auth state 必為 null；
  // 為避免 server-side redirect 被 edge cache 污染，middleware 也只在 client 跑。
  if (import.meta.server) return
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  if (to.path === '/') return
  useToast().info(t('ui.auth.loginRequired'))
  return navigateTo('/', { replace: true })
})
