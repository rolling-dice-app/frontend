import { POINT_BUY_COST_TABLE, POINT_BUY_MAX_SCORE, POINT_BUY_MIN_SCORE } from '~/constants/dnd'
import { rollDice } from '~/helpers/dice'
import { ABILITY_KEYS, type AbilityKey, type AbilityScoreEntry } from '@rolling-dice-app/core'
import type { DiceSlot } from '~/types/business/character-form'

/**
 * 計算屬性總分（origin + 種族加值 + 後天 bonus）
 */
export function getTotalScore(entry: AbilityScoreEntry): number {
  return entry.origin + entry.race + entry.bonusScore
}

/**
 * 計算屬性調整值：floor((totalScore - 10) / 2)
 */
export function getAbilityModifier(totalScore: number): number {
  return Math.floor((totalScore - 10) / 2)
}

/**
 * 將調整值格式化為帶正負號的字串，例如 `+2`、`-1`、`+0`
 */
export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`
}

/**
 * 判斷單項屬性分數是否在購點制合法範圍內（8–15）
 */
export function isValidPointBuyScore(score: number): boolean {
  return Number.isInteger(score) && score >= POINT_BUY_MIN_SCORE && score <= POINT_BUY_MAX_SCORE
}

/**
 * 查表取得購點制費用。
 * 呼叫前必須先以 `isValidPointBuyScore` 驗證，否則拋出錯誤。
 */
export function getPointBuyCost(score: number): number {
  if (!isValidPointBuyScore(score)) {
    throw new RangeError(
      `getPointBuyCost: score ${score} is out of valid range (${POINT_BUY_MIN_SCORE}–${POINT_BUY_MAX_SCORE})`,
    )
  }
  return POINT_BUY_COST_TABLE[score]!
}

/**
 * 嘗試以購點制成本表計算六項屬性的累計花費。
 * 任一分數不在合法範圍（8–15）時回傳 null。
 */
export function tryCalculateSpentPoints(scores: Record<AbilityKey, number>): number | null {
  let sum = 0
  for (const score of Object.values(scores)) {
    if (!isValidPointBuyScore(score)) return null
    sum += POINT_BUY_COST_TABLE[score]!
  }
  return sum
}

/**
 * D&D 5e 能力值擲骰：4d6 去最低。
 * 擲 4 顆 d6，排序後取最高 3 顆加總。
 */
export function rollAbilityScore(): number {
  const sorted = rollDice(4, 6).sort((a, b) => a - b) as [number, number, number, number]
  const [_, second, third, fourth] = sorted
  return second + third + fourth
}

/**
 * 產生 6 個骰值組成的池，由高到低排序，皆未指派。
 */
export function createDicePool(): DiceSlot[] {
  const values = Array.from({ length: ABILITY_KEYS.length }, () => rollAbilityScore())
  values.sort((a, b) => b - a)
  return values.map((value) => ({
    id: crypto.randomUUID(),
    value,
    assignedTo: null,
  }))
}
