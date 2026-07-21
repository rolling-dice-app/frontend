import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBattlefieldStore } from '~/stores/battlefield'
import type { BattlefieldDTO } from '~/types/business/battlefield'

// 固定骰值讓先攻結果可斷言
vi.mock('~/helpers/dice', () => ({
  rollDie: vi.fn(() => 15),
}))

/** seed 內既有戰場（迷霧沼澤第 3 場） */
const SEED_BF_ID = 'mock-bf-mist-3'

const setup = async () => {
  const store = useBattlefieldStore()
  await store.loadSessionOptions()
  const battlefield = await store.loadBattlefield(SEED_BF_ID)
  if (!battlefield) throw new Error('seed battlefield missing')
  return { store, battlefield }
}

const combatIds = (bf: BattlefieldDTO): string[] =>
  bf.units
    .filter((u) => u.inCombat)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((u) => u.id)

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useBattlefieldStore — seed 與資源', () => {
  it('loadSessionOptions 回傳 mock 團務，battlefieldId 由 cache 推導', async () => {
    const { store } = await setup()
    expect(store.sessionOptions).toHaveLength(3)
    const mist3 = store.sessionOptions.find((o) => o.sessionId === 'mock-session-mist-3')
    expect(mist3?.battlefieldId).toBe(SEED_BF_ID)
    expect(
      store.sessionOptions.filter((o) => o.battlefieldId == null).map((o) => o.sessionId),
    ).toEqual(['mock-session-mist-4', 'mock-session-crown-1'])
  })

  it('loadBattlefield 不存在回傳 null（NotFound 分流）', async () => {
    const store = useBattlefieldStore()
    expect(await store.loadBattlefield('nope')).toBeNull()
  })

  it('createBattlefield 建空戰場並同步入口選項；同團務重複建立回傳既有', async () => {
    const { store } = await setup()
    const created = await store.createBattlefield('mock-session-mist-4')
    expect(created.units).toEqual([])
    expect(created.battleSequence).toBe(1)
    expect(
      store.sessionOptions.find((o) => o.sessionId === 'mock-session-mist-4')?.battlefieldId,
    ).toBe(created.id)
    const again = await store.createBattlefield('mock-session-mist-4')
    expect(again.id).toBe(created.id)
  })

  it('deleteBattlefield 為 hard-delete，入口選項回到可建立', async () => {
    const { store } = await setup()
    await store.deleteBattlefield(SEED_BF_ID)
    expect(store.getBattlefieldById(SEED_BF_ID)).toBeUndefined()
    expect(
      store.sessionOptions.find((o) => o.sessionId === 'mock-session-mist-3')?.battlefieldId,
    ).toBeNull()
  })
})

