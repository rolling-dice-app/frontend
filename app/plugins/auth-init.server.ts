/**
 * App boot 時呼一次 /auth/me 同步登入狀態，避免 reload 後 UI 閃過未登入。
 *
 * 失敗（含 backend 不可用）只記 warn，不 block 應用啟動 — user state 維持 null，
 * route middleware 會把訪問 protected 頁的請求導向 /login。
 */
export default defineNuxtPlugin({
  name: 'auth-init',
  dependsOn: ['api-fetch'],
  async setup() {
    try {
      await useAuthStore().refresh()
    } catch (err) {
      console.warn('[auth-init] failed to hydrate user state', err)
    }
  },
})
