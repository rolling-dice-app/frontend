import { describe, expect, it, vi } from 'vitest'
import type { ClassEntry, ClassKey } from '@rolling-dice-app/core'
import {
  applyDamageToHp,
  applyHealToHp,
  buildMonsterInstanceName,
  combatantsOf,
  effectiveAc,
  effectiveMaxHp,
  formatChallengeRating,
  formatCharacterTitle,
  hpRatioTier,
  nextTurnTarget,
  resetUnitAfterBattle,
  rosterOf,
  sortCombatantsByInitiative,
  speedDisplay,
} from '~/helpers/battlefield'
import { calculateTotalLevel } from '~/helpers/character'
import type { EndBattleKeepFlags } from '~/types/business/battlefield'
import { createMockBattlefieldUnit } from '~/tests/fixtures/battlefield'

// formatCharacterTitle 內部走 auto-import 呼叫 calculateTotalLevel
vi.stubGlobal('calculateTotalLevel', calculateTotalLevel)

const KEEP_ALL: EndBattleKeepFlags = {
  keepCurrentHp: true,
  keepTempHp: true,
  keepConditions: true,
  keepAdjustments: true,
}

describe('effectiveMaxHp / effectiveAc', () => {
  it('有效值＝快照基準＋臨時調整', () => {
    const unit = createMockBattlefieldUnit({
      maxHp: 20,
      hp: { current: 20, tempHp: 0, maxAdjustment: 5 },
      ac: 15,
      acAdjustment: -2,
    })
    expect(effectiveMaxHp(unit)).toBe(25)
    expect(effectiveAc(unit)).toBe(13)
  })

  it('有效最大 HP 下限 1、有效 AC 下限 0', () => {
    const unit = createMockBattlefieldUnit({
      maxHp: 5,
      hp: { current: 1, tempHp: 0, maxAdjustment: -99 },
      ac: 10,
      acAdjustment: -99,
    })
    expect(effectiveMaxHp(unit)).toBe(1)
    expect(effectiveAc(unit)).toBe(0)
  })
})

describe('applyDamageToHp', () => {
  it('臨時 HP 先扣，剩餘才扣當前 HP；maxAdjustment 原樣保留', () => {
    const unit = createMockBattlefieldUnit({
      maxHp: 27,
      hp: { current: 12, tempHp: 5, maxAdjustment: 3 },
    })
    expect(applyDamageToHp(unit, 6)).toEqual({ current: 11, tempHp: 0, maxAdjustment: 3 })
  })

  it('傷害小於臨時 HP 時當前 HP 不動', () => {
    const unit = createMockBattlefieldUnit({
      maxHp: 27,
      hp: { current: 12, tempHp: 5, maxAdjustment: 0 },
    })
    expect(applyDamageToHp(unit, 3)).toEqual({ current: 12, tempHp: 2, maxAdjustment: 0 })
  })

  it('當前 HP 下限 0，不出現負值', () => {
    const unit = createMockBattlefieldUnit({
      maxHp: 7,
      hp: { current: 3, tempHp: 0, maxAdjustment: 0 },
    })
    expect(applyDamageToHp(unit, 99)).toEqual({ current: 0, tempHp: 0, maxAdjustment: 0 })
  })

  it('amount <= 0 為 no-op', () => {
    const unit = createMockBattlefieldUnit({
      maxHp: 10,
      hp: { current: 8, tempHp: 2, maxAdjustment: 0 },
    })
    expect(applyDamageToHp(unit, 0)).toEqual({ current: 8, tempHp: 2, maxAdjustment: 0 })
    expect(applyDamageToHp(unit, -5)).toEqual({ current: 8, tempHp: 2, maxAdjustment: 0 })
  })
})

describe('applyHealToHp', () => {
  it('回復上限為有效最大 HP（含調整），且不影響臨時 HP', () => {
    const unit = createMockBattlefieldUnit({
      maxHp: 20,
      hp: { current: 15, tempHp: 3, maxAdjustment: 2 },
    })
    expect(applyHealToHp(unit, 99)).toEqual({ current: 22, tempHp: 3, maxAdjustment: 2 })
  })

  it('amount <= 0 為 no-op', () => {
    const unit = createMockBattlefieldUnit({
      maxHp: 20,
      hp: { current: 15, tempHp: 0, maxAdjustment: 0 },
    })
    expect(applyHealToHp(unit, 0)).toEqual({ current: 15, tempHp: 0, maxAdjustment: 0 })
  })
})

describe('hpRatioTier', () => {
  it('≤25% 為 crit、≤50% 為 low、以上無分級', () => {
    expect(hpRatioTier(5, 20)).toBe('crit')
    expect(hpRatioTier(10, 20)).toBe('low')
    expect(hpRatioTier(11, 20)).toBeNull()
  })

  it('maxHp <= 0 視為無分級', () => {
    expect(hpRatioTier(0, 0)).toBeNull()
  })
})

