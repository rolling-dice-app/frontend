/**
 * 建立呼叫 backend 的 fetch instance：
 * - baseURL 由 runtimeConfig.public.apiBase 注入
 * - credentials: 'include' 帶上 session cookie
 * - 401 全局攔截：清空 user state（不 redirect，由 route middleware 處理跳轉）
 *
 * Content-Type 由 ofetch 依 body 自動決定；不在 default headers 硬塞，
 * 避免無 body 的 POST（如 logout）也帶 application/json 觸發後端對空
 * body 做 JSON parse 而 400。
 *
 * 透過 useNuxtApp().$apiFetch（或 useApiFetch helper）取用。
 */
export default defineNuxtPlugin({
  name: 'api-fetch',
  setup() {
    const config = useRuntimeConfig()
    const apiFetch = $fetch.create({
      baseURL: config.public.apiBase,
      credentials: 'include',
      onResponseError({ response }) {
        if (response.status === 401) {
          useAuthStore().user = null
        }
      },
    })
    return { provide: { apiFetch } }
  },
})
