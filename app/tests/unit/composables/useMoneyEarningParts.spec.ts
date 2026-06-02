import { describe, expect, it } from 'vitest'
import { useMoneyEarningParts } from '~/composables/ui/useMoneyEarningParts'
import type { CurrencyAmount } from '@rolling-dice-app/core'

describe('useMoneyEarningParts', () => {
  it('只列出 > 0 的幣別，順序為 pp→gp→sp→cp', () => {
    const toParts = useMoneyEarningParts()
    const money: CurrencyAmount = { cp: 5, sp: 0, gp: 3, pp: 1 }
    const parts = toParts(money)
    expect(parts.map((p) => p.key)).toEqual(['pp', 'gp', 'cp'])
    expect(parts.map((p) => p.value)).toEqual([1, 3, 5])
    // 每個 part 帶 i18n 後的短標籤
    expect(parts.every((p) => typeof p.label === 'string' && p.label.length > 0)).toBe(true)
  })

  it('全為 0 時回傳空陣列', () => {
    const toParts = useMoneyEarningParts()
    expect(toParts({ cp: 0, sp: 0, gp: 0, pp: 0 })).toEqual([])
  })
})
