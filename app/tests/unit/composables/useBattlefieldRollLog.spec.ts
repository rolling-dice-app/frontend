import { beforeEach, describe, expect, it } from 'vitest'
import { useBattlefieldRollLog } from '~/composables/domain/useBattlefieldRollLog'
import { createRollLog, useDiceRollLog } from '~/composables/domain/useDiceRollLog'
import type { D20RollEntry } from '~/types/business/dice'

const sampleEntry = (
  overrides: Partial<D20RollEntry> = {},
): Omit<D20RollEntry, 'id' | 'rolledAt'> => ({
  kind: 'attack-hit',
  label: '彎刀命中',
  unitName: '哥布林 1',
  mode: 'normal',
  rolls: [12],
  chosen: 12,
  modifier: 4,
  total: 16,
  isCritical: false,
  isFumble: false,
  ...overrides,
})

beforeEach(() => {
  useBattlefieldRollLog().clear()
  useDiceRollLog().clear()
})

describe('createRollLog — factory', () => {
  it('每次呼叫建立獨立佇列', () => {
    const a = createRollLog()
    const b = createRollLog()
    a.push(sampleEntry())
    expect(a.entries.value).toHaveLength(1)
    expect(b.entries.value).toHaveLength(0)
  })

  it('超過 50 筆時 FIFO 截掉最舊', () => {
    const log = createRollLog()
    for (let i = 0; i < 55; i++) log.push(sampleEntry({ label: `r${i}` }))
    expect(log.entries.value).toHaveLength(50)
    expect(log.entries.value[0]!.label).toBe('r54')
  })
})

describe('useBattlefieldRollLog — singleton 與隔離', () => {
  it('多次呼叫共享同一佇列，entry 保留 unitName', () => {
    useBattlefieldRollLog().push(sampleEntry())
    expect(useBattlefieldRollLog().entries.value[0]).toMatchObject({ unitName: '哥布林 1' })
  })

  it('與速查頁 useDiceRollLog 互不相通（push / clear 皆隔離）', () => {
    useBattlefieldRollLog().push(sampleEntry())
    expect(useDiceRollLog().entries.value).toHaveLength(0)
    useDiceRollLog().push(sampleEntry({ unitName: undefined }))
    useDiceRollLog().clear()
    expect(useBattlefieldRollLog().entries.value).toHaveLength(1)
  })
})
