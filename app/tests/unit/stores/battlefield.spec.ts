import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BATTLEFIELD_LIMITS } from '@rolling-dice-app/core'
import type {
  BattlefieldDTO,
  BattlefieldSessionOption,
  BattlefieldUpdateBody,
  DmSessionLogDTO,
  DmSessionLogUpdateBody,
} from '@rolling-dice-app/core'
import { useBattlefieldStore } from '~/stores/battlefield'
import { createMockBattlefieldDTO, createMockBattlefieldUnit } from '~/tests/fixtures/battlefield'

// 固定骰值讓先攻結果可斷言
vi.mock('~/helpers/dice', () => ({
  rollDie: vi.fn(() => 15),
}))

/** duck-type FetchError（store 以 isFetchError 的 statusCode 形狀判斷） */
const fetchError = (statusCode: number, code: string): Error =>
  Object.assign(new Error(`http ${statusCode}`), {
    statusCode,
    data: { error: code },
  })

// api factories 與 fetch-error utils 走 Nuxt auto-import；測試以 stubGlobal 供給
// （utils/api-fetch 的真實實作 import ofetch，vitest 解析不到，故以同形狀 stub 取代）
vi.stubGlobal('isFetchError', (err: unknown): boolean => {
  if (typeof err !== 'object' || err === null) return false
  return 'statusCode' in err || 'response' in err
})
vi.stubGlobal('apiErrorCodeOf', (err: unknown): string | undefined => {
  const data = (err as { data?: { error?: unknown } } | null)?.data
  return typeof data?.error === 'string' ? data.error : undefined
})

// ── fake backend（/battlefields）──────────────────────────────────────────────
const server = vi.hoisted(() => {
  let stamp = 0
  return {
    battlefields: new Map<string, BattlefieldDTO>(),
    /** 比照 backend：場次遞增時拍照，每戰場只留最新一份 */
    snapshots: new Map<
      string,
      Pick<BattlefieldDTO, 'battleSequence' | 'round' | 'activeUnitId' | 'units'>
    >(),
    options: [] as BattlefieldSessionOption[],
    updateBodies: [] as BattlefieldUpdateBody[],
    restoreCalls: [] as string[],
    nextUpdateError: null as unknown,
    nextGetError: null as unknown,
    nextRestoreError: null as unknown,
    createCounter: 0,
    nextStamp(): string {
      stamp += 1
      return new Date(1750000000000 + stamp * 1000).toISOString()
    },
    reset(): void {
      this.battlefields.clear()
      this.snapshots.clear()
      this.options = []
      this.updateBodies = []
      this.restoreCalls = []
      this.nextUpdateError = null
      this.nextGetError = null
      this.nextRestoreError = null
      this.createCounter = 0
      stamp = 0
    },
  }
})

vi.stubGlobal('battlefields', () => ({
  sessionOptions: async () => structuredClone(server.options),
  get: async (id: string) => {
    if (server.nextGetError) {
      const err = server.nextGetError
      server.nextGetError = null
      throw err
    }
    const bf = server.battlefields.get(id)
    if (!bf) throw fetchError(404, 'BATTLEFIELD_NOT_FOUND')
    return structuredClone(bf)
  },
  create: async (body: { sessionId: string }) => {
    if ([...server.battlefields.values()].some((bf) => bf.sessionId === body.sessionId))
      throw fetchError(409, 'BATTLEFIELD_ALREADY_EXISTS')
    server.createCounter += 1
    const now = server.nextStamp()
    const bf: BattlefieldDTO = {
      id: `srv-bf-${server.createCounter}`,
      sessionId: body.sessionId,
      containerId: `container-of-${body.sessionId}`,
      battleSequence: 1,
      round: 1,
      activeUnitId: null,
      inProgress: true,
      units: [],
      createdAt: now,
      updatedAt: now,
    }
    server.battlefields.set(bf.id, bf)
    return structuredClone(bf)
  },
  update: async (id: string, body: BattlefieldUpdateBody) => {
    server.updateBodies.push(structuredClone(body))
    if (server.nextUpdateError) {
      const err = server.nextUpdateError
      server.nextUpdateError = null
      throw err
    }
    const bf = server.battlefields.get(id)
    if (!bf) throw fetchError(404, 'BATTLEFIELD_NOT_FOUND')
    if (body.updatedAt !== bf.updatedAt) throw fetchError(409, 'STALE_BATTLEFIELD_VERSION')
    const prevSequence = bf.battleSequence
    const { updatedAt: _token, ...rest } = body
    Object.assign(bf, structuredClone(rest))
    bf.updatedAt = server.nextStamp()
    if (bf.battleSequence > prevSequence) {
      server.snapshots.set(id, {
        battleSequence: bf.battleSequence,
        round: bf.round,
        activeUnitId: bf.activeUnitId,
        units: structuredClone(bf.units),
      })
    }
  },
  restore: async (id: string, body: { updatedAt: string }) => {
    server.restoreCalls.push(id)
    if (server.nextRestoreError) {
      const err = server.nextRestoreError
      server.nextRestoreError = null
      throw err
    }
    const bf = server.battlefields.get(id)
    if (!bf) throw fetchError(404, 'BATTLEFIELD_NOT_FOUND')
    if (body.updatedAt !== bf.updatedAt) throw fetchError(409, 'STALE_BATTLEFIELD_VERSION')
    const snapshot = server.snapshots.get(id)
    if (!snapshot || snapshot.battleSequence !== bf.battleSequence)
      throw fetchError(404, 'BATTLEFIELD_SNAPSHOT_NOT_FOUND')
    bf.round = snapshot.round
    bf.activeUnitId = snapshot.activeUnitId
    bf.units = structuredClone(snapshot.units)
    bf.updatedAt = server.nextStamp()
    return structuredClone(bf)
  },
  remove: async (id: string) => {
    server.battlefields.delete(id)
    server.snapshots.delete(id)
  },
}))