describe('useBattlefieldStore — 單位建立', () => {
  it('importMember 以滿 HP 快照帶入並直接參戰；重複帶入 no-op', async () => {
    const { store } = await setup()
    const created = await store.createBattlefield('mock-session-mist-4')
    const unit = store.importMember(created.id, 'chs_mock_a1x2')
    expect(unit).toMatchObject({
      kind: 'character',
      faction: 'player',
      name: '艾莉亞',
      title: '',
      race: '人類',
      classes: [{ classKey: 'fighter', level: 5, subclass: null }],
      maxHp: 44,
      currentHp: 44,
      speed: 30,
      speedAdjustment: 0,
      inCombat: true,
    })
    // 首位參戰自動成為行動者
    expect(store.getBattlefieldById(created.id)?.activeUnitId).toBe(unit?.id)
    const again = store.importMember(created.id, 'chs_mock_a1x2')
    expect(again?.id).toBe(unit?.id)
    expect(store.getBattlefieldById(created.id)?.units).toHaveLength(1)
  })

  it('importMember 對快照失敗成員回傳 null', async () => {
    const { store } = await setup()
    expect(store.importMember(SEED_BF_ID, 'chs_mock_e9v0')).toBeNull()
  })

  it('addMonsterInstance 自動編號且直接參戰；速度快照自模板、調整歸零', async () => {
    const { store, battlefield } = await setup()
    // seed 已有哥布林 1〜3
    const fourth = store.addMonsterInstance(SEED_BF_ID, 'mock-tpl-goblin')
    expect(fourth?.name).toBe('哥布林 4')
    expect(fourth?.title).toBe('CR 1/4')
    expect(fourth?.speed).toBe(30)
    expect(fourth?.speedAdjustment).toBe(0)
    // seed 已有一隻首領（原名）
    const secondBoss = store.addMonsterInstance(SEED_BF_ID, 'mock-tpl-boss')
    expect(secondBoss?.name).toBe('哥布林首領 2')
    expect(battlefield.units.filter((u) => u.inCombat)).toContainEqual(
      expect.objectContaining({ id: fourth?.id }),
    )
  })

  it('addMonsterInstance 模板 challengeRating 為 null 時 title 為空字串', async () => {
    const { store } = await setup()
    store.templates.push({
      id: 'mock-tpl-no-cr',
      name: '無名怪',
      challengeRating: null,
      hp: 5,
      ac: 10,
      speed: 30,
      initiativeBonus: 0,
      attacks: [],
      skills: {},
    })
    const unit = store.addMonsterInstance(SEED_BF_ID, 'mock-tpl-no-cr')
    expect(unit?.title).toBe('')
  })

  it('createAdhocUnit 預設中立；joinCombat=false 進可用庫', async () => {
    const { store, battlefield } = await setup()
    const unit = store.createAdhocUnit(
      SEED_BF_ID,
      { name: '  火焰精靈  ', maxHp: 12, ac: 13, speed: 60, initiativeBonus: 2 },
      false,
    )
    expect(unit).toMatchObject({
      kind: 'adhoc',
      faction: 'neutral',
      name: '火焰精靈',
      maxHp: 12,
      currentHp: 12,
      inCombat: false,
    })
    expect(battlefield.units.some((u) => u.id === unit.id)).toBe(true)
  })
})

describe('useBattlefieldStore — 數值', () => {
  it('applyDamage 臨時 HP 先扣；降到 0 回報倒下、再打不重複回報', async () => {
    const { store } = await setup()
    // 露娜 HP 12、臨時 5
    expect(store.applyDamage(SEED_BF_ID, 'mock-u-luna', 6)).toBe(false)
    const luna = store.getBattlefieldById(SEED_BF_ID)?.units.find((u) => u.id === 'mock-u-luna')
    expect(luna).toMatchObject({ currentHp: 11, tempHp: 0 })
    // 哥布林 2 HP 3
    expect(store.applyDamage(SEED_BF_ID, 'mock-u-g2', 5)).toBe(true)
    expect(store.applyDamage(SEED_BF_ID, 'mock-u-g2', 5)).toBe(false)
  })

  it('adjustMaxHp 上調同步加當前 HP、下調只 clamp', async () => {
    const { store } = await setup()
    store.applyDamage(SEED_BF_ID, 'mock-u-aliya', 10) // 44 → 34
    store.adjustMaxHp(SEED_BF_ID, 'mock-u-aliya', 5)
    let aliya = store.getBattlefieldById(SEED_BF_ID)?.units.find((u) => u.id === 'mock-u-aliya')
    expect(aliya).toMatchObject({ maxHp: 49, currentHp: 39 })
    store.adjustMaxHp(SEED_BF_ID, 'mock-u-aliya', -20)
    aliya = store.getBattlefieldById(SEED_BF_ID)?.units.find((u) => u.id === 'mock-u-aliya')
    expect(aliya).toMatchObject({ maxHp: 29, currentHp: 29 })
  })

  it('adjustSpeed 疊加調整值並夾 ±99；速度快照本身不變', async () => {
    const { store } = await setup()
    // 艾莉亞速度快照 30
    store.adjustSpeed(SEED_BF_ID, 'mock-u-aliya', 10)
    let aliya = store.getBattlefieldById(SEED_BF_ID)?.units.find((u) => u.id === 'mock-u-aliya')
    expect(aliya).toMatchObject({ speed: 30, speedAdjustment: 10 })
    store.adjustSpeed(SEED_BF_ID, 'mock-u-aliya', -200)
    aliya = store.getBattlefieldById(SEED_BF_ID)?.units.find((u) => u.id === 'mock-u-aliya')
    expect(aliya).toMatchObject({ speed: 30, speedAdjustment: -99 })
  })

  it('rollInitiative 用 1d20+加值並重排；rollAllEnemyInitiatives 回傳逐筆結果', async () => {
    const { store } = await setup()
    // 索林加值 0、固定骰 15
    const result = store.rollInitiative(SEED_BF_ID, 'mock-u-thorin')
    expect(result).toEqual({ roll: 15, total: 15 })
    const results = store.rollAllEnemyInitiatives(SEED_BF_ID)
    expect(results).toHaveLength(4) // 哥布林 1〜3＋首領
    expect(results).toContainEqual({ unitId: 'mock-u-g1', name: '哥布林 1', roll: 15, total: 17 })
  })
})

