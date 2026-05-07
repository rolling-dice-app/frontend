/**
 * 守住需登入頁面：未登入時導去 /login?next=<encoded path>，登入後 /login 頁
 * 會把使用者帶回原處。Opt-in via `definePageMeta({ middleware: 'auth' })`。
 */
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  return navigateTo(`/login?next=${encodeURIComponent(to.fullPath)}`)
})
