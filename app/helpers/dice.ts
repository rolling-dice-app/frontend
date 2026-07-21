import type { DamageDieEntry } from '@rolling-dice-app/core'
import type { DamageRollLine, RollMode } from '~/types/business/dice'

/**
 * 擲一顆骰子，回傳結果。
 * @param sides 骰子面數（e.g. 6 代表 d6），必須為正整數
 * @throws RangeError 當 sides 非正整數
 */
export function rollDie(sides: number): number {
  if (!Number.isInteger(sides) || sides < 1) {
    throw new RangeError(`sides 必須為正整數，收到 ${sides}`)
  }
  return Math.floor(Math.random() * sides) + 1
}

/**
 * 擲多顆骰子，回傳每顆的結果陣列，保留投擲順序。
 * @param times 擲骰次數，必須為正整數
 * @param sides 骰子面數（e.g. 6 代表 d6），必須為正整數
 * @throws RangeError 當 times 或 sides 非正整數
 */
export function rollDice(times: number, sides: number): number[] {
  if (!Number.isInteger(times) || times < 1) {
    throw new RangeError(`times 必須為正整數，收到 ${times}`)
  }
  return Array.from({ length: times }, () => rollDie(sides))
}

/**
 * 依模式擲 d20，回傳原始骰值與採用值。
 * - normal：擲 1 顆，採用該顆
 * - advantage：擲 2 顆，採用較大者
 * - disadvantage：擲 2 顆，採用較小者
 */
export function rollD20(mode: RollMode): { rolls: number[]; chosen: number } {
  if (mode === 'normal') {
    const value = rollDie(20)
    return { rolls: [value], chosen: value }
  }
  const rolls = rollDice(2, 20)
  const [a, b] = rolls as [number, number]
  const chosen = mode === 'advantage' ? Math.max(a, b) : Math.min(a, b)
  return { rolls, chosen }
}

/** 死亡豁免 d20 判定結果 */
export interface DeathSaveResolution {
  /** recover = 自然 20（回復 1 HP）；success / failure 依 amount 計數 */
  outcome: 'recover' | 'success' | 'failure'
  /** 計數增量；自然 1 為 2，其餘 1（recover 不計數） */
  amount: 1 | 2
}

/**
 * 死亡豁免規則（PHB）：自然 20 起死回生（回復 1 HP）、自然 1 記兩次失敗、
 * ≥ 10 成功、< 10 失敗。單一規則來源，供速查頁與戰場共用。
 */
export function resolveDeathSaveRoll(chosen: number): DeathSaveResolution {
  if (chosen === 20) return { outcome: 'recover', amount: 1 }
  if (chosen === 1) return { outcome: 'failure', amount: 2 }
  return chosen >= 10 ? { outcome: 'success', amount: 1 } : { outcome: 'failure', amount: 1 }
}

/**
 * 依傷害條目擲傷害，回傳可渲染的逐行結果（過濾無骰又無加值的空行）。
 * 爆擊骰數 ×2（加值不變）；abilityMod 只加在第一行（速查頁注入，戰場攤平值傳 0 即可）。
 */
export function rollDamageLines(
  damageDice: DamageDieEntry[],
  isCritical: boolean,
  abilityMod = 0,
): DamageRollLine[] {
  const lines = damageDice.map((entry, index): DamageRollLine => {
    const totalBonus = (entry.bonus ?? 0) + (index === 0 ? abilityMod : 0)
    if (entry.dieType == null || entry.count <= 0) {
      return {
        rolls: [],
        sides: null,
        count: 0,
        bonus: totalBonus,
        damageType: entry.damageType,
        subtotal: totalBonus,
      }
    }
    const count = isCritical ? entry.count * 2 : entry.count
    const rolls = rollDice(count, entry.dieType)
    return {
      rolls,
      sides: entry.dieType,
      count,
      bonus: totalBonus,
      damageType: entry.damageType,
      subtotal: rolls.reduce((sum, roll) => sum + roll, 0) + totalBonus,
    }
  })
  return lines.filter((line) => line.sides != null || line.bonus !== 0)
}