describe('useBattlefieldStore — 狀態（conditions）', () => {
  it('addCondition 空白備註正規化為 null；removeCondition 移除指定狀態', async () => {
    const { store } = await setup()
    store.addCondition(SEED_BF_ID, 'mock-u-aliya', 'stunned', '  ')
    const aliya = store.getBattlefieldById(SEED_BF_ID)?.units.find((u) => u.id === 'mock-u-aliya')
    expect(aliya?.conditions).toHaveLength(1)
    expect(aliya?.conditions[0]).toMatchObject({ key: 'stunned', note: null })
    store.removeCondition(SEED_BF_ID, 'mock-u-aliya', aliya!.conditions[0]!.id)
    expect(aliya?.conditions).toHaveLength(0)
  })
})

describe('useBattlefieldStore — 回合狀態機', () => {
  it('stepTurn 順推；軌尾繞回軌頭時進位並回傳新 round', async () => {
    const { store, battlefield } = await setup()
    // seed：g1（行動中）→ 菲恩 → … → g2（軌尾），round 2
    expect(store.stepTurn(SEED_BF_ID, 1)).toBeNull()
    expect(battlefield.activeUnitId).toBe('mock-u-finn')
    battlefield.activeUnitId = 'mock-u-g2'
    expect(store.stepTurn(SEED_BF_ID, 1)).toBe(3)
    expect(battlefield.activeUnitId).toBe('mock-u-g1')
  })

  it('stepTurn 從軌頭回退繞到軌尾並退位，round 下限 1', async () => {
    const { store, battlefield } = await setup()
    expect(store.stepTurn(SEED_BF_ID, -1)).toBeNull() // round 2 → 1，非進位不回報
    expect(battlefield.activeUnitId).toBe('mock-u-g2')
    expect(battlefield.round).toBe(1)
    battlefield.activeUnitId = 'mock-u-g1'
    store.stepTurn(SEED_BF_ID, -1)
    expect(battlefield.round).toBe(1)
  })

  it('leaveCombat 行動中單位退場：行動權交給下一位', async () => {
    const { store, battlefield } = await setup()
    store.leaveCombat(SEED_BF_ID, 'mock-u-g1')
    expect(battlefield.activeUnitId).toBe('mock-u-finn')
    expect(battlefield.units.find((u) => u.id === 'mock-u-g1')?.inCombat).toBe(false)
  })

  it('reorderUnits 依 id 順序重寫 sortOrder；moveUnit 與相鄰互換', async () => {
    const { store, battlefield } = await setup()
    const reversed = [...combatIds(battlefield)].reverse()
    store.reorderUnits(SEED_BF_ID, reversed)
    expect(combatIds(battlefield)).toEqual(reversed)
    const [first, second] = combatIds(battlefield)
    store.moveUnit(SEED_BF_ID, first!, 1)
    expect(combatIds(battlefield).slice(0, 2)).toEqual([second, first])
  })

  it('resetBattle 清參戰先攻與行動者、round 回 1；單位與 HP 不動', async () => {
    const { store, battlefield } = await setup()
    store.resetBattle(SEED_BF_ID)
    expect(battlefield.round).toBe(1)
    expect(battlefield.activeUnitId).toBeNull()
    for (const u of battlefield.units.filter((x) => x.inCombat)) {
      expect(u.initiative).toBeNull()
    }
    expect(battlefield.units.find((u) => u.id === 'mock-u-luna')?.currentHp).toBe(12)
  })
})

