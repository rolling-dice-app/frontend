import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPersistPipeline, type PersistFailureVerdict } from '~/utils/persist-pipeline'

const DEBOUNCE_MS = 300
const RETRY_MS = 2000
const KEY = 'k1'

/** 排乾微任務（pipeline 內含多層 await，數 tick 會把斷言綁在實作深度上） */
const drain = () => vi.advanceTimersByTimeAsync(0)

interface Harness {
  sendCalls: number
  refetchCalls: { key: string; tokenOnly: boolean }[]
  errors: unknown[]
  successes: number
  nextSendError: unknown
  nextRefetchError: unknown
  sendVerdict: PersistFailureVerdict
  refetchVerdict: PersistFailureVerdict
}

const createHarness = () => {
  const h: Harness = {
    sendCalls: 0,
    refetchCalls: [],
    errors: [],
    successes: 0,
    nextSendError: null,
    nextRefetchError: null,
    sendVerdict: 'retry',
    refetchVerdict: 'retry',
  }
  const pipeline = createPersistPipeline<string>({
    debounceMs: DEBOUNCE_MS,
    retryMs: RETRY_MS,
    send: async () => {
      h.sendCalls += 1
      if (h.nextSendError) {
        const err = h.nextSendError
        h.nextSendError = null
        throw err
      }
    },
    refetch: async (key, { tokenOnly }) => {
      h.refetchCalls.push({ key, tokenOnly })
      if (h.nextRefetchError) {
        const err = h.nextRefetchError
        h.nextRefetchError = null
        throw err
      }
    },
    classifySendError: () => h.sendVerdict,
    classifyRefetchError: () => h.refetchVerdict,
    onError: (_key, err) => h.errors.push(err),
    onSuccess: () => {
      h.successes += 1
    },
  })
  return { h, pipeline }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createPersistPipeline — 送出與合併', () => {
  it('debounce：連續 schedule 只送出一次', async () => {
    const { h, pipeline } = createHarness()
    pipeline.schedule(KEY)
    pipeline.schedule(KEY)
    pipeline.schedule(KEY)
    expect(h.sendCalls).toBe(0)

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(h.sendCalls).toBe(1)
    expect(h.successes).toBe(1)
  })

  it('成功一輪後 refetch 帶 tokenOnly=false（可用 server 資料覆蓋本地）', async () => {
    const { h, pipeline } = createHarness()
    pipeline.schedule(KEY)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(h.refetchCalls).toEqual([{ key: KEY, tokenOnly: false }])
  })

  it('送出期間又被改過：refetch 帶 tokenOnly=true', async () => {
    const refetchCalls: boolean[] = []
    let releaseSend: () => void = () => {}
    const gate = new Promise<void>((res) => {
      releaseSend = res
    })
    const pipeline = createPersistPipeline<string>({
      debounceMs: DEBOUNCE_MS,
      retryMs: RETRY_MS,
      send: () => gate,
      refetch: async (_key, { tokenOnly }) => {
        refetchCalls.push(tokenOnly)
      },
      onError: () => {},
      onSuccess: () => {},
    })

    pipeline.schedule(KEY)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    pipeline.schedule(KEY) // 飛行中再次變更
    releaseSend()
    await drain()

    expect(refetchCalls).toEqual([true])
  })

  it('不同 key 互不干擾', async () => {
    const { h, pipeline } = createHarness()
    pipeline.schedule('a')
    pipeline.schedule('b')
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(h.sendCalls).toBe(2)
    expect(h.refetchCalls.map((c) => c.key).sort()).toEqual(['a', 'b'])
  })
})