// ── fake dm-session（成員名單）與 share ───────────────────────────────────────
const dmServer = vi.hoisted(() => ({
  log: null as DmSessionLogDTO | null,
  getLogCalls: 0,
  updateLogBodies: [] as DmSessionLogUpdateBody[],
  nextUpdateError: null as unknown,
  reset(): void {
    this.log = null
    this.getLogCalls = 0
    this.updateLogBodies = []
    this.nextUpdateError = null
  },
}))

vi.stubGlobal('dmSessionContainers', () => ({
  getLog: async () => {
    dmServer.getLogCalls += 1
    if (!dmServer.log) throw new Error('dm log not seeded')
    return structuredClone(dmServer.log)
  },
  updateLog: async (_containerId: string, _logId: string, body: DmSessionLogUpdateBody) => {
    dmServer.updateLogBodies.push(structuredClone(body))
    if (dmServer.nextUpdateError) {
      const err = dmServer.nextUpdateError
      dmServer.nextUpdateError = null
      throw err
    }
  },
}))

const shareServer = vi.hoisted(() => ({
  characters: new Map<string, unknown>(),
  reset(): void {
    this.characters.clear()
  },
}))

vi.stubGlobal('share', () => ({
  getCharacter: async (shareId: string) => {
    const found = shareServer.characters.get(shareId)
    if (!found) throw Object.assign(new Error('http 404'), { statusCode: 404 })
    return structuredClone(found)
  },
}))

// 衍生管線另行於 battlefield-snapshot.spec 驗證；此處以 passthrough builder 隔離 store 邏輯
vi.mock('~/helpers/battlefield-snapshot', () => ({
  buildBattlefieldMemberSource: (
    member: { id: string; playerName: string },
    shareId: string,
    character: Record<string, unknown>,
  ) => ({
    memberId: member.id,
    shareId,
    playerName: member.playerName,
    available: true,
    name: character.name,
    race: character.race ?? null,
    classes: character.classes ?? [],
    maxHp: character.maxHp ?? 20,
    ac: character.ac ?? 14,
    speed: character.speed ?? 30,
    totalInitiative: character.totalInitiative ?? 2,
    attacks: character.attacks ?? [],
    skills: character.skills ?? {},
  }),
}))

// ── fake monster-template store ───────────────────────────────────────────────
const monsterStore = vi.hoisted(() => ({
  list: [] as {
    id: string
    name: string
    challengeRating: string | null
    ac: number
    hp: number
  }[],
  details: new Map<string, unknown>(),
  loadDetailCalls: 0,
  reset(): void {
    this.list = []
    this.details.clear()
    this.loadDetailCalls = 0
  },
}))

vi.mock('~/stores/monster-template', () => ({
  useMonsterTemplateStore: () => ({
    list: monsterStore.list,
    getById: (id: string) => monsterStore.details.get(id),
    loadDetail: async (id: string) => {
      monsterStore.loadDetailCalls += 1
      const template = monsterStore.details.get(id)
      if (!template) throw fetchError(404, 'MONSTER_TEMPLATE_NOT_FOUND')
      return template
    },
  }),
}))

// ── 測試資料 ─────────────────────────────────────────────────────────────────
const seedOption = (
  overrides: Partial<BattlefieldSessionOption> = {},
): BattlefieldSessionOption => ({
  sessionId: 'session-1',
  containerId: 'container-1',
  containerTitle: '迷霧沼澤',
  sessionTitle: '第 3 團',
  date: '2026-07-01',
  memberCount: 2,
  battlefieldId: null,
  ...overrides,
})

const GOBLIN_TEMPLATE = {
  id: 'tpl-goblin',
  name: '哥布林',
  challengeRating: '1/4',
  ac: 15,
  hp: 7,
  speed: 30,
  initiativeBonus: 2,
  attacks: [
    {
      id: 'tpl-atk-1',
      name: '彎刀',
      hitBonus: 4,
      damageDice: [{ id: 'tpl-dd-1', dieType: 6, count: 1, bonus: 2, damageType: 'slashing' }],
      comment: null,
    },
  ],
  skills: { stealth: 6 },
}

const seedDmLog = (): void => {
  dmServer.log = {
    id: 'session-1',
    containerId: 'container-1',
    title: '第 3 團',
    date: '2026-07-01',
    content: '',
    members: [
      {
        id: 'member-a',
        playerName: '玩家A',
        character: {
          shareId: 'chs_available',
          available: true,
          name: '艾莉亞',
          avatar: null,
          ownerDisplayName: '玩家A',
        },
      },
      {
        id: 'member-b',
        playerName: '玩家B',
        character: {
          shareId: 'chs_broken',
          available: false,
          name: null,
          avatar: null,
          ownerDisplayName: null,
        },
      },
      { id: 'member-c', playerName: '純PL', character: null },
    ],
    moneyRewards: [],
    expRewards: '',
    itemRewards: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  } as unknown as DmSessionLogDTO
  shareServer.characters.set('chs_available', {
    character: {
      name: '艾莉亞',
      race: '人類',
      classes: [{ classKey: 'fighter', level: 5, subclass: null }],
      maxHp: 44,
      attacks: [
        {
          id: 'src-atk-1',
          name: '長劍',
          hitBonus: 8,
          damageDice: [{ id: 'src-dd-1', dieType: 8, count: 1, bonus: 4, damageType: 'slashing' }],
          comment: null,
        },
      ],
      skills: { athletics: 8 },
    },
  })
}