describe('useBattlefieldStore — 戰鬥段落', () => {
  it('endBattle：敵方退出（實例保留）、全員先攻清空、inProgress=false', async () => {
    const { store, battlefield } = await setup()
    store.endBattle(SEED_BF_ID, {
      keepCurrentHp: true,
      keepTempHp: true,
      keepConditions: true,
      keepAdjustments: true,
    })
    const bf = store.getBattlefieldById(SEED_BF_ID)!
    expect(bf.inProgress).toBe(false)
    expect(bf.activeUnitId).toBeNull()
    expect(bf.units.filter((u) => u.faction === 'enemy').every((u) => !u.inCombat)).toBe(true)
    expect(bf.units.filter((u) => u.faction === 'enemy')).toHaveLength(4)
    expect(bf.units.every((u) => u.initiative === null)).toBe(true)
    // 玩家與中立留場；HP 依勾選保留
    expect(bf.units.find((u) => u.id === 'mock-u-finn')?.inCombat).toBe(true)
    expect(bf.units.find((u) => u.id === 'mock-u-luna')?.currentHp).toBe(12)
    void battlefield
  })

  it('endBattle 取消保留當前 HP：參戰單位回滿血、未參戰不動', async () => {
    const { store } = await setup()
    store.applyDamage(SEED_BF_ID, 'mock-u-pipo', 6) // 未參戰 16 → 10
    store.endBattle(SEED_BF_ID, {
      keepCurrentHp: false,
      keepTempHp: true,
      keepConditions: true,
      keepAdjustments: true,
    })
    const bf = store.getBattlefieldById(SEED_BF_ID)!
    expect(bf.units.find((u) => u.id === 'mock-u-luna')?.currentHp).toBe(27)
    expect(bf.units.find((u) => u.id === 'mock-u-pipo')?.currentHp).toBe(10)
  })

  it('startNextBattle：場次遞增、round 回 1、恢復進行中', async () => {
    const { store, battlefield } = await setup()
    store.endBattle(SEED_BF_ID, {
      keepCurrentHp: true,
      keepTempHp: true,
      keepConditions: true,
      keepAdjustments: true,
    })
    expect(store.startNextBattle(SEED_BF_ID)).toBe(2)
    expect(battlefield.round).toBe(1)
    expect(battlefield.inProgress).toBe(true)
    expect(battlefield.activeUnitId).toBeNull()
  })
})

describe('useBattlefieldStore — reset', () => {
  it('reset 清空 cache 並允許重新 seed', async () => {
    const { store } = await setup()
    store.reset()
    expect(store.sessionOptions).toHaveLength(0)
    expect(store.getBattlefieldById(SEED_BF_ID)).toBeUndefined()
    await store.loadSessionOptions()
    expect(store.sessionOptions).toHaveLength(3)
  })
})

