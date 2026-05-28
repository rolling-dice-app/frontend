import { describe, expect, it } from 'vitest'
import { createDirtyGuard, createKeyedDirtyGuard } from '~/utils/dirty-guard'

describe('createDirtyGuard', () => {
  it('snapshot 後沒 bump，changedSince 為 false', () => {
    const g = createDirtyGuard()
    const snap = g.snapshot()
    expect(g.changedSince(snap)).toBe(false)
  })

  it('snapshot 後 bump 一次，changedSince 為 true', () => {
    const g = createDirtyGuard()
    const snap = g.snapshot()
    g.bump()
    expect(g.changedSince(snap)).toBe(true)
  })

  it('連續 bump 後取新 snap，新 snap 之後沒再 bump 則 changedSince 為 false', () => {
    const g = createDirtyGuard()
    g.bump()
    g.bump()
    const snap = g.snapshot()
    expect(g.changedSince(snap)).toBe(false)
    g.bump()
    expect(g.changedSince(snap)).toBe(true)
  })
})

describe('createKeyedDirtyGuard', () => {
  it('未 bump 的 key 與 snap 比對為 false', () => {
    const g = createKeyedDirtyGuard<string>()
    const snap = g.snapshot()
    expect(g.changedSince('A', snap)).toBe(false)
  })

  it('snap 後 bump 該 key 才會 changedSince 為 true', () => {
    const g = createKeyedDirtyGuard<string>()
    g.bump('A')
    const snap = g.snapshot()
    expect(g.changedSince('A', snap)).toBe(false)
    g.bump('A')
    expect(g.changedSince('A', snap)).toBe(true)
  })

  it('不同 key 互不影響', () => {
    const g = createKeyedDirtyGuard<string>()
    const snap = g.snapshot()
    g.bump('A')
    expect(g.changedSince('A', snap)).toBe(true)
    expect(g.changedSince('B', snap)).toBe(false)
  })

  it('snapshot 為防禦性 copy，事後 bump 不影響舊 snap', () => {
    const g = createKeyedDirtyGuard<string>()
    g.bump('A')
    const snap = g.snapshot()
    g.bump('A')
    g.bump('B')
    // 舊 snap 仍認為「snap 當下 A=1, B=0」
    expect(g.changedSince('A', snap)).toBe(true)
    expect(g.changedSince('B', snap)).toBe(true)
    const snap2 = g.snapshot()
    expect(g.changedSince('A', snap2)).toBe(false)
    expect(g.changedSince('B', snap2)).toBe(false)
  })
})
