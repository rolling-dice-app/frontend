/**
 * App boot 時呼一次 /auth/me 同步登入狀態。
 *
 * Universal plugin（server + client 都跑）：
 * - server 階段在 cache MISS 時 hydrate user state 進 SSR payload
 * - client mounted 時再跑一次，修正 Vercel rewrite caching 帶來的 anonymous payload
 *
 * 失敗只記 warn，不 block 應用啟動 — user state 維持 null，
 * route middleware 會把訪問 protected 頁的請求導向 /login。
 */
const logger = createLogger('[auth-init]')

export default defineNuxtPlugin({
  name: 'auth-init',
  dependsOn: ['api-fetch'],
  async setup() {
    try {
      await useAuthStore().refresh()
    } catch (err) {
      logger.warn('failed to hydrate user state', err)
    }
  },
})
