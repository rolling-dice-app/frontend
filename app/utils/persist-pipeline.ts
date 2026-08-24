import { createKeyedDirtyGuard } from '~/utils/dirty-guard'
import { debounce, type DebouncedFn } from '~/utils/timing'

/**
 * 失敗後的處置，由 consumer 的錯誤分類器回傳：
 *
 * - `retry`：走自動重試額度；額度已用完則轉為曝露錯誤
 * - `stop`：靜默停止，不重試也不曝露（consumer 已自行處理，如 404 清 cache）
 * - `expose`：立即曝露錯誤且不重試（如 409 已由 consumer 以 server 覆蓋本地）
 */
export type PersistFailureVerdict = 'retry' | 'stop' | 'expose'

export interface RefetchContext {
  /**
   * true 表示送出期間本地又被改過：只能接 server 的並行控制 token，
   * 不可用 server 資料覆蓋本地（那些新改動還沒送出去）。
   */
  tokenOnly: boolean
}

export interface PersistPipelineOptions<TKey> {
  /** 送出本地變更（PATCH）。失敗代表資料沒存到，可原地重試。 */
  send: (key: TKey) => Promise<void>
  /**
   * 重新抓取並套用結果（換並行控制 token）。在 `send` 成功後呼叫；
   * 亦用於「上一輪換 token 失敗」的補救，此時 `tokenOnly` 為 true。
   */
  refetch: (key: TKey, context: RefetchContext) => Promise<void>
  /** `send` 失敗的分類；預設一律 `retry`。 */
  classifySendError?: (
    key: TKey,
    error: unknown,
  ) => PersistFailureVerdict | Promise<PersistFailureVerdict>
  /** `refetch` 失敗的分類；預設一律 `retry`。 */
  classifyRefetchError?: (
    key: TKey,
    error: unknown,
  ) => PersistFailureVerdict | Promise<PersistFailureVerdict>
  /** 判定為曝露時呼叫；錯誤狀態由 consumer 自行保存。 */
  onError: (key: TKey, error: unknown) => void
  /** 一輪完整成功（送出＋換 token）時呼叫，供 consumer 清除錯誤狀態。 */
  onSuccess: (key: TKey) => void
  debounceMs: number
  retryMs: number
}

export interface PersistPipeline<TKey> {
  /** 所有變更的統一出口：標記本地已變動並排入 debounce 送出 */
  schedule: (key: TKey) => void
  /** 立即跑一輪（不等 debounce）；用於手動重試 */
  run: (key: TKey) => Promise<void>
  /** 把 pending debounce／待重試立刻送出，並等所有飛行中的請求結束 */
  flush: (key: TKey) => Promise<void>
  /** 丟棄尚未送出的變更；不等待飛行中的請求 */
  cancel: (key: TKey) => void
  /** 對所有 key 做 cancel；登出／清空全部狀態時用 */
  cancelAll: () => void
  /** 丟棄尚未送出的變更，但等待飛行中的請求結束（其 commit 會推進 server token） */
  cancelAndSettle: (key: TKey) => Promise<void>
  isInFlight: (key: TKey) => boolean
}

interface PipelineState {
  debounced: DebouncedFn<[]>
  /** 當前飛行中的送出＋換 token；同步指派以確保 flush 路徑能立刻 await */
  inFlight: Promise<void> | null
  /** 此輪失敗是否已用掉自動重試額度；成功後重置 */
  retryScheduled: boolean
  retryTimer: ReturnType<typeof setTimeout> | null
  /**
   * 送出成功但換 token 失敗：本地 token 已作廢，帶著它重送會撞並行控制衝突，
   * 故下一輪必須先補換 token 才能繼續送。
   */
  tokenStale: boolean
}

/**
 * 「debounce 送出 → 重新抓取換 token」的持久化編排。高頻變更合併成一次送出，
 * 飛行中再觸發則排成 trailing 一輪；失敗依 consumer 的分類決定重試或曝露。
 *
 * 送出與重抓的失敗語意不同，故分兩段處理：送出失敗＝資料沒存到，可原地重試；
 * 重抓失敗＝資料已存、只是新 token 拿不到，重送只會帶著作廢 token 撞衝突。
 *
 * per-key：同一 key 不並行，不同 key 互不干擾。單一資源的 consumer 傳固定 key 即可。
 */
