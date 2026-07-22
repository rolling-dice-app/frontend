import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRollLog, useDiceRollLog } from '~/composables/domain/useDiceRollLog'
import type { D20RollEntry } from '~/types/business/dice'

beforeEach(() => {
  useDiceRollLog().clear()
})

const sampleEntry = (
  overrides: Partial<D20RollEntry> = {},
): Omit<D20RollEntry, 'id' | 'rolledAt'> => ({
  kind: 'ability',
  label: '力量',
  mode: 'normal',
  rolls: [12],
  chosen: 12,
  modifier: 3,
  total: 15,
  isCritical: false,
  isFumble: false,
  ...overrides,
})

describe('useDiceRollLog — push', () => {
  it('push 應補上 id 與 rolledAt 並插入最前', () => {
    const { entries, push } = useDiceRollLog()
    push(sampleEntry({ label: '敏捷' }))
    expect(entries.value).toHaveLength(1)
    expect(entries.value[0]).toMatchObject({ label: '敏捷' })
    expect(entries.value[0]!.id).toEqual(expect.any(String))
    expect(entries.value[0]!.rolledAt).toEqual(expect.any(Number))
  })

  it('多次 push 採倒序：最新在最前', () => {
    const { entries, push } = useDiceRollLog()
    push(sampleEntry({ label: 'A' }))
    push(sampleEntry({ label: 'B' }))
    push(sampleEntry({ label: 'C' }))
    expect(entries.value.map((e) => e.label)).toEqual(['C', 'B', 'A'])
  })

  it('每次 push 應產生不同 id', () => {
    const { entries, push } = useDiceRollLog()
    push(sampleEntry())
    push(sampleEntry())
    expect(entries.value[0]!.id).not.toBe(entries.value[1]!.id)
  })

  it('超過 50 筆時 FIFO 截掉最舊', () => {
    const { entries, push } = useDiceRollLog()
    for (let i = 0; i < 55; i++) push(sampleEntry({ label: `r${i}` }))
    expect(entries.value).toHaveLength(50)
    expect(entries.value[0]!.label).toBe('r54')
    expect(entries.value[49]!.label).toBe('r5')
  })
})

describe('useDiceRollLog — clear', () => {
  it('clear 應清空所有項目', () => {
    const { entries, push, clear } = useDiceRollLog()
    push(sampleEntry())
    push(sampleEntry())
    clear()
    expect(entries.value).toHaveLength(0)
  })
})

describe('useDiceRollLog — singleton', () => {
  it('多次呼叫 useDiceRollLog 應共享同一個佇列', () => {
    useDiceRollLog().push(sampleEntry({ label: 'A' }))
    useDiceRollLog().push(sampleEntry({ label: 'B' }))
    expect(useDiceRollLog().entries.value).toHaveLength(2)
  })
})

describe('useDiceRollLog — crypto.randomUUID 不可用', () => {
  it('若 randomUUID 拋錯則 push 拋錯', () => {
    const original = crypto.randomUUID
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('not supported')
    })
    const { push } = useDiceRollLog()
    expect(() => push(sampleEntry())).toThrow()
    vi.restoreAllMocks()
    expect(crypto.randomUUID).toBe(original)
  })
})

describe('createRollLog — factory', () => {
  it('每次呼叫建立獨立佇列，且不影響 singleton', () => {
    const a = createRollLog()
    const b = createRollLog()
    a.push(sampleEntry({ label: '獨立' }))
    expect(a.entries.value).toHaveLength(1)
    expect(b.entries.value).toHaveLength(0)
    expect(useDiceRollLog().entries.value).toHaveLength(0)
  })

  it('超過 50 筆時 FIFO 截掉最舊', () => {
    const log = createRollLog()
    for (let i = 0; i < 55; i++) log.push(sampleEntry({ label: `r${i}` }))
    expect(log.entries.value).toHaveLength(50)
    expect(log.entries.value[0]!.label).toBe('r54')
  })
})
