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

/** 從 FetchError 取 backend error envelope 的 code（`{ error: code }`）；非 FetchError 或無 code 回 undefined */
export const apiErrorCodeOf = (err: unknown): string | undefined => {
  if (!isFetchError(err)) return undefined
  const data = err.data as { error?: unknown } | undefined
  return typeof data?.error === 'string' ? data.error : undefined
}
