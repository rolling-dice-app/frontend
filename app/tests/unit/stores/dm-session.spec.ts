import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  DmSessionContainerCreateBody,
  DmSessionContainerDTO,
  DmSessionContainerSummaryDTO,
  DmSessionContainerUpdateBody,
  DmSessionLogCreateBody,
  DmSessionLogDTO,
  DmSessionLogUpdateBody,
  PlanLimits,
} from '@rolling-dice-app/core'
import {
  containerToSummary,
  createMockDmSessionContainer,
  createMockDmSessionLog,
  createMockDmSessionLogDraft,
  createMockDmSessionMember,
  createMockSharedCharacterPreview,
  logToSummary,
} from '~/tests/fixtures/dm-session'
import { useAuthStore } from '~/stores/auth'

const mockList = vi.fn<() => Promise<DmSessionContainerSummaryDTO[]>>()
const mockGet = vi.fn<(id: string) => Promise<DmSessionContainerDTO>>()
const mockCreate = vi.fn<(body: DmSessionContainerCreateBody) => Promise<DmSessionContainerDTO>>()
const mockUpdate = vi.fn<(id: string, body: DmSessionContainerUpdateBody) => Promise<void>>()
const mockRemove = vi.fn<(id: string) => Promise<void>>()
const mockCreateLog =
  vi.fn<(containerId: string, body: DmSessionLogCreateBody) => Promise<DmSessionLogDTO>>()
const mockGetLog = vi.fn<(containerId: string, logId: string) => Promise<DmSessionLogDTO>>()
const mockUpdateLog =
  vi.fn<(containerId: string, logId: string, body: DmSessionLogUpdateBody) => Promise<void>>()
const mockRemoveLog = vi.fn<(containerId: string, logId: string) => Promise<void>>()