describe('useBattlefieldStore — 死亡豁免', () => {
  it('setDeathSave* clamp 0..3；HP > 0 時 no-op', async () => {
    const { store, battlefield } = await setup()
    const luna = battlefield.units.find((u) => u.id === 'mock-u-luna')!
    // HP 12 → no-op
    store.setDeathSaveSuccesses(SEED_BF_ID, 'mock-u-luna', 2)
    expect(luna.deathSaves.successes).toBe(0)
    // 打到 0 後可計數並 clamp
    store.applyDamage(SEED_BF_ID, 'mock-u-luna', 999)
    expect(luna.currentHp).toBe(0)
    store.setDeathSaveSuccesses(SEED_BF_ID, 'mock-u-luna', 5)
    expect(luna.deathSaves.successes).toBe(3)
    store.setDeathSaveFailures(SEED_BF_ID, 'mock-u-luna', -1)
    expect(luna.deathSaves.failures).toBe(0)
  })

  it('applyHeal 0 → ≥1 歸零計數；adjustMaxHp 抬升 currentHp 連動歸零', async () => {
    const { store, battlefield } = await setup()
    const luna = battlefield.units.find((u) => u.id === 'mock-u-luna')!
    store.applyDamage(SEED_BF_ID, 'mock-u-luna', 999)
    store.setDeathSaveFailures(SEED_BF_ID, 'mock-u-luna', 2)
    store.applyHeal(SEED_BF_ID, 'mock-u-luna', 1)
    expect(luna.deathSaves).toEqual({ successes: 0, failures: 0 })

    const g2 = battlefield.units.find((u) => u.id === 'mock-u-g2')!
    store.applyDamage(SEED_BF_ID, 'mock-u-g2', 999)
    store.setDeathSaveSuccesses(SEED_BF_ID, 'mock-u-g2', 1)
    store.adjustMaxHp(SEED_BF_ID, 'mock-u-g2', 1) // 上調同步 +1 當前 HP → 站起
    expect(g2.currentHp).toBe(1)
    expect(g2.deathSaves.successes).toBe(0)
  })
})

describe('useBattlefieldStore — 攻擊/技能快照', () => {
  it('importMember 快照 attacks/skills：deep clone 且行內 id 重生', async () => {
    const { store } = await setup()
    const bf = await store.createBattlefield('mock-session-mist-4')
    const created = store.importMember(bf.id, 'chs_mock_a1x2')!
    const source = store.getMemberSources(bf.id).find((m) => m.shareId === 'chs_mock_a1x2')!
    if (!source.available) throw new Error('unexpected unavailable source')
    expect(created.attacks).toHaveLength(1)
    expect(created.attacks[0]).toMatchObject({ name: '長劍', hitBonus: 8 })
    expect(created.attacks[0]!.id).not.toBe(source.attacks[0]!.id)
    expect(created.attacks[0]!.damageDice[0]!.id).not.toBe(source.attacks[0]!.damageDice[0]!.id)
    // deep clone：改單位不回寫來源
    created.attacks[0]!.hitBonus = 99
    created.skills.athletics = 99
    expect(source.attacks[0]!.hitBonus).toBe(8)
    expect(source.skills.athletics).toBe(8)
    expect(created.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('addMonsterInstance 快照模板 attacks/skills；createAdhocUnit 空值起步', async () => {
    const { store, battlefield } = await setup()
    const monster = store.addMonsterInstance(SEED_BF_ID, 'mock-tpl-spider')!
    const template = store.templates.find((tpl) => tpl.id === 'mock-tpl-spider')!
    expect(monster.attacks[0]).toMatchObject({ name: '毒咬', hitBonus: 5 })
    expect(monster.attacks[0]!.damageDice).toHaveLength(2)
    expect(monster.attacks[0]!.id).not.toBe(template.attacks[0]!.id)
    expect(monster.skills).toEqual({ stealth: 7 })
    expect(monster.skills).not.toBe(template.skills)

    const adhoc = store.createAdhocUnit(
      SEED_BF_ID,
      { name: '臨時單位', maxHp: 5, ac: 10, speed: 30, initiativeBonus: 0 },
      false,
    )
    expect(adhoc.attacks).toEqual([])
    expect(adhoc.skills).toEqual({})
    expect(adhoc.deathSaves).toEqual({ successes: 0, failures: 0 })
    expect(battlefield.units).toContainEqual(expect.objectContaining({ id: adhoc.id }))
  })
})
