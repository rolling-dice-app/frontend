import type { BattlefieldUnit } from '~/types/business/battlefield'

let fixtureIdCounter = 0

/** 建立測試用參戰單位；預設為滿血、未參戰的中立 adhoc 單位 */
export function createMockBattlefieldUnit(
  overrides: Partial<BattlefieldUnit> = {},
): BattlefieldUnit {
  fixtureIdCounter += 1
  const maxHp = overrides.maxHp ?? 20
  return {
    id: `fixture-unit-${fixtureIdCounter}`,
    kind: 'adhoc',
    shareId: null,
    templateId: null,
    faction: 'neutral',
    name: `單位 ${fixtureIdCounter}`,
    title: '',
    race: null,
    classes: [],
    maxHp,
    baseMaxHp: overrides.baseMaxHp ?? maxHp,
    currentHp: overrides.currentHp ?? maxHp,
    tempHp: 0,
    baseAc: overrides.baseAc ?? overrides.currentAc ?? 12,
    currentAc: 12,
    speedValue: 30,
    speedText: null,
    initiativeBonus: 0,
    initiative: null,
    sortOrder: 0,
    conditions: [],
    inCombat: false,
    ...overrides,
  }
}
