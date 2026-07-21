import type { SkillKey } from '@rolling-dice-app/core'
import { useBattlefieldRollLog } from '~/composables/domain/useBattlefieldRollLog'
import { resolveDeathSaveRoll, rollD20, rollDamageLines } from '~/helpers/dice'
import {
  useBattlefieldStore,
  type EnemyInitiativeRollResult,
  type InitiativeRollResult,
} from '~/stores/battlefield'
import type { BattlefieldAttackEntry, BattlefieldUnit } from '~/types/business/battlefield'
import type { RollMode } from '~/types/business/dice'

/**
 * 戰場擲骰編排：擲骰（helpers/dice）→ 寫入戰鬥紀錄（useBattlefieldRollLog）→
 * 需要落數值的結果走 store action（死亡豁免計數／先攻）。
 * client-only：僅在使用者互動時呼叫。
 */
export function useBattlefieldDiceRolls(battlefieldId: string) {
  const store = useBattlefieldStore()
  const log = useBattlefieldRollLog()
  const { t } = useI18n()

  const pushD20 = (
    kind: 'skill' | 'attack-hit' | 'initiative' | 'saving-throw',
    unitName: string,
    label: string,
    modifier: number,
    mode: RollMode,
    rolls: number[],
    chosen: number,
  ): void => {
    log.push({
      kind,
      label,
      unitName,
      mode,
      rolls,
      chosen,
      modifier,
      total: chosen + modifier,
      isCritical: chosen === 20,
      isFumble: chosen === 1,
    })
  }

  const rollAttackHit = (
    unit: BattlefieldUnit,
    attack: BattlefieldAttackEntry,
    mode: RollMode,
  ): void => {
    const { rolls, chosen } = rollD20(mode)
    pushD20(
      'attack-hit',
      unit.name,
      t('battlefield.logHit', { name: attack.name }),
      attack.hitBonus,
      mode,
      rolls,
      chosen,
    )
  }

  const rollAttackDamage = (
    unit: BattlefieldUnit,
    attack: BattlefieldAttackEntry,
    isCritical: boolean,
  ): void => {
    const lines = rollDamageLines(attack.damageDice, isCritical)
    if (lines.length === 0) return
    log.push({
      kind: 'attack-damage',
      label: t('battlefield.logDamage', { name: attack.name }),
      unitName: unit.name,
      lines,
      total: lines.reduce((sum, line) => sum + line.subtotal, 0),
      isCritical,
    })
  }

  const rollSkill = (unit: BattlefieldUnit, key: SkillKey, mode: RollMode): void => {
    const bonus = unit.skills[key] ?? 0
    const { rolls, chosen } = rollD20(mode)
    pushD20('skill', unit.name, t(`skill.label.${key}`), bonus, mode, rolls, chosen)
  }

  /** 死亡豁免：擲骰進 log 後依判定落計數；自然 20 回復 1 HP（store 連動歸零、區塊收起） */
  const rollDeathSave = (unit: BattlefieldUnit): void => {
    const { rolls, chosen } = rollD20('normal')
    pushD20('saving-throw', unit.name, t('combat.deathSave'), 0, 'normal', rolls, chosen)
    const resolution = resolveDeathSaveRoll(chosen)
    if (resolution.outcome === 'recover') {
      store.applyHeal(battlefieldId, unit.id, 1)
      return
    }
    if (resolution.outcome === 'success') {
      store.setDeathSaveSuccesses(
        battlefieldId,
        unit.id,
        Math.min(3, unit.deathSaves.successes + resolution.amount),
      )
    } else {
      store.setDeathSaveFailures(
        battlefieldId,
        unit.id,
        Math.min(3, unit.deathSaves.failures + resolution.amount),
      )
    }
  }

  /** 單一單位擲先攻；回傳結果供頁面 toast */
  const rollUnitInitiative = (unit: BattlefieldUnit): InitiativeRollResult => {
    const result = store.rollInitiative(battlefieldId, unit.id)
    pushD20(
      'initiative',
      unit.name,
      t('battlefield.logInitiative'),
      unit.initiativeBonus,
      'normal',
      [result.roll],
      result.roll,
    )
    return result
  }

  /** 全部在場敵人擲先攻；逐筆進 log，回傳結果陣列供頁面 toast */
  const rollEnemiesInitiative = (): EnemyInitiativeRollResult[] => {
    const results = store.rollAllEnemyInitiatives(battlefieldId)
    for (const result of results) {
      pushD20(
        'initiative',
        result.name,
        t('battlefield.logInitiative'),
        result.total - result.roll,
        'normal',
        [result.roll],
        result.roll,
      )
    }
    return results
  }

  return {
    rollAttackHit,
    rollAttackDamage,
    rollSkill,
    rollDeathSave,
    rollUnitInitiative,
    rollEnemiesInitiative,
  }
}
