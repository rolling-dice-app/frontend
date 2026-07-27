import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBattlefieldDiceRolls } from '~/composables/domain/useBattlefieldDiceRolls'
import { useBattlefieldStore } from '~/stores/battlefield'
import type { BattlefieldUnit } from '@rolling-dice-app/core'
import { createMockBattlefieldDTO, createMockBattlefieldUnit } from '~/tests/fixtures/battlefield'

// 隨機來源全 mock；resolveDeathSaveRoll 為純函式走真實實作
vi.mock('~/helpers/dice', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/helpers/dice')>()),
  rollD20: vi.fn(),
  rollDamageLines: vi.fn(),
  rollDie: vi.fn(() => 15),
}))

const { rollD20, rollDamageLines } = await import('~/helpers/dice')

const SEED_BF_ID = 'test-bf-1'

/** 直接 seed store cache（本 spec 只驗擲骰編排，不經 API 載入） */
const buildSeedUnits = (): BattlefieldUnit[] => [
  createMockBattlefieldUnit({
    id: 'mock-u-g1',
    kind: 'monster',
    faction: 'enemy',
    name: '哥布林 1',
    inCombat: true,
    attacks: [
      {
        id: 'atk-1',
        name: '彎刀',
        hitBonus: 4,
        damageDice: [{ id: 'dd-1', dieType: 6, count: 1, bonus: 2, damageType: 'slashing' }],
        comment: null,
      },
    ],
    skills: { stealth: 6 },
  }),
  createMockBattlefieldUnit({
    id: 'mock-u-g2',
    kind: 'monster',
    faction: 'enemy',
    name: '哥布林 2',
    inCombat: true,
  }),
  createMockBattlefieldUnit({
    id: 'mock-u-g3',
    kind: 'monster',
    faction: 'enemy',
    name: '哥布林 3',
    inCombat: true,
  }),
  createMockBattlefieldUnit({
    id: 'mock-u-boss',
    kind: 'monster',
    faction: 'enemy',
    name: '哥布林首領',
    inCombat: true,
    initiativeBonus: 2,
  }),
  createMockBattlefieldUnit({
    id: 'mock-u-luna',
    kind: 'character',
    faction: 'player',
    name: '露娜',
    inCombat: true,
    maxHp: 12,
  }),
  createMockBattlefieldUnit({
    id: 'mock-u-thorin',
    kind: 'character',
    faction: 'player',
    name: '索林',
    inCombat: true,
    initiativeBonus: 0,
  }),
]

const setup = async () => {
  const store = useBattlefieldStore()
  store.battlefieldCache.set(
    SEED_BF_ID,
    createMockBattlefieldDTO({ id: SEED_BF_ID, units: buildSeedUnits() }),
  )
  const battlefield = store.getBattlefieldById(SEED_BF_ID)
  if (!battlefield) throw new Error('seed battlefield missing')
  const diceRolls = useBattlefieldDiceRolls(SEED_BF_ID)
  const unitOf = (unitId: string): BattlefieldUnit => {
    const found = battlefield.units.find((u) => u.id === unitId)
    if (!found) throw new Error(`unit missing: ${unitId}`)
    return found
  }
  // log 為 per-call state：直接以 composable 回傳的 entries 斷言
  return { store, battlefield, diceRolls, log: { entries: diceRolls.entries }, unitOf }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(rollD20).mockReset()
  vi.mocked(rollDamageLines).mockReset()
})

describe('useBattlefieldDiceRolls — 攻擊與技能', () => {
  it('rollAttackHit push attack-hit：unitName、modifier=hitBonus、total 正確', async () => {
    const { diceRolls, log, unitOf } = await setup()
    vi.mocked(rollD20).mockReturnValueOnce({ rolls: [12], chosen: 12 })
    const g1 = unitOf('mock-u-g1')
    diceRolls.rollAttackHit(g1, g1.attacks[0]!, 'normal')
    expect(log.entries.value[0]).toMatchObject({
      kind: 'attack-hit',
      unitName: '哥布林 1',
      label: '彎刀命中',
      modifier: 4,
      total: 16,
      isCritical: false,
      isFumble: false,
    })
  })

  it('rollAttackHit 自然 20 / 1 標記 critical / fumble', async () => {
    const { diceRolls, log, unitOf } = await setup()
    const g1 = unitOf('mock-u-g1')
    vi.mocked(rollD20).mockReturnValueOnce({ rolls: [20, 3], chosen: 20 })
    diceRolls.rollAttackHit(g1, g1.attacks[0]!, 'advantage')
    expect(log.entries.value[0]).toMatchObject({ isCritical: true, mode: 'advantage' })
  })

  it('rollAttackDamage 委派 rollDamageLines 並 push 總計；空行不 push', async () => {
    const { diceRolls, log, unitOf } = await setup()
    const g1 = unitOf('mock-u-g1')
    vi.mocked(rollDamageLines).mockReturnValueOnce([
      { rolls: [4], sides: 6, count: 1, bonus: 2, damageType: 'slashing', subtotal: 6 },
    ])
    diceRolls.rollAttackDamage(g1, g1.attacks[0]!, false)
    expect(rollDamageLines).toHaveBeenCalledWith(g1.attacks[0]!.damageDice, false)
    expect(log.entries.value[0]).toMatchObject({
      kind: 'attack-damage',
      unitName: '哥布林 1',
      label: '彎刀傷害',
      total: 6,
      isCritical: false,
    })

    vi.mocked(rollDamageLines).mockReturnValueOnce([])
    diceRolls.rollAttackDamage(g1, g1.attacks[0]!, true)
    expect(log.entries.value).toHaveLength(1)
  })

  it('rollSkill 用 skills 快照加值；未列技能視為 0', async () => {
    const { diceRolls, log, unitOf } = await setup()
    const g1 = unitOf('mock-u-g1')
    vi.mocked(rollD20).mockReturnValue({ rolls: [10], chosen: 10 })
    diceRolls.rollSkill(g1, 'stealth', 'normal')
    expect(log.entries.value[0]).toMatchObject({
      kind: 'skill',
      unitName: '哥布林 1',
      label: '隱匿',
      modifier: 6,
      total: 16,
    })
    diceRolls.rollSkill(g1, 'athletics', 'normal')
    expect(log.entries.value[0]).toMatchObject({ modifier: 0, total: 10 })
  })
})