/** 建戰場（經 fake backend）＋載入進 cache */
const setupBattlefield = async () => {
  const store = useBattlefieldStore()
  server.options = [seedOption()]
  await store.loadSessionOptions()
  const created = await store.createBattlefield('session-1')
  return { store, battlefieldId: created.id }
}

beforeEach(() => {
  setActivePinia(createPinia())
  server.reset()
  dmServer.reset()
  shareServer.reset()
  monsterStore.reset()
})

describe('useBattlefieldStore — 資源', () => {
  it('loadSessionOptions 抓 API 選項', async () => {
    const store = useBattlefieldStore()
    server.options = [seedOption(), seedOption({ sessionId: 'session-2', battlefieldId: 'bf-x' })]
    await store.loadSessionOptions()
    expect(store.sessionOptions).toHaveLength(2)
    expect(store.listLoaded).toBe(true)
  })

  it('loadBattlefield 404 回傳 null（NotFound 分流）、其他錯誤設 detailError 後上拋', async () => {
    const store = useBattlefieldStore()
    expect(await store.loadBattlefield('nope')).toBeNull()
    expect(store.detailError).toBeNull()

    server.nextGetError = fetchError(500, 'INTERNAL')
    await expect(store.loadBattlefield('nope')).rejects.toThrow()
    expect(store.detailError).not.toBeNull()
  })

  it('createBattlefield POST 進 cache 並同步入口選項 battlefieldId', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    expect(store.getBattlefieldById(battlefieldId)).toMatchObject({
      sessionId: 'session-1',
      containerId: 'container-of-session-1',
      battleSequence: 1,
      units: [],
    })
    expect(store.sessionOptions[0]?.battlefieldId).toBe(battlefieldId)
  })

  it('createBattlefield 撞已存在（409）直接上拋給頁面', async () => {
    const { store } = await setupBattlefield()
    await expect(store.createBattlefield('session-1')).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('deleteBattlefield hard-delete：清 cache、入口選項回到可建立；404 視為成功', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    server.battlefields.delete(battlefieldId) // 他端已刪 → DELETE 404
    await store.deleteBattlefield(battlefieldId)
    expect(store.getBattlefieldById(battlefieldId)).toBeUndefined()
    expect(store.sessionOptions[0]?.battlefieldId).toBeNull()
  })
})

describe('useBattlefieldStore — 持久化 pipeline', () => {
  it('高頻編輯 coalesce 成單次 PATCH（整份 updatable 投影），re-GET 換新 token', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    const adhoc = store.createAdhocUnit(
      battlefieldId,
      { name: '木樁', maxHp: 30, ac: 10, speed: 0, initiativeBonus: 0 },
      true,
    )!
    await store.flushPersist(battlefieldId)
    server.updateBodies = []

    store.applyDamage(battlefieldId, adhoc.id, 3)
    store.applyDamage(battlefieldId, adhoc.id, 4)
    store.adjustAc(battlefieldId, adhoc.id, 1)
    await store.flushPersist(battlefieldId)

    expect(server.updateBodies).toHaveLength(1)
    const body = server.updateBodies[0]!
    expect(body).toMatchObject({ battleSequence: 1, round: 1 })
    // inProgress 已棄用，不再寫入
    expect(body).not.toHaveProperty('inProgress')
    expect(body.units?.[0]).toMatchObject({ hp: { current: 23 }, acAdjustment: 1 })
    // token 已換新（後續 PATCH 不會 409）
    expect(store.getBattlefieldById(battlefieldId)?.updatedAt).toBe(
      server.battlefields.get(battlefieldId)?.updatedAt,
    )
  })

  // 迴歸：endBattle / removeUnit 以 map / filter 重建 units，元素會是 reactive
  // proxy；快照若用 structuredClone 會丟 DataCloneError，讓持久化整條靜默失敗
  // （PATCH 從未送出，只剩重試與 persistError）。
  it('endBattle / removeUnit 重建 units 後仍送得出 PATCH', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    store.createAdhocUnit(
      battlefieldId,
      { name: '留下', maxHp: 20, ac: 10, speed: 30, initiativeBonus: 0 },
      true,
    )!
    const dropped = store.createAdhocUnit(
      battlefieldId,
      { name: '移除', maxHp: 20, ac: 10, speed: 30, initiativeBonus: 0 },
      false,
    )!
    await store.flushPersist(battlefieldId)
    server.updateBodies = []

    store.endBattle(battlefieldId)
    await store.flushPersist(battlefieldId)
    expect(server.updateBodies).toHaveLength(1)
    expect(store.persistError).toBeNull()

    server.updateBodies = []
    store.removeUnit(battlefieldId, dropped.id)
    await store.flushPersist(battlefieldId)
    expect(server.updateBodies).toHaveLength(1)
    expect(server.updateBodies[0]?.units).toHaveLength(1)
    expect(store.persistError).toBeNull()
  })

  it('PATCH 409 stale：不重試、以 server 版本覆蓋本地、曝露 persistError', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    const adhoc = store.createAdhocUnit(
      battlefieldId,
      { name: '木樁', maxHp: 30, ac: 10, speed: 0, initiativeBonus: 0 },
      true,
    )!
    await store.flushPersist(battlefieldId)

    // 模擬他端已改：server token 前進，本地 token 過期
    const serverBf = server.battlefields.get(battlefieldId)!
    serverBf.updatedAt = server.nextStamp()

    store.applyDamage(battlefieldId, adhoc.id, 10)
    await store.flushPersist(battlefieldId)

    // 覆蓋回 server 真相（傷害被丟棄）
    const recovered = store.getBattlefieldById(battlefieldId)!
    expect(recovered.units[0]?.hp.current).toBe(30)
    expect(recovered.updatedAt).toBe(serverBf.updatedAt)
    expect(store.persistError).not.toBeNull()
    expect(server.updateBodies.filter((b) => b.updatedAt !== serverBf.updatedAt)).toHaveLength(2)
  })

  it('PATCH 非 409 失敗：自動重試一次成功則不曝露錯誤', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    const adhoc = store.createAdhocUnit(
      battlefieldId,
      { name: '木樁', maxHp: 30, ac: 10, speed: 0, initiativeBonus: 0 },
      true,
    )!
    await store.flushPersist(battlefieldId)

    server.nextUpdateError = Object.assign(new Error('network'), { statusCode: undefined })
    store.applyDamage(battlefieldId, adhoc.id, 5)
    await store.flushPersist(battlefieldId)

    expect(store.persistError).toBeNull()
    expect(server.battlefields.get(battlefieldId)?.units[0]?.hp.current).toBe(25)
  })

  it('PATCH 重試後仍失敗：曝露 persistError、保留本地編輯', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    const adhoc = store.createAdhocUnit(
      battlefieldId,
      { name: '木樁', maxHp: 30, ac: 10, speed: 0, initiativeBonus: 0 },
      true,
    )!
    await store.flushPersist(battlefieldId)

    const failTwice = () => {
      server.nextUpdateError = Object.assign(new Error('network'), { statusCode: undefined })
    }
    failTwice()
    store.applyDamage(battlefieldId, adhoc.id, 5)
    // 第一次失敗排入重試；flush 觸發重試前再塞一次失敗
    const flushing = store.flushPersist(battlefieldId)
    failTwice()
    await flushing

    expect(store.persistError).not.toBeNull()
    // 本地編輯保留（未被 server 覆蓋）
    expect(store.getBattlefieldById(battlefieldId)?.units[0]?.hp.current).toBe(25)
  })

  it('persist 途中戰場被他端刪除（404）：清 cache 落 NotFound', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    const adhoc = store.createAdhocUnit(
      battlefieldId,
      { name: '木樁', maxHp: 30, ac: 10, speed: 0, initiativeBonus: 0 },
      true,
    )!
    await store.flushPersist(battlefieldId)

    server.battlefields.delete(battlefieldId)
    store.applyDamage(battlefieldId, adhoc.id, 5)
    await store.flushPersist(battlefieldId)

    expect(store.getBattlefieldById(battlefieldId)).toBeUndefined()
  })
})

