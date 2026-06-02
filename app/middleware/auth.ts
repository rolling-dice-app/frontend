/**
 * 守住需登入頁面：未登入導回首頁（Header 的 Log in 統一觸發 OAuth）。
 * Opt-in via `definePageMeta({ middleware: 'auth' })`。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // client-only：SSR 期 auth state 必為 null，server redirect 又會污染 edge cache。
  if (import.meta.server) return
  const auth = useAuthStore()
  // 等 boot 的 /auth/me 完成再判登入：auth-init 改 fire-and-forget 後，
  // 若不等待會在 refresh 未回前把已登入者誤導回首頁。
  await auth.ensureReady()
  if (auth.isLoggedIn) return
  if (to.path === '/') return
  // 初次 hydration 走整頁重載避免 node mismatch（toast 隨重載丟失故略過）；
  // SPA 導航無 SSR，軟導航 + toast 即可。
  if (useNuxtApp().isHydrating) return navigateTo('/', { replace: true, external: true })
  useToast().info(t('ui.auth.loginRequired'))
  return navigateTo('/', { replace: true })
})
