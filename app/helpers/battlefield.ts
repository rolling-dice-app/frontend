import type {
  BattlefieldUnit,
  BattlefieldUnitHp,
  ClassEntry,
  ClassKey,
} from '@rolling-dice-app/core'
import type { EndBattleKeepFlags } from '~/types/business/battlefield'

/** 有效最大 HP＝快照基準＋臨時調整，下限 1（調整值模型，比照 combat-state） */
export function effectiveMaxHp(unit: Pick<BattlefieldUnit, 'maxHp' | 'hp'>): number {
  return Math.max(1, unit.maxHp + unit.hp.maxAdjustment)
}

/** 有效 AC＝快照基準＋臨時調整，下限 0 */
export function effectiveAc(unit: Pick<BattlefieldUnit, 'ac' | 'acAdjustment'>): number {
  return Math.max(0, unit.ac + unit.acAdjustment)
}

/**
 * 造成傷害：臨時 HP 先扣（沿用戰鬥速查語意），剩餘扣當前 HP，下限 0。
 * amount <= 0 視為 no-op。回傳新的 HP 子結構（maxAdjustment 原樣保留）。
 */
export function applyDamageToHp(
  unit: Pick<BattlefieldUnit, 'maxHp' | 'hp'>,
  amount: number,
): BattlefieldUnitHp {
  if (amount <= 0) return { ...unit.hp }
  const fromTemp = Math.min(unit.hp.tempHp, amount)
  const rest = amount - fromTemp
  return {
    ...unit.hp,
    current: Math.min(Math.max(unit.hp.current - rest, 0), effectiveMaxHp(unit)),
    tempHp: unit.hp.tempHp - fromTemp,
  }
}

/** 治療：只補當前 HP，上限有效最大 HP；不影響臨時 HP。amount <= 0 視為 no-op。 */
export function applyHealToHp(
  unit: Pick<BattlefieldUnit, 'maxHp' | 'hp'>,
  amount: number,
): BattlefieldUnitHp {
  if (amount <= 0) return { ...unit.hp }
  return {
    ...unit.hp,
    current: Math.min(unit.hp.current + amount, effectiveMaxHp(unit)),
  }
}

export type HpTier = 'crit' | 'low' | null

/** HP 危險分級：≤25% 危急（crit）、≤50% 低血（low）；maxHp <= 0 視為無分級 */
export function hpRatioTier(currentHp: number, maxHp: number): HpTier {
  if (maxHp <= 0) return null
  const ratio = currentHp / maxHp
  if (ratio <= 0.25) return 'crit'
  if (ratio <= 0.5) return 'low'
  return null
}

/** 參戰單位依 sortOrder 排序（先攻軌顯示序） */
export function combatantsOf(units: BattlefieldUnit[]): BattlefieldUnit[] {
  return units.filter((u) => u.inCombat).sort((a, b) => a.sortOrder - b.sortOrder)
}

/** 未參戰單位（戰場可用庫） */
export function rosterOf(units: BattlefieldUnit[]): BattlefieldUnit[] {
  return units.filter((u) => !u.inCombat)
}

/**
 * 依先攻值回傳新的顯示順序：先攻降冪、null 排最後、平手維持現有相對順序
 * （穩定排序；平手由拖曳／上下移手動覆蓋）。回傳排好序的單位陣列，不改動輸入。
 */
export function sortCombatantsByInitiative(combatants: BattlefieldUnit[]): BattlefieldUnit[] {
  return combatants
    .map((u, index) => ({ u, index }))
    .sort((a, b) => {
      const ai = a.u.initiative
      const bi = b.u.initiative
      if (ai == null && bi == null) return a.index - b.index
      if (ai == null) return 1
      if (bi == null) return -1
      if (bi !== ai) return bi - ai
      return a.index - b.index
    })
    .map((x) => x.u)
}

export interface TurnStep {
  activeUnitId: string | null
  /** +1 表示越過軌尾進入新輪、-1 表示退回上一輪（round 下限 1 由呼叫端 clamp） */
  roundDelta: number
}

/**
 * 回合推進：dir=1 下一位（軌尾繞回軌頭並進位）、dir=-1 上一位（軌頭繞回軌尾並退位）。
 * activeUnitId 不在軌上（null 或已退場）時，落到軌頭且不動 round。
 */