describe('useBattlefieldStore — 出席成員 hydrate 與修復', () => {
  it('loadMemberSources：可用者建快照、失效者降級、純 PL 跳過', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    seedDmLog()
    await store.loadMemberSources(battlefieldId)
    const sources = store.getMemberSources(battlefieldId)
    expect(sources).toHaveLength(2)
    expect(sources[0]).toMatchObject({
      memberId: 'member-a',
      shareId: 'chs_available',
      available: true,
      name: '艾莉亞',
      maxHp: 44,
    })
    expect(sources[1]).toEqual({
      memberId: 'member-b',
      shareId: 'chs_broken',
      playerName: '玩家B',
      available: false,
    })
  })

  it('loadMemberSources：share 單筆抓取失敗降級為不可用，不整批失敗', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    seedDmLog()
    shareServer.characters.delete('chs_available') // preview available 但實抓 404
    await store.loadMemberSources(battlefieldId)
    const sources = store.getMemberSources(battlefieldId)
    expect(sources[0]).toMatchObject({ shareId: 'chs_available', available: false })
  })

  it('removeSessionMember：members 整列 replace 排除該員、失效 shareId 收斂 null、重跑 hydrate', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    seedDmLog()
    await store.loadMemberSources(battlefieldId)
    const getLogCallsBefore = dmServer.getLogCalls

    await store.removeSessionMember(battlefieldId, 'member-b')

    expect(dmServer.updateLogBodies).toHaveLength(1)
    const body = dmServer.updateLogBodies[0]!
    expect(body.updatedAt).toBe('2026-07-01T00:00:00.000Z')
    expect(body.members).toEqual([
      { id: 'member-a', playerName: '玩家A', characterShareId: 'chs_available' },
      { id: 'member-c', playerName: '純PL', characterShareId: null },
    ])
    expect(dmServer.getLogCalls).toBe(getLogCallsBefore + 1)
  })

  it('relinkSessionMember：替換該員 characterShareId；PATCH 失敗仍重抓 log 刷新 token 後上拋', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    seedDmLog()
    await store.loadMemberSources(battlefieldId)

    await store.relinkSessionMember(battlefieldId, 'member-b', 'chs_new')
    expect(dmServer.updateLogBodies.at(-1)?.members).toContainEqual({
      id: 'member-b',
      playerName: '玩家B',
      characterShareId: 'chs_new',
    })

    const getLogCallsBefore = dmServer.getLogCalls
    dmServer.nextUpdateError = fetchError(409, 'STALE_DM_SESSION_LOG_VERSION')
    await expect(
      store.relinkSessionMember(battlefieldId, 'member-b', 'chs_other'),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(dmServer.getLogCalls).toBe(getLogCallsBefore + 1)
  })
})

