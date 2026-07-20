import { describe, expect, it, vi } from 'vitest'
import type { ClassEntry, ClassKey } from '@rolling-dice-app/core'
import {
  applyDamageToHp,
  applyHealToHp,
  buildMonsterInstanceName,
  combatantsOf,
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

describe('applyDamageToHp', () => {
  it('臨時 HP 先扣，剩餘才扣當前 HP', () => {
    const unit = createMockBattlefieldUnit({ maxHp: 27, currentHp: 12, tempHp: 5 })
    expect(applyDamageToHp(unit, 6)).toEqual({ currentHp: 11, tempHp: 0 })
  })

  it('傷害小於臨時 HP 時當前 HP 不動', () => {
    const unit = createMockBattlefieldUnit({ maxHp: 27, currentHp: 12, tempHp: 5 })
    expect(applyDamageToHp(unit, 3)).toEqual({ currentHp: 12, tempHp: 2 })
  })

  it('當前 HP 下限 0，不出現負值', () => {
    const unit = createMockBattlefieldUnit({ maxHp: 7, currentHp: 3 })
    expect(applyDamageToHp(unit, 99)).toEqual({ currentHp: 0, tempHp: 0 })
  })

  it('amount <= 0 為 no-op', () => {
    const unit = createMockBattlefieldUnit({ maxHp: 10, currentHp: 8, tempHp: 2 })
    expect(applyDamageToHp(unit, 0)).toEqual({ currentHp: 8, tempHp: 2 })
    expect(applyDamageToHp(unit, -5)).toEqual({ currentHp: 8, tempHp: 2 })
  })
})

describe('applyHealToHp', () => {
  it('回復上限為 maxHp，且不影響臨時 HP', () => {
    const unit = createMockBattlefieldUnit({ maxHp: 20, currentHp: 15, tempHp: 3 })
    expect(applyHealToHp(unit, 99)).toEqual({ currentHp: 20, tempHp: 3 })
  })

  it('amount <= 0 為 no-op', () => {
    const unit = createMockBattlefieldUnit({ maxHp: 20, currentHp: 15 })
    expect(applyHealToHp(unit, 0)).toEqual({ currentHp: 15, tempHp: 0 })
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
      maxHp: 30,
      baseMaxHp: 25,
      currentHp: 18,
      tempHp: 4,
      currentAc: 17,
      baseAc: 15,
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
    expect(next.currentHp).toBe(18)
    expect(next.tempHp).toBe(4)
    expect(next.conditions).toHaveLength(1)
    expect(next.currentAc).toBe(17)
    expect(next.maxHp).toBe(30)
  })

  it('取消保留當前 HP＝回復滿血；取消臨時 HP＝清空；取消狀態＝全移除', () => {
    const next = resetUnitAfterBattle(combatEnemy(), {
      ...KEEP_ALL,
      keepCurrentHp: false,
      keepTempHp: false,
      keepConditions: false,
    })
    expect(next.currentHp).toBe(next.maxHp)
    expect(next.tempHp).toBe(0)
    expect(next.conditions).toEqual([])
  })

  it('取消保留調整值＝AC／最大 HP 回快照基準，且先重置上限再滿血', () => {
    const next = resetUnitAfterBattle(combatEnemy(), {
      ...KEEP_ALL,
      keepAdjustments: false,
      keepCurrentHp: false,
    })
    expect(next.currentAc).toBe(15)
    expect(next.maxHp).toBe(25)
    expect(next.currentHp).toBe(25)
  })

  it('未參戰單位不套保留項（僅清先攻）', () => {
    const bench = createMockBattlefieldUnit({
      inCombat: false,
      maxHp: 10,
      currentHp: 4,
      initiative: 7,
    })
    const next = resetUnitAfterBattle(bench, { ...KEEP_ALL, keepCurrentHp: false })
    expect(next.initiative).toBeNull()
    expect(next.currentHp).toBe(4)
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

describe('speedDisplay', () => {
  it('角色數值加單位、怪物字串原樣、皆無則 em dash', () => {
    expect(speedDisplay({ speedValue: 30, speedText: null }, '呎')).toBe('30 呎')
    expect(speedDisplay({ speedValue: null, speedText: '30 ft., fly 60 ft.' }, '呎')).toBe(
      '30 ft., fly 60 ft.',
    )
    expect(speedDisplay({ speedValue: null, speedText: null }, '呎')).toBe('—')
  })
})
