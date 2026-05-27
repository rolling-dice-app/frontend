import { describe, expect, it, vi } from 'vitest'
import { createSingleFlight, createKeyedSingleFlight } from '~/utils/single-flight'

const makeDeferred = <T>(): {
  promise: Promise<T>
  resolve: (v: T) => void
  reject: (e: unknown) => void
} => {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('createSingleFlight', () => {
  it('飛行中再 run() 會等當前結束後再跑一輪 trailing；queued caller 拿 trailing 結果', async () => {
    const d1 = makeDeferred<string>()
    const d2 = makeDeferred<string>()
    const task = vi.fn(() => (task.mock.calls.length === 1 ? d1.promise : d2.promise))
    const sf = createSingleFlight(task)

    const p1 = sf.run()
    const p2 = sf.run()
    const p3 = sf.run()

    expect(task).toHaveBeenCalledTimes(1)
    expect(sf.isInFlight()).toBe(true)

    d1.resolve('first')
    expect(await p1).toBe('first')
    // p2 / p3 都被當作下一輪的 waiter，等 trailing
    expect(task).toHaveBeenCalledTimes(2)

    d2.resolve('second')
    expect(await p2).toBe('second')
    expect(await p3).toBe('second')
    expect(sf.isInFlight()).toBe(false)
  })

  it('單一 caller 沒有 trailing 時不會多跑一輪', async () => {
    const task = vi.fn(async () => 'only')
    const sf = createSingleFlight(task)
    await sf.run()
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('task throw 時當前回合 waiter 都收到 reject', async () => {
    const d = makeDeferred<string>()
    const task = vi.fn(() => d.promise)
    const sf = createSingleFlight(task)

    const p1 = sf.run()
    d.reject(new Error('boom'))

    await expect(p1).rejects.toThrow('boom')
    expect(sf.isInFlight()).toBe(false)
  })

  it('trailing task 失敗時 queued caller 收到 reject', async () => {
    const d1 = makeDeferred<string>()
    const d2 = makeDeferred<string>()
    const task = vi.fn(() => (task.mock.calls.length === 1 ? d1.promise : d2.promise))
    const sf = createSingleFlight(task)

    const p1 = sf.run()
    const p2 = sf.run()
    d1.resolve('ok')
    await p1
    d2.reject(new Error('trailing boom'))
    await expect(p2).rejects.toThrow('trailing boom')
  })
})

describe('createKeyedSingleFlight', () => {
  it('同 key 飛行中再 run 排成 trailing；不同 key 完全並行', async () => {
    const dA1 = makeDeferred<string>()
    const dA2 = makeDeferred<string>()
    const dB = makeDeferred<string>()
    const calls: Array<{ key: string; n: number }> = []
    const task = vi.fn(async (key: string) => {
      const n = calls.filter((c) => c.key === key).length + 1
      calls.push({ key, n })
      if (key === 'A') return n === 1 ? dA1.promise : dA2.promise
      return dB.promise
    })
    const sf = createKeyedSingleFlight(task)

    const pA1 = sf.run('A')
    const pA2 = sf.run('A')
    const pB = sf.run('B')

    expect(sf.isInFlight('A')).toBe(true)
    expect(sf.isInFlight('B')).toBe(true)
    // 第一輪 A、第一輪 B 各跑一次
    expect(task).toHaveBeenCalledTimes(2)

    dA1.resolve('A1')
    dB.resolve('B1')
    expect(await pA1).toBe('A1')
    expect(await pB).toBe('B1')
    // A 進 trailing
    expect(task).toHaveBeenCalledTimes(3)

    dA2.resolve('A2')
    expect(await pA2).toBe('A2')
    expect(sf.isInFlight('A')).toBe(false)
  })

  it('drain() 會等所有 key 的 in-flight + trailing 都結束', async () => {
    const dA = makeDeferred<string>()
    const dB = makeDeferred<string>()
    const task = vi.fn(async (key: string) => (key === 'A' ? dA.promise : dB.promise))
    const sf = createKeyedSingleFlight(task)

    void sf.run('A')
    void sf.run('B')
    const draining = sf.drain()
    let drained = false
    void draining.then(() => {
      drained = true
    })

    await Promise.resolve()
    expect(drained).toBe(false)

    dA.resolve('a')
    await Promise.resolve()
    await Promise.resolve()
    expect(drained).toBe(false)

    dB.resolve('b')
    await draining
    expect(drained).toBe(true)
  })

  it('某 key task 失敗不影響其他 key', async () => {
    const dA = makeDeferred<string>()
    const dB = makeDeferred<string>()
    const task = vi.fn(async (key: string) => (key === 'A' ? dA.promise : dB.promise))
    const sf = createKeyedSingleFlight(task)

    const pA = sf.run('A')
    const pB = sf.run('B')
    dA.reject(new Error('a boom'))
    dB.resolve('b ok')

    await expect(pA).rejects.toThrow('a boom')
    expect(await pB).toBe('b ok')
  })
})