describe('useBattlefieldStore — 單位建立', () => {
  it('importMember 以滿 HP 快照帶入並直接參戰；attacks 行內 id 重生；重複帶入 no-op', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    seedDmLog()
    await store.loadMemberSources(battlefieldId)

    const imported = store.importMember(battlefieldId, 'chs_available')
    expect(imported.ok).toBe(true)
    const unit = imported.ok ? imported.unit : null
    expect(unit).toMatchObject({
      kind: 'character',
      faction: 'player',
      name: '艾莉亞',
      challengeRating: null,
      race: '人類',
      maxHp: 44,
      hp: { current: 44, tempHp: 0, maxAdjustment: 0 },
      acAdjustment: 0,
      speedAdjustment: 0,
      inCombat: true,
    })
    expect(unit?.attacks[0]).toMatchObject({ name: '長劍', hitBonus: 8 })
    expect(unit?.attacks[0]?.id).not.toBe('src-atk-1')
    expect(unit?.attacks[0]?.damageDice[0]?.id).not.toBe('src-dd-1')
    // 首位參戰自動成為行動者
    expect(store.getBattlefieldById(battlefieldId)?.activeUnitId).toBe(unit?.id)

    const again = store.importMember(battlefieldId, 'chs_available')
    expect(again.ok && again.unit.id).toBe(unit?.id)
    expect(store.getBattlefieldById(battlefieldId)?.units).toHaveLength(1)
  })

  it('importMember 對快照失敗成員回 memberUnavailable（與達上限可區分）', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    seedDmLog()
    await store.loadMemberSources(battlefieldId)
    expect(store.importMember(battlefieldId, 'chs_broken')).toEqual({
      ok: false,
      reason: 'memberUnavailable',
    })
  })

  it('addMonsterInstance 快照模板詳情（cache miss 補抓）、challengeRating 存原始值、自動編號', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    monsterStore.details.set('tpl-goblin', GOBLIN_TEMPLATE)

    const created = await store.addMonsterInstance(battlefieldId, 'tpl-goblin')
    expect(created.ok).toBe(true)
    const first = created.ok ? created.unit : null
    expect(first).toMatchObject({
      kind: 'monster',
      faction: 'enemy',
      name: '哥布林',
      challengeRating: '1/4',
      maxHp: 7,
      hp: { current: 7, tempHp: 0, maxAdjustment: 0 },
      ac: 15,
      speed: 30,
      initiativeBonus: 2,
      inCombat: true,
    })
    expect(first?.attacks[0]).toMatchObject({ name: '彎刀', hitBonus: 4 })
    expect(first?.attacks[0]?.id).not.toBe('tpl-atk-1')
    expect(first?.skills).toEqual({ stealth: 6 })

    const second = await store.addMonsterInstance(battlefieldId, 'tpl-goblin')
    expect(second.ok && second.unit.name).toBe('哥布林 2')
  })

  it('addMonsterInstance 模板載入失敗回 templateLoadFailed 並帶原始 error（供 apiErrorToast 分流）', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    const result = await store.addMonsterInstance(battlefieldId, 'tpl-nope')
    expect(result).toMatchObject({ ok: false, reason: 'templateLoadFailed' })
    expect(result.ok === false && 'error' in result && result.error).toBeInstanceOf(Error)
    expect(monsterStore.loadDetailCalls).toBe(1)
  })

  it('createAdhocUnit 預設中立；joinCombat=false 進可用庫；輸入 clamp 進 caps', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    const unit = store.createAdhocUnit(
      battlefieldId,
      { name: '  火焰精靈  ', maxHp: 5000, ac: 13, speed: 60, initiativeBonus: 2 },
      false,
    )
    expect(unit).toMatchObject({
      kind: 'adhoc',
      faction: 'neutral',
      name: '火焰精靈',
      maxHp: 999,
      hp: { current: 999, tempHp: 0, maxAdjustment: 0 },
      inCombat: false,
    })
  })

  it('達單位上限（50）時三種建立入口皆擋下，前兩者以 cap 為由（頁面才給得出上限提示）', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    seedDmLog()
    await store.loadMemberSources(battlefieldId)
    monsterStore.details.set('tpl-goblin', GOBLIN_TEMPLATE)
    const bf = store.getBattlefieldById(battlefieldId)!
    bf.units = Array.from({ length: 50 }, () => createMockBattlefieldUnit())

    expect(store.importMember(battlefieldId, 'chs_available')).toEqual({
      ok: false,
      reason: 'cap',
    })
    expect(await store.addMonsterInstance(battlefieldId, 'tpl-goblin')).toEqual({
      ok: false,
      reason: 'cap',
    })
    expect(
      store.createAdhocUnit(
        battlefieldId,
        { name: 'x', maxHp: 1, ac: 10, speed: 30, initiativeBonus: 0 },
        false,
      ),
    ).toBeNull()
    expect(bf.units).toHaveLength(50)
  })
})

// ── 以下測試不經 API：直接 seed cache 驗證本地狀態機 ─────────────────────────
const seedLocal = () => {
  const store = useBattlefieldStore()
  const units = [
    createMockBattlefieldUnit({
      id: 'u-aliya',
      kind: 'character',
      faction: 'player',
      name: '艾莉亞',
      inCombat: true,
      maxHp: 44,
      sortOrder: 0,
      initiative: 18,
    }),
    createMockBattlefieldUnit({
      id: 'u-luna',
      kind: 'character',
      faction: 'player',
      name: '露娜',
      inCombat: true,
      maxHp: 12,
      hp: { current: 12, tempHp: 5, maxAdjustment: 0 },
      sortOrder: 1,
      initiative: 14,
    }),
    createMockBattlefieldUnit({
      id: 'u-g1',
      kind: 'monster',
      faction: 'enemy',
      name: '哥布林 1',
      inCombat: true,
      maxHp: 7,
      sortOrder: 2,
      initiative: 10,
      initiativeBonus: 2,
    }),
    createMockBattlefieldUnit({
      id: 'u-g2',
      kind: 'monster',
      faction: 'enemy',
      name: '哥布林 2',
      inCombat: true,
      maxHp: 3,
      sortOrder: 3,
      initiative: 5,
      initiativeBonus: 2,
    }),
    createMockBattlefieldUnit({
      id: 'u-pipo',
      kind: 'adhoc',
      faction: 'neutral',
      name: '皮波',
      inCombat: false,
      maxHp: 16,
    }),
  ]
  const bf = createMockBattlefieldDTO({
    id: 'local-bf',
    round: 2,
    activeUnitId: 'u-aliya',
    units,
  })
  store.battlefieldCache.set(bf.id, bf)
  return { store, bf: store.getBattlefieldById(bf.id)! }
}