beforeEach(() => {
  vi.resetModules()
  setActivePinia(createPinia())
  for (const fn of [
    mockList,
    mockGet,
    mockCreate,
    mockUpdate,
    mockRemove,
    mockCreateLog,
    mockGetLog,
    mockUpdateLog,
    mockRemoveLog,
  ]) {
    fn.mockReset()
  }
  vi.stubGlobal('dmSessionContainers', () => ({
    list: mockList,
    get: mockGet,
    create: mockCreate,
    update: mockUpdate,
    remove: mockRemove,
    createLog: mockCreateLog,
    getLog: mockGetLog,
    updateLog: mockUpdateLog,
    removeLog: mockRemoveLog,
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('dm-session store — loadList', () => {
  it('成功時將 backend summary 寫入 list 並設 listLoaded', async () => {
    const c = createMockDmSessionContainer()
    mockList.mockResolvedValue([containerToSummary(c)])

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.loadList()

    expect(store.list).toEqual([containerToSummary(c)])
    expect(store.listLoaded).toBe(true)
    expect(store.listLoading).toBe(false)
    expect(store.listError).toBeNull()
  })

  it('失敗時 listError 被設定且 rethrow', async () => {
    const err = new Error('boom')
    mockList.mockRejectedValue(err)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await expect(store.loadList()).rejects.toThrow('boom')
    expect(store.listError).toBe(err)
    expect(store.listLoaded).toBe(false)
    expect(store.listLoading).toBe(false)
  })

  it('並發 loadList 單飛：飛行中不平行打 API', async () => {
    let resolveFn: (v: DmSessionContainerSummaryDTO[]) => void = () => {}
    mockList.mockReturnValue(
      new Promise<DmSessionContainerSummaryDTO[]>((resolve) => {
        resolveFn = resolve
      }),
    )

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    const p1 = store.loadList()
    const p2 = store.loadList()
    expect(mockList).toHaveBeenCalledTimes(1)
    resolveFn([])
    await Promise.all([p1, p2])
  })
})

describe('dm-session store — ensureListLoaded', () => {
  it('未載入時打 API；已載入後 no-op', async () => {
    mockList.mockResolvedValue([])

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.ensureListLoaded()
    await store.ensureListLoaded()

    expect(mockList).toHaveBeenCalledTimes(1)
  })
})

describe('dm-session store — loadContainer / getContainerById', () => {
  it('loadContainer 寫入 containerCache；getContainerById 回防禦性 clone', async () => {
    const c = createMockDmSessionContainer()
    mockGet.mockResolvedValue(c)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.loadContainer(c.id)

    const got = store.getContainerById(c.id)
    expect(got).toEqual(c)
    // 改寫回傳值不得污染 cache
    got!.title = '被改壞的標題'
    got!.members.push(createMockDmSessionMember({ id: 'mem-x' }))
    expect(store.getContainerById(c.id)).toEqual(c)
  })

  it('失敗時 detailError 被設定且 rethrow（404 交由頁面分流）', async () => {
    const err = new Error('404-ish')
    mockGet.mockRejectedValue(err)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await expect(store.loadContainer('nope')).rejects.toThrow('404-ish')
    expect(store.detailError).toBe(err)
  })
})

describe('dm-session store — createContainer', () => {
  it('POST body 只含 title；成功後 cache 完整 DTO，summary 置頂 list（對齊 createdAt desc）', async () => {
    const existing = createMockDmSessionContainer({ id: 'dsc-old', title: '舊劇本' })
    mockList.mockResolvedValue([containerToSummary(existing)])
    const created = createMockDmSessionContainer({ id: 'dsc-new', title: '新劇本' })
    mockCreate.mockResolvedValue(created)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.loadList()
    const result = await store.createContainer('新劇本')

    expect(mockCreate).toHaveBeenCalledWith({ title: '新劇本' })
    expect(result).toEqual(created)
    expect(store.containerCache.get('dsc-new')).toEqual(created)
    expect(store.list).toEqual([containerToSummary(created), containerToSummary(existing)])
  })
})

describe('dm-session store — updateContainer', () => {
  it('無 diff 時不打 API，直接回 cache clone', async () => {
    const c = createMockDmSessionContainer()
    mockGet.mockResolvedValue(c)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.loadContainer(c.id)

    const result = await store.updateContainer(c.id, { title: c.title })
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(result).toEqual(c)
  })

  it('有 diff 時 PATCH 只含變更欄位 + updatedAt（members 轉寫入形），成功後 re-GET 刷 cache 並原位替換 summary', async () => {
    const other = createMockDmSessionContainer({ id: 'dsc-other', title: '別的劇本' })
    const c = createMockDmSessionContainer()
    const nextMembers = [
      ...structuredClone(c.members),
      createMockDmSessionMember({
        id: 'mem-003',
        playerName: '小美',
        character: createMockSharedCharacterPreview({ shareId: 'chs_mock0002' }),
      }),
    ]
    const next = {
      ...c,
      members: nextMembers,
      updatedAt: '2026-01-03T00:00:00.000Z',
    }
    // 列表序固定 createdAt desc：update 不得移動位置
    mockList.mockResolvedValue([containerToSummary(other), containerToSummary(c)])
    mockGet.mockResolvedValueOnce(c).mockResolvedValueOnce(next)
    mockUpdate.mockResolvedValue(undefined)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.loadList()
    await store.loadContainer(c.id)

    const result = await store.updateContainer(c.id, { members: nextMembers })

    expect(mockUpdate).toHaveBeenCalledWith(c.id, {
      updatedAt: c.updatedAt,
      members: [
        { id: 'mem-001', playerName: '小明', characterShareId: null },
        { id: 'mem-002', playerName: '小華', characterShareId: 'chs_mock0001' },
        { id: 'mem-003', playerName: '小美', characterShareId: 'chs_mock0002' },
      ],
    })
    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(result?.updatedAt).toBe(next.updatedAt)
    expect(store.containerCache.get(c.id)).toEqual(next)
    expect(store.list).toEqual([containerToSummary(other), containerToSummary(next)])
  })

  it('PATCH 成功但 re-GET 失敗：不拋錯、回 null、cache 失效', async () => {
    const c = createMockDmSessionContainer()
    mockGet.mockResolvedValueOnce(c).mockRejectedValueOnce(new Error('network down'))
    mockUpdate.mockResolvedValue(undefined)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.loadContainer(c.id)

    const result = await store.updateContainer(c.id, { title: '新標題' })

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(result).toBeNull()
    // 舊 lock token 已作廢：cache 必須失效，避免原地重試撞 409
    expect(store.containerCache.has(c.id)).toBe(false)
  })

  it('未載入容器時 throw（頁面流程保證先 loadContainer）', async () => {
    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await expect(store.updateContainer('ghost', { title: 'x' })).rejects.toThrow('not loaded')
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('dm-session store — removeContainer', () => {
  it('DELETE 後本地移除 list 項與 cache，並 cascade 清掉所屬紀錄', async () => {
    const log = createMockDmSessionLog()
    const otherLog = createMockDmSessionLog({ id: 'dsl-other', containerId: 'dsc-other' })
    const c = createMockDmSessionContainer({ sessions: [logToSummary(log)] })
    mockList.mockResolvedValue([containerToSummary(c)])
    mockGet.mockResolvedValue(c)
    mockGetLog.mockResolvedValueOnce(log).mockResolvedValueOnce(otherLog)
    mockRemove.mockResolvedValue(undefined)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.loadList()
    await store.loadContainer(c.id)
    await store.loadLog(c.id, log.id)
    await store.loadLog('dsc-other', otherLog.id)

    await store.removeContainer(c.id)

    expect(mockRemove).toHaveBeenCalledWith(c.id)
    expect(store.list).toEqual([])
    expect(store.containerCache.has(c.id)).toBe(false)
    expect(store.logCache.has(log.id)).toBe(false)
    // 其他容器的紀錄不受 cascade 影響
    expect(store.logCache.has(otherLog.id)).toBe(true)
  })
})

describe('dm-session store — loadLog / getLogById', () => {
  it('loadLog 寫入 logCache；getLogById 回防禦性 clone', async () => {
    const log = createMockDmSessionLog()
    mockGetLog.mockResolvedValue(log)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.loadLog(log.containerId, log.id)

    const got = store.getLogById(log.id)
    expect(got).toEqual(log)
    got!.title = '被改壞的標題'
    got!.itemRewards.push({ id: 'x', item: 'x', player: '', remark: '' })
    expect(store.getLogById(log.id)).toEqual(log)
  })

  it('失敗時 detailError 被設定且 rethrow（404 交由頁面分流）', async () => {
    const err = new Error('404-ish')
    mockGetLog.mockRejectedValue(err)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await expect(store.loadLog('dsc-001', 'nope')).rejects.toThrow('404-ish')
    expect(store.detailError).toBe(err)
  })
})

describe('dm-session store — createLog', () => {
  it('POST body members 轉寫入形；成功後 cache 紀錄並將 summary 插入容器時間軸（同日置尾）', async () => {
    const sameDay = createMockDmSessionLog({ id: 'dsl-a', date: '2026-01-10' })
    const c = createMockDmSessionContainer({ sessions: [logToSummary(sameDay)] })
    const created = createMockDmSessionLog({
      id: 'dsl-new',
      date: '2026-01-10',
      members: [createMockDmSessionMember({ character: createMockSharedCharacterPreview() })],
    })
    mockGet.mockResolvedValue(c)
    mockCreateLog.mockResolvedValue(created)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.loadContainer(c.id)

    const draft = createMockDmSessionLogDraft(created)
    const result = await store.createLog(c.id, draft)

    expect(mockCreateLog).toHaveBeenCalledWith(c.id, {
      title: draft.title,
      date: draft.date,
      content: draft.content,
      members: [{ id: 'mem-001', playerName: '小明', characterShareId: 'chs_mock0001' }],
      moneyRewards: draft.moneyRewards,
      expRewards: draft.expRewards,
      itemRewards: draft.itemRewards,
    })
    expect(result).toEqual(created)
    expect(store.logCache.get('dsl-new')).toEqual(created)
    // 同日新建：stable sort 置於同日組尾端，對齊 server createdAt asc
    expect(store.containerCache.get(c.id)?.sessions.map((s) => s.id)).toEqual(['dsl-a', 'dsl-new'])
  })

  it('容器未在 cache 時仍成功建立，不動 sessions', async () => {
    const created = createMockDmSessionLog()
    mockCreateLog.mockResolvedValue(created)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    const result = await store.createLog(created.containerId, createMockDmSessionLogDraft(created))
    expect(result).toEqual(created)
    expect(store.logCache.get(created.id)).toEqual(created)
  })
})

describe('dm-session store — updateLog', () => {
  it('無 diff 時不打 API，直接回 cache clone', async () => {
    const log = createMockDmSessionLog()
    mockGetLog.mockResolvedValue(log)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.loadLog(log.containerId, log.id)

    const result = await store.updateLog(log.containerId, log.id, createMockDmSessionLogDraft(log))
    expect(mockUpdateLog).not.toHaveBeenCalled()
    expect(result).toEqual(log)
  })

  it('有 diff 時 PATCH + re-GET，同步容器時間軸 summary 並依 date 重排', async () => {
    const early = createMockDmSessionLog({ id: 'dsl-early', date: '2026-01-01' })
    const log = createMockDmSessionLog({ id: 'dsl-001', date: '2026-01-10' })
    const c = createMockDmSessionContainer({
      sessions: [logToSummary(early), logToSummary(log)],
    })
    const next = { ...log, date: '2025-12-31', updatedAt: '2026-01-12T00:00:00.000Z' }
    mockGet.mockResolvedValue(c)
    mockGetLog.mockResolvedValueOnce(log).mockResolvedValueOnce(next)
    mockUpdateLog.mockResolvedValue(undefined)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.loadContainer(c.id)
    await store.loadLog(c.id, log.id)

    const result = await store.updateLog(
      c.id,
      log.id,
      createMockDmSessionLogDraft(log, { date: '2025-12-31' }),
    )

    expect(mockUpdateLog).toHaveBeenCalledWith(c.id, log.id, {
      updatedAt: log.updatedAt,
      date: '2025-12-31',
    })
    expect(result?.updatedAt).toBe(next.updatedAt)
    expect(store.logCache.get(log.id)).toEqual(next)
    // 改早於 early 的日期後重排到最前
    expect(store.containerCache.get(c.id)?.sessions.map((s) => s.id)).toEqual([
      'dsl-001',
      'dsl-early',
    ])
  })

  it('PATCH 成功但 re-GET 失敗：不拋錯、回 null、logCache 失效', async () => {
    const log = createMockDmSessionLog()
    mockGetLog.mockResolvedValueOnce(log).mockRejectedValueOnce(new Error('network down'))
    mockUpdateLog.mockResolvedValue(undefined)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.loadLog(log.containerId, log.id)

    const result = await store.updateLog(
      log.containerId,
      log.id,
      createMockDmSessionLogDraft(log, { title: '新標題' }),
    )

    expect(mockUpdateLog).toHaveBeenCalledTimes(1)
    expect(result).toBeNull()
    expect(store.logCache.has(log.id)).toBe(false)
  })

  it('未載入紀錄時 throw（頁面流程保證先 loadLog）', async () => {
    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await expect(
      store.updateLog('dsc-001', 'ghost', createMockDmSessionLogDraft()),
    ).rejects.toThrow('not loaded')
    expect(mockUpdateLog).not.toHaveBeenCalled()
  })
})

describe('dm-session store — removeLog', () => {
  it('DELETE 後本地移除 logCache 與容器時間軸項', async () => {
    const log = createMockDmSessionLog()
    const c = createMockDmSessionContainer({ sessions: [logToSummary(log)] })
    mockGet.mockResolvedValue(c)
    mockGetLog.mockResolvedValue(log)
    mockRemoveLog.mockResolvedValue(undefined)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.loadContainer(c.id)
    await store.loadLog(c.id, log.id)

    await store.removeLog(c.id, log.id)

    expect(mockRemoveLog).toHaveBeenCalledWith(c.id, log.id)
    expect(store.logCache.has(log.id)).toBe(false)
    expect(store.containerCache.get(c.id)?.sessions).toEqual([])
  })
})

describe('dm-session store — isAtContainerLimit', () => {
  const limits: PlanLimits = {
    maxCharacters: 20,
    maxActiveCharacters: 3,
    maxCampaignRecordsPerCharacter: 100,
    maxMonsterTemplates: 20,
    maxDmSessionContainers: 2,
    maxDmSessionLogsPerContainer: 100,
  }
  const summaries = (n: number): DmSessionContainerSummaryDTO[] =>
    Array.from({ length: n }, (_, i) =>
      containerToSummary(createMockDmSessionContainer({ id: `dsc-${i}` })),
    )

  beforeEach(() => {
    vi.stubGlobal('useAuthStore', useAuthStore)
  })

  it('limits 未就緒時不視為達上限', async () => {
    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    store.list = summaries(99)
    expect(store.isAtContainerLimit).toBe(false)
  })

  it('未達 maxDmSessionContainers 時為 false，達上限為 true', async () => {
    useAuthStore().limits = limits

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    store.list = summaries(1)
    expect(store.isAtContainerLimit).toBe(false)
    store.list = summaries(2)
    expect(store.isAtContainerLimit).toBe(true)
  })
})

describe('dm-session store — reset', () => {
  it('清空 list / cache / loaded / error 等 session-bound state', async () => {
    const log = createMockDmSessionLog()
    const c = createMockDmSessionContainer({ sessions: [logToSummary(log)] })
    mockList.mockResolvedValue([containerToSummary(c)])
    mockGet.mockResolvedValue(c)
    mockGetLog.mockResolvedValue(log)

    const { useDmSessionStore } = await import('~/stores/dm-session')
    const store = useDmSessionStore()
    await store.loadList()
    await store.loadContainer(c.id)
    await store.loadLog(c.id, log.id)
    expect(store.list.length).toBeGreaterThan(0)
    expect(store.containerCache.size).toBeGreaterThan(0)
    expect(store.logCache.size).toBeGreaterThan(0)

    store.reset()

    expect(store.list).toEqual([])
    expect(store.containerCache.size).toBe(0)
    expect(store.logCache.size).toBe(0)
    expect(store.listLoaded).toBe(false)
    expect(store.listError).toBeNull()
    expect(store.detailError).toBeNull()
  })
})