describe('sortCombatantsByInitiative', () => {
  it('先攻降冪、null 排最後、平手維持現有相對順序', () => {
    const a = createMockBattlefieldUnit({ name: 'a', initiative: 17 })
    const b = createMockBattlefieldUnit({ name: 'b', initiative: null })
    const c = createMockBattlefieldUnit({ name: 'c', initiative: 19 })
    const d = createMockBattlefieldUnit({ name: 'd', initiative: 17 })
    const sorted = sortCombatantsByInitiative([a, b, c, d])
    expect(sorted.map((u) => u.name)).toEqual(['c', 'a', 'd', 'b'])
  })

  it('不改動輸入陣列', () => {
    const a = createMockBattlefieldUnit({ initiative: 1 })
    const b = createMockBattlefieldUnit({ initiative: 9 })
    const input = [a, b]
    sortCombatantsByInitiative(input)
    expect(input).toEqual([a, b])
  })
})

describe('nextTurnTarget', () => {
  const ids = ['u1', 'u2', 'u3']

  it('順推到下一位，不進位', () => {
    expect(nextTurnTarget(ids, 'u1', 1)).toEqual({ activeUnitId: 'u2', roundDelta: 0 })
  })

  it('軌尾順推繞回軌頭並進一輪', () => {
    expect(nextTurnTarget(ids, 'u3', 1)).toEqual({ activeUnitId: 'u1', roundDelta: 1 })
  })

  it('軌頭回退繞到軌尾並退一輪', () => {
    expect(nextTurnTarget(ids, 'u1', -1)).toEqual({ activeUnitId: 'u3', roundDelta: -1 })
  })

  it('行動者不在軌上時落到軌頭、不動 round', () => {
    expect(nextTurnTarget(ids, null, 1)).toEqual({ activeUnitId: 'u1', roundDelta: 0 })
    expect(nextTurnTarget(ids, 'gone', 1)).toEqual({ activeUnitId: 'u1', roundDelta: 0 })
  })

  it('空軌回傳 null', () => {
    expect(nextTurnTarget([], 'u1', 1)).toEqual({ activeUnitId: null, roundDelta: 0 })
  })
})

describe('buildMonsterInstanceName', () => {
  it('第一隻用模板原名', () => {
    expect(buildMonsterInstanceName('哥布林', 0, [])).toBe('哥布林')
  })

  it('之後依既有數量遞增編號', () => {
    expect(buildMonsterInstanceName('哥布林', 2, ['哥布林', '哥布林 2'])).toBe('哥布林 3')
  })

  it('撞名時往後找空號（實例可能被改名或移除）', () => {
    expect(buildMonsterInstanceName('哥布林', 1, ['哥布林 2'])).toBe('哥布林 3')
  })

  it('原名已被占用（如 seed 直接編號）時直接進編號序', () => {
    expect(buildMonsterInstanceName('哥布林', 0, ['哥布林'])).toBe('哥布林 1')
  })
})

describe('resetUnitAfterBattle', () => {
  const combatEnemy = () =>
    createMockBattlefieldUnit({
      faction: 'enemy',
      inCombat: true,
      maxHp: 25,
      hp: { current: 18, tempHp: 4, maxAdjustment: 5 },
      ac: 15,
      acAdjustment: 2,
      speedAdjustment: -10,
      initiative: 12,
      conditions: [{ id: 'c1', key: 'prone', note: null }],
    })

  it('必清：先攻歸 null；敵方退出戰鬥、玩家與中立留場', () => {
    const enemy = resetUnitAfterBattle(combatEnemy(), KEEP_ALL)
    expect(enemy.initiative).toBeNull()
    expect(enemy.inCombat).toBe(false)

    const player = resetUnitAfterBattle(
      createMockBattlefieldUnit({ faction: 'player', inCombat: true, initiative: 9 }),
      KEEP_ALL,
    )
    expect(player.initiative).toBeNull()
    expect(player.inCombat).toBe(true)
  })

  it('全保留時 HP／狀態／調整值不動', () => {
    const next = resetUnitAfterBattle(combatEnemy(), KEEP_ALL)
    expect(next.hp).toEqual({ current: 18, tempHp: 4, maxAdjustment: 5 })
    expect(next.conditions).toHaveLength(1)
    expect(next.acAdjustment).toBe(2)
    expect(next.speedAdjustment).toBe(-10)
  })

  it('取消保留當前 HP＝回復滿血（含調整上限）；取消臨時 HP＝清空；取消狀態＝全移除', () => {
    const next = resetUnitAfterBattle(combatEnemy(), {
      ...KEEP_ALL,
      keepCurrentHp: false,
      keepTempHp: false,
      keepConditions: false,
    })
    expect(next.hp.current).toBe(30) // maxHp 25 + maxAdjustment 5
    expect(next.hp.tempHp).toBe(0)
    expect(next.conditions).toEqual([])
  })

  it('取消保留調整值＝三個調整值歸零，且先重置上限再滿血（不吃已調上限）', () => {
    const next = resetUnitAfterBattle(combatEnemy(), {
      ...KEEP_ALL,
      keepAdjustments: false,
      keepCurrentHp: false,
    })
    expect(next.acAdjustment).toBe(0)
    expect(next.hp.maxAdjustment).toBe(0)
    expect(next.speedAdjustment).toBe(0)
    expect(next.hp.current).toBe(25) // 回快照基準 maxHp，而非 30
  })

  it('保留當前 HP 但重置調整值時，當前 HP clamp 回快照上限', () => {
    const overhealed = createMockBattlefieldUnit({
      faction: 'player',
      inCombat: true,
      maxHp: 25,
      hp: { current: 30, tempHp: 0, maxAdjustment: 5 },
    })
    const next = resetUnitAfterBattle(overhealed, { ...KEEP_ALL, keepAdjustments: false })
    expect(next.hp.current).toBe(25)
  })

  it('未參戰單位不套保留項（僅清先攻）', () => {
    const bench = createMockBattlefieldUnit({
      inCombat: false,
      maxHp: 10,
      hp: { current: 4, tempHp: 0, maxAdjustment: 0 },
      initiative: 7,
    })
    const next = resetUnitAfterBattle(bench, { ...KEEP_ALL, keepCurrentHp: false })
    expect(next.initiative).toBeNull()
    expect(next.hp.current).toBe(4)
  })
})