const combatIds = (bf: BattlefieldDTO): string[] =>
  bf.units
    .filter((u) => u.inCombat)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((u) => u.id)

describe('useBattlefieldStore — 數值', () => {
  it('applyDamage 臨時 HP 先扣；降到 0 回報倒下、再打不重複回報', () => {
    const { store, bf } = seedLocal()
    expect(store.applyDamage(bf.id, 'u-luna', 6)).toBe(false)
    expect(bf.units.find((u) => u.id === 'u-luna')?.hp).toMatchObject({ current: 11, tempHp: 0 })
    expect(store.applyDamage(bf.id, 'u-g2', 5)).toBe(true)
    expect(store.applyDamage(bf.id, 'u-g2', 5)).toBe(false)
  })

  it('adjustMaxHp 走 hp.maxAdjustment（快照不動）：上調同步加當前 HP、下調只 clamp', () => {
    const { store, bf } = seedLocal()
    const aliya = bf.units.find((u) => u.id === 'u-aliya')!
    store.applyDamage(bf.id, 'u-aliya', 10) // 44 → 34
    store.adjustMaxHp(bf.id, 'u-aliya', 5)
    expect(aliya.maxHp).toBe(44)
    expect(aliya.hp).toMatchObject({ current: 39, maxAdjustment: 5 })
    store.adjustMaxHp(bf.id, 'u-aliya', -20)
    expect(aliya.hp).toMatchObject({ current: 29, maxAdjustment: -15 })
  })

  it('adjustAc 走 acAdjustment 並夾 ±99；快照 ac 不動', () => {
    const { store, bf } = seedLocal()
    const aliya = bf.units.find((u) => u.id === 'u-aliya')!
    store.adjustAc(bf.id, 'u-aliya', 3)
    expect(aliya).toMatchObject({ ac: 12, acAdjustment: 3 })
    store.adjustAc(bf.id, 'u-aliya', -200)
    expect(aliya.acAdjustment).toBe(-99)
  })

  it('adjustSpeed 疊加調整值並夾 ±99；速度快照本身不變', () => {
    const { store, bf } = seedLocal()
    const aliya = bf.units.find((u) => u.id === 'u-aliya')!
    store.adjustSpeed(bf.id, 'u-aliya', 10)
    expect(aliya).toMatchObject({ speed: 30, speedAdjustment: 10 })
    store.adjustSpeed(bf.id, 'u-aliya', -200)
    expect(aliya).toMatchObject({ speed: 30, speedAdjustment: -99 })
  })

  it('rollInitiative 用 1d20+加值並重排；rollAllEnemyInitiatives 回傳逐筆結果', () => {
    const { store, bf } = seedLocal()
    const result = store.rollInitiative(bf.id, 'u-aliya')
    expect(result).toEqual({ roll: 15, total: 15 })
    const results = store.rollAllEnemyInitiatives(bf.id)
    expect(results).toHaveLength(2)
    expect(results).toContainEqual({ unitId: 'u-g1', name: '哥布林 1', roll: 15, total: 17 })
  })
})

describe('useBattlefieldStore — 狀態（conditions）', () => {
  it('addCondition 空白備註正規化為 null；removeCondition 移除指定狀態；達上限 no-op', () => {
    const { store, bf } = seedLocal()
    store.addCondition(bf.id, 'u-aliya', 'stunned', '  ')
    const aliya = bf.units.find((u) => u.id === 'u-aliya')!
    expect(aliya.conditions).toHaveLength(1)
    expect(aliya.conditions[0]).toMatchObject({ key: 'stunned', note: null })
    store.removeCondition(bf.id, 'u-aliya', aliya.conditions[0]!.id)
    expect(aliya.conditions).toHaveLength(0)

    aliya.conditions = Array.from({ length: 15 }, (_, i) => ({
      id: `c-${i}`,
      key: 'prone' as const,
      note: null,
    }))
    store.addCondition(bf.id, 'u-aliya', 'stunned', null)
    expect(aliya.conditions).toHaveLength(15)
  })
})

