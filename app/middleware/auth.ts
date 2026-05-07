/**
 * 守住需登入頁面：未登入時跳出 toast 提示並導回首頁，由 Header 的 Log in
 * 入口統一觸發 OAuth flow（單 provider 簡化路徑，不另設 /login picker）。
 * Opt-in via `definePageMeta({ middleware: 'auth' })`。
 */
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  if (to.path === '/') return
  useToast().info('請先登入後再訪問此頁')
  return navigateTo('/', { replace: true })
})