describe('combatantsOf / rosterOf', () => {
  it('參戰依 sortOrder 排序、未參戰進 roster', () => {
    const a = createMockBattlefieldUnit({ inCombat: true, sortOrder: 2 })
    const b = createMockBattlefieldUnit({ inCombat: false })
    const c = createMockBattlefieldUnit({ inCombat: true, sortOrder: 0 })
    expect(combatantsOf([a, b, c]).map((u) => u.id)).toEqual([c.id, a.id])
    expect(rosterOf([a, b, c]).map((u) => u.id)).toEqual([b.id])
  })
})

describe('formatCharacterTitle', () => {
  const labels: Partial<Record<ClassKey, string>> = { fighter: '戰士', rogue: '盜賊' }
  const labelOf = (key: ClassKey) => labels[key] ?? key
  const classes: ClassEntry[] = [
    { classKey: 'fighter', level: 3, subclass: null },
    { classKey: 'rogue', level: 2, subclass: null },
  ]

  it('組「種族 主職業 Lv.總等級」；主職業取第一個 entry、等級為總和', () => {
    expect(formatCharacterTitle('人類', classes, labelOf)).toBe('人類 戰士 Lv.5')
  })

  it('race 為 null 略過種族段', () => {
    expect(formatCharacterTitle(null, classes, labelOf)).toBe('戰士 Lv.5')
  })

  it('classes 為空略過職業與等級段', () => {
    expect(formatCharacterTitle('人類', [], labelOf)).toBe('人類')
  })

  it('皆缺回空字串', () => {
    expect(formatCharacterTitle(null, [], labelOf)).toBe('')
  })
})

describe('formatChallengeRating', () => {
  it('存原始字串、UI 冠 "CR "；null 回空字串', () => {
    expect(formatChallengeRating('1/2')).toBe('CR 1/2')
    expect(formatChallengeRating('5')).toBe('CR 5')
    expect(formatChallengeRating(null)).toBe('')
  })
})

describe('speedDisplay', () => {
  it('有效速度＝快照＋調整加單位（夾 0）、快照未知則 em dash', () => {
    expect(speedDisplay({ speed: 30, speedAdjustment: 0 }, '呎')).toBe('30 呎')
    expect(speedDisplay({ speed: 30, speedAdjustment: 10 }, '呎')).toBe('40 呎')
    expect(speedDisplay({ speed: 30, speedAdjustment: -99 }, '呎')).toBe('0 呎')
    expect(speedDisplay({ speed: null, speedAdjustment: 0 }, '呎')).toBe('—')
  })
})

describe('resetUnitAfterBattle — 死亡豁免', () => {
  const downed = () =>
    createMockBattlefieldUnit({
      inCombat: true,
      maxHp: 20,
      hp: { current: 0, tempHp: 0, maxAdjustment: 0 },
      deathSaves: { successes: 2, failures: 1 },
    })

  it('回復滿血（不保留當前 HP）時死亡豁免歸零', () => {
    const next = resetUnitAfterBattle(downed(), { ...KEEP_ALL, keepCurrentHp: false })
    expect(next.hp.current).toBe(20)
    expect(next.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('保留當前 HP 且仍為 0 時計數保留', () => {
    const next = resetUnitAfterBattle(downed(), KEEP_ALL)
    expect(next.hp.current).toBe(0)
    expect(next.deathSaves).toEqual({ successes: 2, failures: 1 })
  })
})
