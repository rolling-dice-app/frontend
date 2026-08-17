import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debounce, throttle, withTimeout } from '~/utils/timing'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('debounce', () => {
  it('應於最後一次呼叫後等待指定時間才執行', () => {
    const spy = vi.fn()
    const debounced = debounce(spy, 100)

    debounced('a')
    vi.advanceTimersByTime(50)
    debounced('b')
    vi.advanceTimersByTime(50)
    debounced('c')

    expect(spy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('c')
  })

  it('cancel 應清除尚未觸發的呼叫', () => {
    const spy = vi.fn()
    const debounced = debounce(spy, 100)

    debounced('x')
    debounced.cancel()
    vi.advanceTimersByTime(200)

    expect(spy).not.toHaveBeenCalled()
  })

  it('cancel 後再次呼叫仍能正常觸發', () => {
    const spy = vi.fn()
    const debounced = debounce(spy, 100)

    debounced('x')
    debounced.cancel()
    debounced('y')
    vi.advanceTimersByTime(100)

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('y')
  })

  it('flush 應立即以最後一次參數觸發 pending 呼叫', () => {
    const spy = vi.fn()
    const debounced = debounce(spy, 100)

    debounced('a')
    debounced('b')
    debounced.flush()

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('b')

    vi.advanceTimersByTime(200)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('flush 在無 pending 呼叫時應為 no-op', () => {
    const spy = vi.fn()
    const debounced = debounce(spy, 100)

    debounced.flush()
    expect(spy).not.toHaveBeenCalled()

    debounced('a')
    vi.advanceTimersByTime(100)
    debounced.flush()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('flush 後再次呼叫仍能正常觸發', () => {
    const spy = vi.fn()
    const debounced = debounce(spy, 100)

    debounced('x')
    debounced.flush()
    debounced('y')
    vi.advanceTimersByTime(100)

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenNthCalledWith(1, 'x')
    expect(spy).toHaveBeenNthCalledWith(2, 'y')
  })
})

describe('throttle', () => {
  it('第一次呼叫應立即執行', () => {
    const spy = vi.fn()
    const throttled = throttle(spy, 100)

    throttled('a')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('a')
  })

  it('時間窗內重複呼叫應於窗結束時以最後一次參數觸發', () => {
    const spy = vi.fn()
    const throttled = throttle(spy, 100)

    throttled('a')
    throttled('b')
    throttled('c')
    expect(spy).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenLastCalledWith('c')
  })

  it('時間窗結束後無待觸發尾端呼叫時不會再觸發', () => {
    const spy = vi.fn()
    const throttled = throttle(spy, 100)

    throttled('a')
    vi.advanceTimersByTime(100)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('cancel 應清除尚未觸發的尾端呼叫', () => {
    const spy = vi.fn()
    const throttled = throttle(spy, 100)

    throttled('a')
    throttled('b')
    throttled.cancel()
    vi.advanceTimersByTime(200)

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('a')
  })
})

describe('withTimeout', () => {
  it('在時限內完成則回傳結果', async () => {
    await expect(withTimeout(Promise.resolve('done'), 100)).resolves.toBe('done')
  })

  it('逾時回 undefined，但不取消原本的工作', async () => {
    const spy = vi.fn()
    const slow = new Promise<string>((resolve) => {
      setTimeout(() => {
        spy()
        resolve('late')
      }, 500)
    })
    const result = withTimeout(slow, 100)
    await vi.advanceTimersByTimeAsync(100)
    await expect(result).resolves.toBeUndefined()

    // 原工作仍會跑完（只是沒人等它）
    await vi.advanceTimersByTimeAsync(400)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('原工作失敗時照樣上拋', async () => {
    // 斷言需同步接上，否則 rejection 會先被視為 unhandled
    await expect(withTimeout(Promise.reject(new Error('boom')), 100)).rejects.toThrow('boom')
  })
})
