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
  resetUnitToSnapshotBaseline,
  rosterOf,
  sortCombatantsByInitiative,
  speedDisplay,
} from '~/helpers/battlefield'
import { calculateTotalLevel } from '~/helpers/character'
import { createMockBattlefieldUnit } from '~/tests/fixtures/battlefield'

// formatCharacterTitle 內部走 auto-import 呼叫 calculateTotalLevel
vi.stubGlobal('calculateTotalLevel', calculateTotalLevel)

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

  it('先攻平手時依 initiativeBonus 降冪（第二層 tie-break）', () => {
    const a = createMockBattlefieldUnit({ name: 'a', initiative: 15, initiativeBonus: 1 })
    const b = createMockBattlefieldUnit({ name: 'b', initiative: 15, initiativeBonus: 4 })
    const c = createMockBattlefieldUnit({ name: 'c', initiative: 15, initiativeBonus: 2 })
    expect(sortCombatantsByInitiative([a, b, c]).map((u) => u.name)).toEqual(['b', 'c', 'a'])
  })

  it('未擲先攻的群組內部亦依 initiativeBonus 排', () => {
    const a = createMockBattlefieldUnit({ name: 'a', initiative: null, initiativeBonus: 0 })
    const b = createMockBattlefieldUnit({ name: 'b', initiative: 20, initiativeBonus: 0 })
    const c = createMockBattlefieldUnit({ name: 'c', initiative: null, initiativeBonus: 3 })
    expect(sortCombatantsByInitiative([a, b, c]).map((u) => u.name)).toEqual(['b', 'c', 'a'])
  })

  it('先攻與加值都相同時維持原相對順序（穩定排序）', () => {
    const a = createMockBattlefieldUnit({ name: 'a', initiative: 15, initiativeBonus: 2 })
    const b = createMockBattlefieldUnit({ name: 'b', initiative: 15, initiativeBonus: 2 })
    expect(sortCombatantsByInitiative([a, b]).map((u) => u.name)).toEqual(['a', 'b'])
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
  const dirtyUnit = (overrides: Parameters<typeof createMockBattlefieldUnit>[0] = {}) =>
    createMockBattlefieldUnit({
      inCombat: true,
      maxHp: 25,
      hp: { current: 18, tempHp: 4, maxAdjustment: 5 },
      ac: 15,
      acAdjustment: 2,
      speedAdjustment: -10,
      initiative: 12,
      conditions: [{ id: 'c1', key: 'prone', note: null }],
      ...overrides,
    })

  it('角色：留在場上、HP／臨時 HP／狀態／調整值全部保留，只清先攻', () => {
    const next = resetUnitAfterBattle(dirtyUnit({ kind: 'character', faction: 'player' }))
    expect(next.inCombat).toBe(true)
    expect(next.initiative).toBeNull()
    expect(next.hp).toEqual({ current: 18, tempHp: 4, maxAdjustment: 5 })
    expect(next.conditions).toHaveLength(1)
    expect(next.acAdjustment).toBe(2)
    expect(next.speedAdjustment).toBe(-10)
  })

  it('怪物：退回牌庫並回到加入時的快照基準', () => {
    const next = resetUnitAfterBattle(dirtyUnit({ kind: 'monster', faction: 'enemy' }))
    expect(next.inCombat).toBe(false)
    expect(next.initiative).toBeNull()
    expect(next.hp).toEqual({ current: 25, tempHp: 0, maxAdjustment: 0 })
    expect(next.conditions).toEqual([])
    expect(next.acAdjustment).toBe(0)
    expect(next.speedAdjustment).toBe(0)
  })

  it('adhoc 比照怪物退場歸零', () => {
    const next = resetUnitAfterBattle(dirtyUnit({ kind: 'adhoc', faction: 'neutral' }))
    expect(next.inCombat).toBe(false)
    expect(next.hp.current).toBe(25)
  })

  it('判斷依 kind 不依 faction：被魅惑而設為玩家陣營的怪物照樣退場歸零', () => {
    const charmed = resetUnitAfterBattle(dirtyUnit({ kind: 'monster', faction: 'player' }))
    expect(charmed.inCombat).toBe(false)
    expect(charmed.hp.current).toBe(25)

    // 反向：設為敵方陣營的角色仍留場保留
    const infiltrator = resetUnitAfterBattle(dirtyUnit({ kind: 'character', faction: 'enemy' }))
    expect(infiltrator.inCombat).toBe(true)
    expect(infiltrator.hp.current).toBe(18)
  })

  it('牌庫裡的怪物一併歸零；牌庫裡的角色維持原狀（僅清先攻）', () => {
    const benchMonster = resetUnitAfterBattle(
      dirtyUnit({
        kind: 'monster',
        inCombat: false,
        hp: { current: 3, tempHp: 0, maxAdjustment: 0 },
      }),
    )
    expect(benchMonster.hp.current).toBe(25)

    const benchCharacter = resetUnitAfterBattle(
      dirtyUnit({
        kind: 'character',
        inCombat: false,
        hp: { current: 3, tempHp: 0, maxAdjustment: 0 },
      }),
    )
    expect(benchCharacter.inCombat).toBe(false)
    expect(benchCharacter.hp.current).toBe(3)
  })

  it('不改動來源物件（含巢狀 hp／conditions）', () => {
    const source = dirtyUnit({ kind: 'monster' })
    resetUnitAfterBattle(source)
    expect(source.hp).toEqual({ current: 18, tempHp: 4, maxAdjustment: 5 })
    expect(source.conditions).toHaveLength(1)
    expect(source.initiative).toBe(12)
  })
})

describe('resetUnitToSnapshotBaseline', () => {
  it('回到加入時的樣子，但不動 inCombat（第 1 場重置用）', () => {
    const unit = createMockBattlefieldUnit({
      kind: 'character',
      inCombat: true,
      maxHp: 30,
      hp: { current: 2, tempHp: 6, maxAdjustment: -5 },
      acAdjustment: 3,
      speedAdjustment: 10,
      initiative: 8,
      conditions: [{ id: 'c1', key: 'poisoned', note: null }],
      deathSaves: { successes: 1, failures: 2 },
    })
    const next = resetUnitToSnapshotBaseline(unit)
    expect(next.inCombat).toBe(true)
    expect(next.hp).toEqual({ current: 30, tempHp: 0, maxAdjustment: 0 })
    expect(next.acAdjustment).toBe(0)
    expect(next.speedAdjustment).toBe(0)
    expect(next.conditions).toEqual([])
    expect(next.deathSaves).toEqual({ successes: 0, failures: 0 })
    expect(next.initiative).toBeNull()
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
  const downed = (kind: 'character' | 'monster') =>
    createMockBattlefieldUnit({
      kind,
      inCombat: true,
      maxHp: 20,
      hp: { current: 0, tempHp: 0, maxAdjustment: 0 },
      deathSaves: { successes: 2, failures: 1 },
    })

  it('角色以 HP 0 結束：HP 與豁免計數都延續到下一場（D-2）', () => {
    const next = resetUnitAfterBattle(downed('character'))
    expect(next.hp.current).toBe(0)
    expect(next.deathSaves).toEqual({ successes: 2, failures: 1 })
  })

  it('怪物退場歸零時豁免計數一併清空', () => {
    const next = resetUnitAfterBattle(downed('monster'))
    expect(next.hp.current).toBe(20)
    expect(next.deathSaves).toEqual({ successes: 0, failures: 0 })
  })
})