describe('createPersistPipeline — 失敗分類', () => {
  it('retry：自動重試一次；成功則不曝露錯誤', async () => {
    const { h, pipeline } = createHarness()
    h.nextSendError = new Error('network')
    pipeline.schedule(KEY)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(h.errors).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(RETRY_MS)
    expect(h.sendCalls).toBe(2)
    expect(h.errors).toHaveLength(0)
    expect(h.successes).toBe(1)
  })

  it('retry：額度用完才曝露錯誤', async () => {
    const { h, pipeline } = createHarness()
    h.nextSendError = new Error('first')
    pipeline.schedule(KEY)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

    h.nextSendError = new Error('second')
    await vi.advanceTimersByTimeAsync(RETRY_MS)
    expect(h.errors).toHaveLength(1)
    expect((h.errors[0] as Error).message).toBe('second')
  })

  it('stop：靜默停止，不重試也不曝露', async () => {
    const { h, pipeline } = createHarness()
    h.sendVerdict = 'stop'
    h.nextSendError = new Error('gone')
    pipeline.schedule(KEY)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

    await vi.advanceTimersByTimeAsync(RETRY_MS)
    expect(h.sendCalls).toBe(1)
    expect(h.errors).toHaveLength(0)
  })

  it('expose：立即曝露且不重試', async () => {
    const { h, pipeline } = createHarness()
    h.sendVerdict = 'expose'
    h.nextSendError = new Error('conflict')
    pipeline.schedule(KEY)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(h.errors).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(RETRY_MS)
    expect(h.sendCalls).toBe(1)
  })
})

describe('createPersistPipeline — 換 token 失敗（資料已送達）', () => {
  it('refetch 失敗不會重送 send，而是下一輪先補換 token', async () => {
    const { h, pipeline } = createHarness()
    h.nextRefetchError = new Error('network')
    pipeline.schedule(KEY)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

    expect(h.sendCalls).toBe(1)
    expect(h.refetchCalls).toHaveLength(1)

    // 自動重試：先補換 token（tokenOnly=true），成功後才送出這輪的變更
    await vi.advanceTimersByTimeAsync(RETRY_MS)
    expect(h.refetchCalls[1]).toEqual({ key: KEY, tokenOnly: true })
    expect(h.sendCalls).toBe(2)
    expect(h.errors).toHaveLength(0)
  })

  it('補換 token 一直失敗：不送出 send，額度用完後曝露錯誤', async () => {
    const { h, pipeline } = createHarness()
    h.nextRefetchError = new Error('first')
    pipeline.schedule(KEY)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

    h.nextRefetchError = new Error('second')
    await vi.advanceTimersByTimeAsync(RETRY_MS)

    // send 沒有第二次（token 還沒換到手，重送必撞衝突）
    expect(h.sendCalls).toBe(1)
    expect(h.errors).toHaveLength(1)
  })
})

describe('createPersistPipeline — flush / cancel', () => {
  it('flush 立刻送出 pending 並等飛行結束', async () => {
    const { h, pipeline } = createHarness()
    pipeline.schedule(KEY)
    await pipeline.flush(KEY)
    expect(h.sendCalls).toBe(1)
    expect(h.successes).toBe(1)
  })

  it('flush 會把待重試也逼出去', async () => {
    const { h, pipeline } = createHarness()
    h.nextSendError = new Error('network')
    pipeline.schedule(KEY)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(h.sendCalls).toBe(1)

    await pipeline.flush(KEY)
    expect(h.sendCalls).toBe(2)
  })

  it('cancel 丟棄尚未送出的變更', async () => {
    const { h, pipeline } = createHarness()
    pipeline.schedule(KEY)
    pipeline.cancel(KEY)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(h.sendCalls).toBe(0)
  })

  it('cancelAll 對所有 key 生效', async () => {
    const { h, pipeline } = createHarness()
    pipeline.schedule('a')
    pipeline.schedule('b')
    pipeline.cancelAll()
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(h.sendCalls).toBe(0)
  })

  it('cancelAndSettle 丟棄 pending 但等飛行中的請求結束', async () => {
    const h = { sendCalls: 0, done: false }
    let releaseSend: () => void = () => {}
    const gate = new Promise<void>((res) => {
      releaseSend = res
    })
    const pipeline = createPersistPipeline<string>({
      debounceMs: DEBOUNCE_MS,
      retryMs: RETRY_MS,
      send: async () => {
        h.sendCalls += 1
        await gate
      },
      refetch: async () => {
        h.done = true
      },
      onError: () => {},
      onSuccess: () => {},
    })

    pipeline.schedule(KEY)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(pipeline.isInFlight(KEY)).toBe(true)

    const settling = pipeline.cancelAndSettle(KEY)
    releaseSend()
    await settling
    expect(h.done).toBe(true)
    expect(pipeline.isInFlight(KEY)).toBe(false)
  })
})
