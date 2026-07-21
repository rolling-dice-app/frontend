import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveDeathSaveRoll, rollD20, rollDamageLines, rollDice, rollDie } from '~/helpers/dice'

describe('rollDie', () => {
  it('回傳值為整數且介於 1 到面數之間', () => {
    for (let i = 0; i < 100; i++) {
      const value = rollDie(20)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(20)
    }
  })

  it('sides=0 應拋 RangeError', () => {
    expect(() => rollDie(0)).toThrow(RangeError)
  })

  it('sides=-1 應拋 RangeError', () => {
    expect(() => rollDie(-1)).toThrow(RangeError)
  })

  it('sides=2.5 應拋 RangeError', () => {
    expect(() => rollDie(2.5)).toThrow(RangeError)
  })
})

describe('rollDice', () => {
  it('指定次數時，回傳對應長度的陣列', () => {
    expect(rollDice(4, 6)).toHaveLength(4)
  })

  it('每顆骰子結果應在 1 到面數之間', () => {
    const sides = 20
    const results = rollDice(100, sides)
    for (const value of results) {
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(sides)
    }
  })

  it('結果應為整數', () => {
    const results = rollDice(50, 6)
    for (const value of results) {
      expect(Number.isInteger(value)).toBe(true)
    }
  })

  it('sides=0 應拋 RangeError', () => {
    expect(() => rollDice(1, 0)).toThrow(RangeError)
  })

  it('sides=-1 應拋 RangeError', () => {
    expect(() => rollDice(1, -1)).toThrow(RangeError)
  })

  it('times=0 應拋 RangeError', () => {
    expect(() => rollDice(0, 6)).toThrow(RangeError)
  })

  it('times=2.7 應拋 RangeError', () => {
    expect(() => rollDice(2.7, 6)).toThrow(RangeError)
  })
})

describe('rollD20', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('normal 模式擲 1 顆，採用該顆', () => {
    // floor(0.7 * 20) + 1 = 15
    vi.spyOn(Math, 'random').mockReturnValue(0.7)
    const result = rollD20('normal')
    expect(result.rolls).toEqual([15])
    expect(result.chosen).toBe(15)
  })

  it('advantage 模式擲 2 顆，採用較大者', () => {
    // 先 0.1 → 3，再 0.85 → 18
    const seq = [0.1, 0.85]
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++]!)
    const result = rollD20('advantage')
    expect(result.rolls).toEqual([3, 18])
    expect(result.chosen).toBe(18)
  })

  it('disadvantage 模式擲 2 顆，採用較小者', () => {
    const seq = [0.85, 0.1]
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++]!)
    const result = rollD20('disadvantage')
    expect(result.rolls).toEqual([18, 3])
    expect(result.chosen).toBe(3)
  })

  it('advantage 兩顆相等時採用該值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const result = rollD20('advantage')
    expect(result.rolls).toEqual([11, 11])
    expect(result.chosen).toBe(11)
  })
})

describe('resolveDeathSaveRoll', () => {
  it('自然 20 → recover（起死回生）', () => {
    expect(resolveDeathSaveRoll(20)).toEqual({ outcome: 'recover', amount: 1 })
  })

  it('自然 1 → failure ×2', () => {
    expect(resolveDeathSaveRoll(1)).toEqual({ outcome: 'failure', amount: 2 })
  })

  it('10（界值）→ success +1', () => {
    expect(resolveDeathSaveRoll(10)).toEqual({ outcome: 'success', amount: 1 })
  })

  it('9（界值）→ failure +1', () => {
    expect(resolveDeathSaveRoll(9)).toEqual({ outcome: 'failure', amount: 1 })
  })
})

describe('rollDamageLines', () => {
  it('一般傷害：骰數不翻倍、小計含加值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // d8 → 5
    const lines = rollDamageLines(
      [{ id: 'd1', dieType: 8, count: 1, bonus: 3, damageType: 'piercing' }],
      false,
    )
    expect(lines).toEqual([
      { rolls: [5], sides: 8, count: 1, bonus: 3, damageType: 'piercing', subtotal: 8 },
    ])
  })

  it('爆擊：骰數 ×2、加值不翻倍', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // d8 → 5
    const lines = rollDamageLines(
      [{ id: 'd1', dieType: 8, count: 2, bonus: 3, damageType: null }],
      true,
    )
    expect(lines[0]).toMatchObject({ count: 4, rolls: [5, 5, 5, 5], bonus: 3, subtotal: 23 })
  })

  it('純加值行保留；無骰又 0 加值的空行被過濾', () => {
    const lines = rollDamageLines(
      [
        { id: 'd1', dieType: null, count: 0, bonus: 10, damageType: 'acid' },
        { id: 'd2', dieType: null, count: 0, bonus: 0, damageType: null },
      ],
      false,
    )
    expect(lines).toEqual([
      { rolls: [], sides: null, count: 0, bonus: 10, damageType: 'acid', subtotal: 10 },
    ])
  })

  it('多行分別小計；abilityMod 只加在第一行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 每骰 1
    const lines = rollDamageLines(
      [
        { id: 'd1', dieType: 6, count: 1, bonus: null, damageType: null },
        { id: 'd2', dieType: 6, count: 2, bonus: null, damageType: null },
      ],
      false,
      3,
    )
    expect(lines[0]).toMatchObject({ bonus: 3, subtotal: 4 })
    expect(lines[1]).toMatchObject({ bonus: 0, rolls: [1, 1], subtotal: 2 })
  })
})