describe('useBattlefieldStore — 回合狀態機', () => {
  it('stepTurn 順推；軌尾繞回軌頭時進位並回傳新 round', () => {
    const { store, bf } = seedLocal()
    expect(store.stepTurn(bf.id, 1)).toBeNull()
    expect(bf.activeUnitId).toBe('u-luna')
    bf.activeUnitId = 'u-g2'
    expect(store.stepTurn(bf.id, 1)).toBe(3)
    expect(bf.activeUnitId).toBe('u-aliya')
  })

  it('stepTurn 從軌頭回退繞到軌尾並退位，round 下限 1', () => {
    const { store, bf } = seedLocal()
    expect(store.stepTurn(bf.id, -1)).toBeNull() // round 2 → 1，非進位不回報
    expect(bf.activeUnitId).toBe('u-g2')
    expect(bf.round).toBe(1)
    bf.activeUnitId = 'u-aliya'
    store.stepTurn(bf.id, -1)
    expect(bf.round).toBe(1)
  })

  it('leaveCombat 行動中單位退場：行動權交給下一位、輪次不動（D-4）', () => {
    const { store, bf } = seedLocal()
    bf.activeUnitId = 'u-g2' // 軌尾：舊實作會在此進位
    const roundBefore = bf.round
    store.leaveCombat(bf.id, 'u-g2')
    expect(bf.activeUnitId).toBe('u-aliya')
    expect(bf.round).toBe(roundBefore)
    expect(bf.units.find((u) => u.id === 'u-g2')?.inCombat).toBe(false)
  })

  it('reorderUnits 依 id 順序重寫 sortOrder；moveUnit 與相鄰互換', () => {
    const { store, bf } = seedLocal()
    const reversed = [...combatIds(bf)].reverse()
    store.reorderUnits(bf.id, reversed)
    expect(combatIds(bf)).toEqual(reversed)
    const [first, second] = combatIds(bf)
    store.moveUnit(bf.id, first!, 1)
    expect(combatIds(bf).slice(0, 2)).toEqual([second, first])
  })

  it('resetBattle（第 1 場，無快照）：全員回快照基準、單位保留、位置不動', async () => {
    const { store, bf } = seedLocal()
    store.applyDamage(bf.id, 'u-luna', 8)
    store.addCondition(bf.id, 'u-aliya', 'stunned', null)

    await store.resetBattle(bf.id)

    expect(server.restoreCalls).toEqual([]) // 第 1 場不打還原 API
    expect(bf.round).toBe(1)
    expect(bf.activeUnitId).toBeNull()
    expect(bf.units.every((u) => u.initiative === null)).toBe(true)
    expect(bf.units.find((u) => u.id === 'u-luna')?.hp).toEqual({
      current: 12,
      tempHp: 0,
      maxAdjustment: 0,
    })
    expect(bf.units.find((u) => u.id === 'u-aliya')?.conditions).toEqual([])
    // 位置不動：怪物仍在場上、皮波仍在牌庫
    expect(bf.units.find((u) => u.id === 'u-g1')?.inCombat).toBe(true)
    expect(bf.units.find((u) => u.id === 'u-pipo')?.inCombat).toBe(false)
  })
})

