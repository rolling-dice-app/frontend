/**
 * Client-only：app boot 時觸發一次 /auth/me 同步登入狀態。
 * SSR 不跑（Vercel 對 static URL 會 cache 整段 HTML，server-side hydrate 反而會污染共用 payload）；
 * auth 狀態以 client 端的 /auth/me 為唯一來源。
 *
 * fire-and-forget：不 await，避免 boot 被 /auth/me 卡住；需要登入狀態的 auth middleware
 * 會自行 await `ensureReady()`（共用同一輪 refresh）。失敗只記 warn，不 block 應用啟動。
 */
const logger = createLogger('[auth-init]')

export default defineNuxtPlugin({
  name: 'auth-init',
  dependsOn: ['api-fetch'],
  setup() {
    useAuthStore()
      .ensureReady()
      .catch((err) => logger.warn('failed to hydrate user state', err))
  },
})