export function nextTurnTarget(
  orderedIds: string[],
  activeUnitId: string | null,
  dir: 1 | -1,
): TurnStep {
  if (orderedIds.length === 0) return { activeUnitId: null, roundDelta: 0 }
  const current = activeUnitId == null ? -1 : orderedIds.indexOf(activeUnitId)
  if (current < 0) return { activeUnitId: orderedIds[0] ?? null, roundDelta: 0 }
  const next = current + dir
  if (next >= orderedIds.length) return { activeUnitId: orderedIds[0] ?? null, roundDelta: 1 }
  if (next < 0) return { activeUnitId: orderedIds[orderedIds.length - 1] ?? null, roundDelta: -1 }
  return { activeUnitId: orderedIds[next] ?? null, roundDelta: 0 }
}

/**
 * 怪物實例顯示名：同模板第一隻用模板原名，之後依既有數量遞增編號；
 * 與現存名稱撞名時往後找到空號為止（實例可能被手動改名或移除）。
 */
export function buildMonsterInstanceName(
  templateName: string,
  existingCount: number,
  existingNames: string[],
): string {
  if (existingCount === 0 && !existingNames.includes(templateName)) return templateName
  const taken = new Set(existingNames)
  let n = existingCount + 1
  while (taken.has(`${templateName} ${n}`)) n += 1
  return `${templateName} ${n}`
}

/**
 * 結束戰鬥的單位重設（2026-07-16 決議）：
 * 必清＝先攻；敵方退出戰鬥（實例保留）、玩家與中立留場。
 * 保留項由 flags 逐項決定；「其他調整值」重置會把 AC／最大 HP／速度調整歸零，
 * 且先套調整值重置再套滿血，避免以調整後上限回血。
 */
export function resetUnitAfterBattle(
  source: BattlefieldUnit,
  flags: EndBattleKeepFlags,
): BattlefieldUnit {
  const next: BattlefieldUnit = {
    ...source,
    hp: { ...source.hp },
    conditions: source.conditions.map((c) => ({ ...c })),
    deathSaves: { ...source.deathSaves },
    initiative: null,
    inCombat: source.inCombat && source.faction !== 'enemy',
  }
  if (source.inCombat) {
    if (!flags.keepAdjustments) {
      next.acAdjustment = 0
      next.hp.maxAdjustment = 0
      next.speedAdjustment = 0
      next.hp.current = Math.min(next.hp.current, effectiveMaxHp(next))
    }
    if (!flags.keepCurrentHp) next.hp.current = effectiveMaxHp(next)
    if (!flags.keepTempHp) next.hp.tempHp = 0
    if (!flags.keepConditions) next.conditions = []
  }
  // HP ≥ 1 死亡豁免歸零（與 store clearDeathSavesIfUp 同不變量）
  if (next.hp.current >= 1) next.deathSaves = { successes: 0, failures: 0 }
  return next
}

/**
 * 角色顯示補充：「種族 主職業 Lv.總等級」（主職業＝第一個 entry）；
 * 職業 label 由呼叫端注入（i18n 不進 helper）。缺段略過，皆缺回空字串。
 */
export function formatCharacterTitle(
  race: string | null,
  classes: ReadonlyArray<ClassEntry>,
  classLabelOf: (key: ClassKey) => string,
): string {
  const parts: string[] = []
  if (race != null && race !== '') parts.push(race)
  const primary = classes[0]
  if (primary) parts.push(classLabelOf(primary.classKey), `Lv.${calculateTotalLevel(classes)}`)
  return parts.join(' ')
}

/** 挑戰等級顯示：契約存原始字串（如 "1/2"），UI 統一冠 "CR "；null 回空字串 */
export function formatChallengeRating(challengeRating: string | null): string {
  return challengeRating == null ? '' : `CR ${challengeRating}`
}

/** 速度顯示：有效速度（快照＋調整，夾 0）加單位；快照未知（null）則 em dash */
export function speedDisplay(
  unit: Pick<BattlefieldUnit, 'speed' | 'speedAdjustment'>,
  feetUnit: string,
): string {
  if (unit.speed == null) return '—'
  return `${Math.max(0, unit.speed + unit.speedAdjustment)} ${feetUnit}`
}
