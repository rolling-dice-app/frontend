/**
 * 建立呼叫 backend 的 fetch instance：
 * - baseURL 由 runtimeConfig.public.apiBase 注入
 * - credentials: 'include' 帶上 session cookie
 * - 預設 Content-Type: application/json
 * - 401 全局攔截：清空 user state（不 redirect，由 route middleware 處理跳轉）
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
      headers: { 'Content-Type': 'application/json' },
      onResponseError({ response }) {
        if (response.status === 401) {
          useAuthStore().user = null
        }
      },
    })
    return { provide: { apiFetch } }
  },
})
