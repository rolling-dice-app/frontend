/**
 * 暫時性 debug middleware：每次 request 進 SSR runtime 時注入 timestamp，
 * 用來驗證 Vercel rewrite caching 是否被繞過。確認 cache 行為後即可移除。
 */
export default defineEventHandler((event) => {
  setHeader(event, 'x-rd-ssr-at', new Date().toISOString())
})