describe('useBattlefieldStore — 戰鬥段落', () => {
  it('endBattle：場次 +1、輪次回 1、清行動者與全員先攻', () => {
    const { store, bf } = seedLocal()
    expect(store.endBattle(bf.id)).toBe(2)
    const next = store.getBattlefieldById(bf.id)!
    expect(next.battleSequence).toBe(2)
    expect(next.round).toBe(1)
    expect(next.activeUnitId).toBeNull()
    expect(next.units.every((u) => u.initiative === null)).toBe(true)
  })

  it('endBattle：角色留場保留狀態、怪物與 adhoc 退牌庫歸零（依 kind）', () => {
    const { store, bf } = seedLocal()
    store.applyDamage(bf.id, 'u-luna', 8) // 臨時 5 先扣 → current 9
    store.applyDamage(bf.id, 'u-g1', 4) // 怪物 7 → 3

    store.endBattle(bf.id)
    const next = store.getBattlefieldById(bf.id)!
    const luna = next.units.find((u) => u.id === 'u-luna')!
    const goblin = next.units.find((u) => u.id === 'u-g1')!

    expect(luna.inCombat).toBe(true)
    expect(luna.hp.current).toBe(9)
    expect(goblin.inCombat).toBe(false)
    expect(goblin.hp).toEqual({ current: 7, tempHp: 0, maxAdjustment: 0 })
    // 實例保留（不刪單位）
    expect(next.units).toHaveLength(5)
  })

  it('endBattle：場次到達上限不再遞增', () => {
    const { store, bf } = seedLocal()
    bf.battleSequence = BATTLEFIELD_LIMITS.BATTLE_SEQUENCE_MAX
    expect(store.endBattle(bf.id)).toBe(BATTLEFIELD_LIMITS.BATTLE_SEQUENCE_MAX)
  })

  it('resetBattle（第 2 場以後）：走還原 API，以回應覆蓋本地並換新 token', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    const unit = store.createAdhocUnit(
      battlefieldId,
      { name: '木樁', maxHp: 30, ac: 10, speed: 0, initiativeBonus: 0 },
      true,
    )!
    // 結束第 1 場 → server 拍下第 2 場起始快照
    store.endBattle(battlefieldId)
    await store.flushPersist(battlefieldId)
    // 第 2 場打到一半
    store.applyDamage(battlefieldId, unit.id, 12)
    store.stepTurn(battlefieldId, 1)
    await store.flushPersist(battlefieldId)

    await store.resetBattle(battlefieldId)

    expect(server.restoreCalls).toEqual([battlefieldId])
    const next = store.getBattlefieldById(battlefieldId)!
    expect(next.battleSequence).toBe(2) // 場次不因還原而回退
    expect(next.round).toBe(1)
    expect(next.units.find((u) => u.id === unit.id)?.hp.current).toBe(30)
    expect(next.updatedAt).toBe(server.battlefields.get(battlefieldId)?.updatedAt)
  })

  it('resetBattle：還原前先 flush，未送出的編輯不會讓還原自撞 409', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    store.createAdhocUnit(
      battlefieldId,
      { name: '木樁', maxHp: 30, ac: 10, speed: 0, initiativeBonus: 0 },
      true,
    )
    store.endBattle(battlefieldId)
    await store.flushPersist(battlefieldId)
    // 只 schedule 不 flush：本地 token 仍是舊的
    store.stepTurn(battlefieldId, 1)

    await store.resetBattle(battlefieldId)
    expect(store.persistError).toBeNull()
    expect(store.getBattlefieldById(battlefieldId)?.round).toBe(1)
  })

  it('resetBattle：還原 404（快照遺失）時降級為本地重置', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    const unit = store.createAdhocUnit(
      battlefieldId,
      { name: '木樁', maxHp: 30, ac: 10, speed: 0, initiativeBonus: 0 },
      true,
    )!
    store.endBattle(battlefieldId)
    await store.flushPersist(battlefieldId)
    store.applyDamage(battlefieldId, unit.id, 12)
    await store.flushPersist(battlefieldId)
    server.snapshots.delete(battlefieldId)

    await store.resetBattle(battlefieldId)

    const next = store.getBattlefieldById(battlefieldId)!
    expect(next.units.find((u) => u.id === unit.id)?.hp.current).toBe(30)
    expect(next.round).toBe(1)
  })

  it('resetBattle：還原 409 上拋給頁面（不吞錯）', async () => {
    const { store, battlefieldId } = await setupBattlefield()
    store.createAdhocUnit(
      battlefieldId,
      { name: '木樁', maxHp: 30, ac: 10, speed: 0, initiativeBonus: 0 },
      true,
    )
    store.endBattle(battlefieldId)
    await store.flushPersist(battlefieldId)
    server.nextRestoreError = fetchError(409, 'STALE_BATTLEFIELD_VERSION')

    await expect(store.resetBattle(battlefieldId)).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('useBattlefieldStore — 先攻軌排序（D-7）', () => {
  it('先攻變動不觸發重排：設值／加減／單擲／敵人重擲後順序原封不動', () => {
    const { store, bf } = seedLocal()
    const before = combatIds(bf)

    store.setInitiative(bf.id, 'u-g2', 30) // 最低變最高
    expect(combatIds(bf)).toEqual(before)

    store.adjustInitiative(bf.id, 'u-g1', 25)
    expect(combatIds(bf)).toEqual(before)

    store.rollInitiative(bf.id, 'u-luna')
    expect(combatIds(bf)).toEqual(before)

    store.rollAllEnemyInitiatives(bf.id)
    expect(combatIds(bf)).toEqual(before)
  })

  it('拖曳排好的順序不會被後續先攻變動洗掉', () => {
    const { store, bf } = seedLocal()
    const manual = [...combatIds(bf)].reverse()
    store.reorderUnits(bf.id, manual)
    store.rollInitiative(bf.id, 'u-aliya')
    expect(combatIds(bf)).toEqual(manual)
  })

  it('sortByInitiative（工具列）才依先攻重排，平手看 initiativeBonus', () => {
    const { store, bf } = seedLocal()
    store.setInitiative(bf.id, 'u-aliya', 10)
    store.setInitiative(bf.id, 'u-luna', 10)
    bf.units.find((u) => u.id === 'u-luna')!.initiativeBonus = 5
    store.sortByInitiative(bf.id)
    // 哥布林 1 先攻 10 加值 2、露娜 10 加值 5、艾莉亞 10 加值 0（fixture 預設）
    expect(combatIds(bf)).toEqual(['u-luna', 'u-g1', 'u-aliya', 'u-g2'])
  })

  it('入場依序給號：排在現有參戰單位之後，不插隊', () => {
    const { store, bf } = seedLocal()
    const joined = store.createAdhocUnit(
      bf.id,
      { name: '新來的', maxHp: 10, ac: 10, speed: 30, initiativeBonus: 99 },
      true,
    )!
    expect(joined.sortOrder).toBe(4) // 已有 4 個參戰單位
    expect(combatIds(bf).at(-1)).toBe(joined.id)
  })

  it('從牌庫參戰同樣排在軌尾', () => {
    const { store, bf } = seedLocal()
    store.enterCombat(bf.id, 'u-pipo')
    expect(combatIds(bf).at(-1)).toBe('u-pipo')
  })
})

describe('useBattlefieldStore — 死亡豁免', () => {
  it('setDeathSave* clamp 0..3；HP > 0 時 no-op', () => {
    const { store, bf } = seedLocal()
    const luna = bf.units.find((u) => u.id === 'u-luna')!
    store.setDeathSaveSuccesses(bf.id, 'u-luna', 2)
    expect(luna.deathSaves.successes).toBe(0)
    store.applyDamage(bf.id, 'u-luna', 999)
    expect(luna.hp.current).toBe(0)
    store.setDeathSaveSuccesses(bf.id, 'u-luna', 5)
    expect(luna.deathSaves.successes).toBe(3)
    store.setDeathSaveFailures(bf.id, 'u-luna', -1)
    expect(luna.deathSaves.failures).toBe(0)
  })

  it('applyHeal 0 → ≥1 歸零計數；adjustMaxHp 抬升當前 HP 連動歸零', () => {
    const { store, bf } = seedLocal()
    const luna = bf.units.find((u) => u.id === 'u-luna')!
    store.applyDamage(bf.id, 'u-luna', 999)
    store.setDeathSaveFailures(bf.id, 'u-luna', 2)
    store.applyHeal(bf.id, 'u-luna', 1)
    expect(luna.deathSaves).toEqual({ successes: 0, failures: 0 })

    const g2 = bf.units.find((u) => u.id === 'u-g2')!
    store.applyDamage(bf.id, 'u-g2', 999)
    store.setDeathSaveSuccesses(bf.id, 'u-g2', 1)
    store.adjustMaxHp(bf.id, 'u-g2', 1) // 上調同步 +1 當前 HP → 站起
    expect(g2.hp.current).toBe(1)
    expect(g2.deathSaves.successes).toBe(0)
  })
})

describe('useBattlefieldStore — reset', () => {
  it('reset 清空所有 session-bound state', async () => {
    const { store } = await setupBattlefield()
    store.reset()
    expect(store.sessionOptions).toHaveLength(0)
    expect(store.listLoaded).toBe(false)
    expect(store.persistError).toBeNull()
    await store.loadSessionOptions()
    expect(store.sessionOptions).toHaveLength(1)
  })
})