describe('useBattlefieldDiceRolls — 死亡豁免', () => {
  const downLuna = async () => {
    const context = await setup()
    context.store.applyDamage(SEED_BF_ID, 'mock-u-luna', 999)
    return { ...context, luna: context.unitOf('mock-u-luna') }
  }

  it('≥10 成功 +1；<10 失敗 +1；皆 push saving-throw entry', async () => {
    const { diceRolls, log, luna } = await downLuna()
    vi.mocked(rollD20).mockReturnValueOnce({ rolls: [12], chosen: 12 })
    diceRolls.rollDeathSave(luna)
    expect(luna.deathSaves).toEqual({ successes: 1, failures: 0 })
    vi.mocked(rollD20).mockReturnValueOnce({ rolls: [5], chosen: 5 })
    diceRolls.rollDeathSave(luna)
    expect(luna.deathSaves).toEqual({ successes: 1, failures: 1 })
    expect(log.entries.value[0]).toMatchObject({
      kind: 'saving-throw',
      unitName: '露娜',
      label: '死亡豁免',
    })
  })

  it('自然 1 失敗 +2 並 clamp 3', async () => {
    const { diceRolls, luna, store } = await downLuna()
    store.setDeathSaveFailures(SEED_BF_ID, luna.id, 2)
    vi.mocked(rollD20).mockReturnValueOnce({ rolls: [1], chosen: 1 })
    diceRolls.rollDeathSave(luna)
    expect(luna.deathSaves.failures).toBe(3)
  })

  it('自然 20 回復 1 HP，計數連動歸零', async () => {
    const { diceRolls, luna, store } = await downLuna()
    store.setDeathSaveSuccesses(SEED_BF_ID, luna.id, 2)
    vi.mocked(rollD20).mockReturnValueOnce({ rolls: [20], chosen: 20 })
    diceRolls.rollDeathSave(luna)
    expect(luna.hp.current).toBe(1)
    expect(luna.deathSaves).toEqual({ successes: 0, failures: 0 })
  })
})

describe('useBattlefieldDiceRolls — 先攻', () => {
  it('rollUnitInitiative 進 log 並回傳結果供 toast', async () => {
    const { diceRolls, log, unitOf } = await setup()
    const thorin = unitOf('mock-u-thorin')
    const result = diceRolls.rollUnitInitiative(thorin)
    expect(result).toEqual({ roll: 15, total: 15 })
    expect(log.entries.value[0]).toMatchObject({
      kind: 'initiative',
      unitName: '索林',
      label: '先攻',
      modifier: 0,
      total: 15,
    })
  })

  it('rollEnemiesInitiative 逐筆進 log 並回傳結果陣列', async () => {
    const { diceRolls, log } = await setup()
    const results = diceRolls.rollEnemiesInitiative()
    expect(results).toHaveLength(4)
    expect(log.entries.value).toHaveLength(4)
    expect(log.entries.value.every((entry) => entry.kind === 'initiative')).toBe(true)
    expect(log.entries.value.map((entry) => entry.unitName)).toContain('哥布林首領')
  })
})

describe('useBattlefieldDiceRolls — log 生命週期', () => {
  it('每次呼叫建立獨立 log（per-call state）；clearLog 清空', async () => {
    const { diceRolls, unitOf } = await setup()
    const other = useBattlefieldDiceRolls(SEED_BF_ID)
    const g1 = unitOf('mock-u-g1')
    vi.mocked(rollD20).mockReturnValue({ rolls: [12], chosen: 12 })
    diceRolls.rollAttackHit(g1, g1.attacks[0]!, 'normal')
    expect(diceRolls.entries.value).toHaveLength(1)
    expect(other.entries.value).toHaveLength(0)
    diceRolls.clearLog()
    expect(diceRolls.entries.value).toHaveLength(0)
  })
})