export function createPersistPipeline<TKey>(
  options: PersistPipelineOptions<TKey>,
): PersistPipeline<TKey> {
  const states = new Map<TKey, PipelineState>()
  const dirty = createKeyedDirtyGuard<TKey>()

  const stateOf = (key: TKey): PipelineState => {
    let state = states.get(key)
    if (!state) {
      state = {
        debounced: debounce(() => {
          void run(key)
        }, options.debounceMs),
        inFlight: null,
        retryScheduled: false,
        retryTimer: null,
        tokenStale: false,
      }
      states.set(key, state)
    }
    return state
  }

  const clearRetry = (state: PipelineState): void => {
    if (state.retryTimer) {
      clearTimeout(state.retryTimer)
      state.retryTimer = null
    }
    state.retryScheduled = false
  }

  /** 一輪只排一次自動重試；額度已用掉回 false，由呼叫端決定曝露錯誤。 */
  const scheduleRetry = (key: TKey, state: PipelineState): boolean => {
    if (state.retryScheduled || state.retryTimer) return false
    state.retryScheduled = true
    state.retryTimer = setTimeout(() => {
      state.retryTimer = null
      void run(key)
    }, options.retryMs)
    return true
  }

  const applyVerdict = (
    key: TKey,
    state: PipelineState,
    verdict: PersistFailureVerdict,
    error: unknown,
  ): void => {
    if (verdict === 'stop') {
      state.debounced.cancel()
      clearRetry(state)
      return
    }
    if (verdict === 'expose') {
      state.debounced.cancel()
      clearRetry(state)
      options.onError(key, error)
      return
    }
    if (!scheduleRetry(key, state)) options.onError(key, error)
  }

  /** 只補換 token、不動資料；成功回 true。失敗代表仍不可送出。 */
  const recoverToken = async (key: TKey, state: PipelineState): Promise<boolean> => {
    try {
      await options.refetch(key, { tokenOnly: true })
      state.tokenStale = false
      return true
    } catch (error) {
      const verdict = (await options.classifyRefetchError?.(key, error)) ?? 'retry'
      applyVerdict(key, state, verdict, error)
      return false
    }
  }

  const runOnce = async (key: TKey, state: PipelineState): Promise<void> => {
    // 上一輪換 token 失敗過：先補換才能安全重送
    if (state.tokenStale && !(await recoverToken(key, state))) return

    const snapshot = dirty.snapshot()
    try {
      await options.send(key)
    } catch (error) {
      const verdict = (await options.classifySendError?.(key, error)) ?? 'retry'
      // 送出失敗代表資料沒進去，本地 token 仍有效
      state.tokenStale = false
      applyVerdict(key, state, verdict, error)
      return
    }

    // 到這裡資料已存進 server：後續失敗只影響「換到新 token」，不可再重送。
    try {
      await options.refetch(key, { tokenOnly: dirty.changedSince(key, snapshot) })
      state.retryScheduled = false
      state.tokenStale = false
      options.onSuccess(key)
    } catch (error) {
      state.tokenStale = true
      const verdict = (await options.classifyRefetchError?.(key, error)) ?? 'retry'
      applyVerdict(key, state, verdict, error)
    }
  }

  const run = async (key: TKey): Promise<void> => {
    const state = stateOf(key)
    if (state.inFlight) {
      // 飛行中再觸發：排成 trailing 一輪，帶最新狀態送出
      state.debounced()
      return
    }
    if (state.retryTimer) {
      clearTimeout(state.retryTimer)
      state.retryTimer = null
    }
    state.inFlight = runOnce(key, state)
    try {
      await state.inFlight
    } finally {
      state.inFlight = null
    }
  }

  const settle = async (state: PipelineState): Promise<void> => {
    if (!state.inFlight) return
    try {
      await state.inFlight
    } catch {
      // 失敗已於 runOnce 內分類處理（排重試／曝露），不再向外拋
    }
  }

  return {
    schedule: (key) => {
      dirty.bump(key)
      stateOf(key).debounced()
    },

    run,

    flush: async (key) => {
      const state = states.get(key)
      if (!state) return
      while (true) {
        state.debounced.flush()
        if (state.inFlight) {
          await settle(state)
          continue
        }
        if (state.retryTimer) {
          clearTimeout(state.retryTimer)
          state.retryTimer = null
          void run(key)
          continue
        }
        return
      }
    },

    cancel: (key) => {
      const state = states.get(key)
      if (!state) return
      state.debounced.cancel()
      clearRetry(state)
      states.delete(key)
    },

    cancelAll: () => {
      for (const state of states.values()) {
        state.debounced.cancel()
        clearRetry(state)
      }
      states.clear()
    },

    cancelAndSettle: async (key) => {
      const state = states.get(key)
      if (!state) return
      state.debounced.cancel()
      clearRetry(state)
      await settle(state)
      state.tokenStale = false
    },

    isInFlight: (key) => states.get(key)?.inFlight != null,
  }
}
