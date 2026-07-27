import type { BattlefieldDTO, BattlefieldUnit } from '@rolling-dice-app/core'
import type {
  BattlefieldMemberSource,
  BattlefieldTemplateSource,
} from '~/types/business/battlefield'

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
    challengeRating: null,
    race: null,
    classes: [],
    maxHp,
    hp: { current: maxHp, tempHp: 0, maxAdjustment: 0 },
    deathSaves: { successes: 0, failures: 0 },
    ac: 12,
    acAdjustment: 0,
    speed: 30,
    speedAdjustment: 0,
    attacks: [],
    skills: {},
    initiativeBonus: 0,
    initiative: null,
    sortOrder: 0,
    conditions: [],
    inCombat: false,
    ...overrides,
  }
}

/** 建立測試用戰場 DTO；預設第 1 場、round 1、無單位 */
export function createMockBattlefieldDTO(overrides: Partial<BattlefieldDTO> = {}): BattlefieldDTO {
  fixtureIdCounter += 1
  return {
    id: `fixture-bf-${fixtureIdCounter}`,
    sessionId: `fixture-session-${fixtureIdCounter}`,
    containerId: `fixture-container-${fixtureIdCounter}`,
    battleSequence: 1,
    round: 1,
    activeUnitId: null,
    inProgress: true,
    units: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

/** 建立測試用可用成員快照來源 */
export function createMockMemberSource(
  overrides: Partial<Extract<BattlefieldMemberSource, { available: true }>> = {},
): Extract<BattlefieldMemberSource, { available: true }> {
  fixtureIdCounter += 1
  return {
    memberId: `fixture-member-${fixtureIdCounter}`,
    shareId: `chs_fixture_${fixtureIdCounter}`,
    playerName: `玩家 ${fixtureIdCounter}`,
    available: true,
    name: `角色 ${fixtureIdCounter}`,
    race: null,
    classes: [],
    maxHp: 20,
    ac: 14,
    speed: 30,
    totalInitiative: 2,
    attacks: [],
    skills: {},
    ...overrides,
  }
}

/** 建立測試用怪物模板來源（summary 投影） */
export function createMockTemplateSource(
  overrides: Partial<BattlefieldTemplateSource> = {},
): BattlefieldTemplateSource {
  fixtureIdCounter += 1
  return {
    id: `fixture-tpl-${fixtureIdCounter}`,
    name: `模板 ${fixtureIdCounter}`,
    challengeRating: null,
    hp: 10,
    ac: 12,
    ...overrides,
  }
}
