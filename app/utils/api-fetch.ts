import { FetchError } from 'ofetch'

/** 取得 plugins/api-fetch.ts 提供的 apiFetch instance */
export const useApiFetch = () => useNuxtApp().$apiFetch

/** narrow 未知錯誤為 ofetch FetchError，用於 statusCode / data 取值 */
export const isFetchError = (err: unknown): err is FetchError => err instanceof FetchError
