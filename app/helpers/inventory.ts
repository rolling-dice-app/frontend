import type { CharacterCurrencyDTO, InventoryItemDTO } from '@rolling-dice-app/core'
import { CARRY_WEIGHT_PER_STR, COINS_PER_LB } from '~/constants/inventory'

/** 計算物品列表的總重量（每件 weight × quantity 加總） */
export function calculateItemsWeight(items: InventoryItemDTO[]): number {
  return items.reduce((sum, item) => sum + item.weight * item.quantity, 0)
}

/** 計算金幣總重量（所有幣種枚數合計 / COINS_PER_LB） */
export function calculateCurrencyWeight(currency: CharacterCurrencyDTO): number {
  const total = currency.cp + currency.sp + currency.gp + currency.pp
  return total / COINS_PER_LB
}

/** 計算背包總負重（物品重量 + 金幣重量） */
export function calculateBackpackLoad(
  items: InventoryItemDTO[],
  currency: CharacterCurrencyDTO,
): number {
  return calculateItemsWeight(items) + calculateCurrencyWeight(currency)
}

/** 計算最大負重（STR score × CARRY_WEIGHT_PER_STR） */
export function calculateMaxCarryWeight(strScore: number): number {
  return strScore * CARRY_WEIGHT_PER_STR
}

/** 格式化重量數值：整數直接顯示，小數取至最多兩位有效小數 */
export function formatWeight(value: number): string {
  return value % 1 === 0 ? value.toString() : parseFloat(value.toFixed(2)).toString()
}
