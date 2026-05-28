type Waiter<T> = { resolve: (value: T) => void; reject: (err: unknown) => void }

export interface SingleFlight<T> {
  /** 飛行中再呼叫只會等當前回合結束後再跑一輪新 task；多個 queued caller 共享同一輪 trailing 結果 */
  run: () => Promise<T>
  isInFlight: () => boolean
}

export interface KeyedSingleFlight<TKey, T> {
  /** 同 key 飛行中再呼叫只會等當前結束後再跑一輪；不同 key 完全獨立並行 */
  run: (key: TKey) => Promise<T>
  isInFlight: (key: TKey) => boolean
  /** 等所有 key 上的 in-flight + queued task 全部結束；route-leave 前同步刷出時用 */
  drain: () => Promise<void>
}

/**
 * 同一 task 不並行；飛行中再 run() 會排成 trailing 一輪、coalesce 所有 queued caller。
 * 用於需要「最新結果」但任務本身昂貴（如 list GET）的場景。
 */
export function createSingleFlight<T>(task: () => Promise<T>): SingleFlight<T> {
  let running = false
  let nextWaiters: Waiter<T>[] = []

  const drive = async (): Promise<void> => {
    while (true) {
      const currentWaiters = nextWaiters
      nextWaiters = []
      try {
        const result = await task()
        for (const w of currentWaiters) w.resolve(result)
      } catch (err) {
        for (const w of currentWaiters) w.reject(err)
      }
      if (nextWaiters.length === 0) {
        running = false
        return
      }
    }
  }

  const run = (): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      nextWaiters.push({ resolve, reject })
      if (!running) {
        running = true
        void drive()
      }
    })

  return { run, isInFlight: () => running }
}

/**
 * Per-key 版 single-flight；同 key 不並行、不同 key 互不干擾。
 * 用於 list-shaped 資源、每筆 item 各自 PATCH 的場景。
 */
export function createKeyedSingleFlight<TKey, T>(
  task: (key: TKey) => Promise<T>,
): KeyedSingleFlight<TKey, T> {
  type State = { running: boolean; nextWaiters: Waiter<T>[] }
  const states = new Map<TKey, State>()
  const pending = new Set<Promise<T>>()

  const drive = async (key: TKey, state: State): Promise<void> => {
    while (true) {
      const currentWaiters = state.nextWaiters
      state.nextWaiters = []
      try {
        const result = await task(key)
        for (const w of currentWaiters) w.resolve(result)
      } catch (err) {
        for (const w of currentWaiters) w.reject(err)
      }
      if (state.nextWaiters.length === 0) {
        state.running = false
        states.delete(key)
        return
      }
    }
  }

  const run = (key: TKey): Promise<T> => {
    const promise = new Promise<T>((resolve, reject) => {
      let state = states.get(key)
      if (!state) {
        state = { running: false, nextWaiters: [] }
        states.set(key, state)
      }
      state.nextWaiters.push({ resolve, reject })
      if (!state.running) {
        state.running = true
        void drive(key, state)
      }
    })
    pending.add(promise)
    // 用 .then(cleanup, cleanup) 取代 .finally().catch(...) 避免 finally 產生 unhandled-rejection chain
    const cleanup = (): void => {
      pending.delete(promise)
    }
    promise.then(cleanup, cleanup)
    return promise
  }

  const drain = async (): Promise<void> => {
    while (pending.size > 0) {
      await Promise.allSettled(pending)
    }
  }

  return {
    run,
    isInFlight: (key) => states.get(key)?.running ?? false,
    drain,
  }
}
