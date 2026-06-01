import { FetchError } from 'ofetch'

/** 取得 plugins/api-fetch.ts 提供的 apiFetch instance */
export const useApiFetch = () => useNuxtApp().$apiFetch

/**
 * narrow 未知錯誤為 ofetch FetchError，用於 statusCode / data 取值。
 * instanceof 在跨 bundle / SSR↔CSR 邊界（多份 ofetch 實例）可能失效，故補 FetchError 形狀的 duck-type fallback。
 */
export const isFetchError = (err: unknown): err is FetchError => {
  if (err instanceof FetchError) return true
  if (typeof err !== 'object' || err === null) return false
  return 'statusCode' in err || 'response' in err
}
