import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  MonsterTemplateCreateBody,
  MonsterTemplateDTO,
  MonsterTemplateSummaryDTO,
  MonsterTemplateUpdateBody,
  PlanLimits,
} from '@rolling-dice-app/core'
import {
  createMockMonsterFormState,
  createMockMonsterTemplate,
  monsterToSummary,
} from '~/tests/fixtures/monster'
import { useAuthStore } from '~/stores/auth'

const mockList = vi.fn<() => Promise<MonsterTemplateSummaryDTO[]>>()
const mockGet = vi.fn<(id: string) => Promise<MonsterTemplateDTO>>()
const mockCreate = vi.fn<(body: MonsterTemplateCreateBody) => Promise<MonsterTemplateDTO>>()
const mockUpdate = vi.fn<(id: string, body: MonsterTemplateUpdateBody) => Promise<void>>()
const mockRemove = vi.fn<(id: string) => Promise<void>>()

beforeEach(() => {
  vi.resetModules()
  setActivePinia(createPinia())
  mockList.mockReset()
  mockGet.mockReset()
  mockCreate.mockReset()
  mockUpdate.mockReset()
  mockRemove.mockReset()
  vi.stubGlobal('monsterTemplates', () => ({
    list: mockList,
    get: mockGet,
    create: mockCreate,
    update: mockUpdate,
    remove: mockRemove,
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('monster-template store — loadList', () => {
  it('成功時將 backend summary 寫入 list 並設 listLoaded', async () => {
    const m = createMockMonsterTemplate()
    mockList.mockResolvedValue([monsterToSummary(m)])

    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    await store.loadList()

    expect(store.list).toEqual([monsterToSummary(m)])
    expect(store.listLoaded).toBe(true)
    expect(store.listLoading).toBe(false)
    expect(store.listError).toBeNull()
  })

  it('失敗時 listError 被設定且 rethrow', async () => {
    const err = new Error('boom')
    mockList.mockRejectedValue(err)

    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    await expect(store.loadList()).rejects.toThrow('boom')
    expect(store.listError).toBe(err)
    expect(store.listLoaded).toBe(false)
    expect(store.listLoading).toBe(false)
  })

  it('並發 loadList 單飛：飛行中不平行打 API', async () => {
    let resolveFn: (v: MonsterTemplateSummaryDTO[]) => void = () => {}
    mockList.mockReturnValue(
      new Promise<MonsterTemplateSummaryDTO[]>((resolve) => {
        resolveFn = resolve
      }),
    )

    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    const p1 = store.loadList()
    const p2 = store.loadList()
    expect(mockList).toHaveBeenCalledTimes(1)
    resolveFn([])
    await Promise.all([p1, p2])
  })
})

describe('monster-template store — ensureListLoaded', () => {
  it('未載入時打 API；已載入後 no-op', async () => {
    mockList.mockResolvedValue([])

    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    await store.ensureListLoaded()
    await store.ensureListLoaded()

    expect(mockList).toHaveBeenCalledTimes(1)
  })
})

describe('monster-template store — loadDetail / getById', () => {
  it('loadDetail 寫入 detailCache；getById 回防禦性 clone', async () => {
    const m = createMockMonsterTemplate()
    mockGet.mockResolvedValue(m)

    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    await store.loadDetail(m.id)

    const got = store.getById(m.id)
    expect(got).toEqual(m)
    // 改寫回傳值不得污染 cache
    got!.name = '被改壞的名字'
    got!.attacks.push({ id: 'x', name: 'x', hitBonus: 0, damageDice: [], comment: null })
    expect(store.getById(m.id)).toEqual(m)
  })

  it('失敗時 detailError 被設定且 rethrow', async () => {
    const err = new Error('404-ish')
    mockGet.mockRejectedValue(err)

    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    await expect(store.loadDetail('nope')).rejects.toThrow('404-ish')
    expect(store.detailError).toBe(err)
  })
})

describe('monster-template store — createMonsterTemplate', () => {
  it('POST body 剝除 id；成功後 cache 完整 DTO，summary 置頂 list（對齊 updatedAt desc）', async () => {
    const existing = createMockMonsterTemplate({ id: 'old-1', name: '舊怪' })
    mockList.mockResolvedValue([monsterToSummary(existing)])
    const created = createMockMonsterTemplate({ id: 'new-1', name: '紅龍' })
    mockCreate.mockResolvedValue(created)

    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    await store.loadList()
    const view = createMockMonsterFormState(created, { id: '' })
    const result = await store.createMonsterTemplate(view)

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const body = mockCreate.mock.calls[0]![0]
    expect(body).not.toHaveProperty('id')
    expect(body.name).toBe('紅龍')

    expect(result).toEqual(created)
    expect(store.detailCache.get('new-1')).toEqual(created)
    expect(store.list).toEqual([monsterToSummary(created), monsterToSummary(existing)])
  })
})

describe('monster-template store — updateMonsterTemplate', () => {
  it('無 diff 時不打 API，直接回 cache clone', async () => {
    const m = createMockMonsterTemplate()
    mockGet.mockResolvedValue(m)

    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    await store.loadDetail(m.id)

    const result = await store.updateMonsterTemplate(m.id, createMockMonsterFormState(m))
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(result).toEqual(m)
  })

  it('有 diff 時 PATCH 只含變更欄位 + updatedAt，成功後 re-GET 刷 cache；列表不動（導頁後必重抓）', async () => {
    const other = createMockMonsterTemplate({ id: 'other-1', name: '別隻怪' })
    const m = createMockMonsterTemplate()
    const next = { ...m, ac: 16, updatedAt: '2026-01-03T00:00:00.000Z' }
    mockList.mockResolvedValue([monsterToSummary(other), monsterToSummary(m)])
    mockGet.mockResolvedValueOnce(m).mockResolvedValueOnce(next)
    mockUpdate.mockResolvedValue(undefined)

    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    await store.loadList()
    await store.loadDetail(m.id)

    const result = await store.updateMonsterTemplate(
      m.id,
      createMockMonsterFormState(m, { ac: 16 }),
    )

    expect(mockUpdate).toHaveBeenCalledWith(m.id, { updatedAt: m.updatedAt, ac: 16 })
    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(result?.updatedAt).toBe(next.updatedAt)
    expect(store.detailCache.get(m.id)).toEqual(next)
    expect(store.list).toEqual([monsterToSummary(other), monsterToSummary(m)])
  })

  it('PATCH 成功但 re-GET 失敗：不拋錯、回 null、cache 失效、列表不動', async () => {
    const other = createMockMonsterTemplate({ id: 'other-1', name: '別隻怪' })
    const m = createMockMonsterTemplate()
    mockList.mockResolvedValue([monsterToSummary(other), monsterToSummary(m)])
    mockGet.mockResolvedValueOnce(m).mockRejectedValueOnce(new Error('network down'))
    mockUpdate.mockResolvedValue(undefined)

    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    await store.loadList()
    await store.loadDetail(m.id)

    const result = await store.updateMonsterTemplate(
      m.id,
      createMockMonsterFormState(m, { ac: 16 }),
    )

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(result).toBeNull()
    // 舊 lock token 已作廢：cache 必須失效，避免原地重試撞 409
    expect(store.detailCache.has(m.id)).toBe(false)
    expect(store.list.map((t) => t.id)).toEqual([other.id, m.id])
  })

  it('未載入 detail 時 throw（頁面流程保證先 loadDetail）', async () => {
    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    await expect(
      store.updateMonsterTemplate('ghost', createMockMonsterFormState()),
    ).rejects.toThrow('not loaded')
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('monster-template store — removeMonsterTemplate', () => {
  it('DELETE 後本地移除 list 項與 cache，不重打 list API', async () => {
    const m = createMockMonsterTemplate()
    mockList.mockResolvedValue([monsterToSummary(m)])
    mockGet.mockResolvedValue(m)
    mockRemove.mockResolvedValue(undefined)

    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    await store.loadList()
    await store.loadDetail(m.id)

    await store.removeMonsterTemplate(m.id)

    expect(mockRemove).toHaveBeenCalledWith(m.id)
    expect(store.list).toEqual([])
    expect(store.detailCache.has(m.id)).toBe(false)
    expect(mockList).toHaveBeenCalledTimes(1)
  })
})

describe('monster-template store — isAtMonsterTemplateLimit', () => {
  const limits: PlanLimits = {
    maxCharacters: 20,
    maxActiveCharacters: 3,
    maxCampaignRecordsPerCharacter: 100,
    maxMonsterTemplates: 2,
    maxDmSessionContainers: 10,
    maxDmSessionLogsPerContainer: 100,
  }
  const summaries = (n: number): MonsterTemplateSummaryDTO[] =>
    Array.from({ length: n }, (_, i) =>
      monsterToSummary(createMockMonsterTemplate({ id: `mt-${i}` })),
    )

  beforeEach(() => {
    vi.stubGlobal('useAuthStore', useAuthStore)
  })

  it('limits 未就緒時不視為達上限', async () => {
    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    store.list = summaries(99)
    expect(store.isAtMonsterTemplateLimit).toBe(false)
  })

  it('未達 maxMonsterTemplates 時為 false，達上限為 true', async () => {
    useAuthStore().limits = limits

    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    store.list = summaries(1)
    expect(store.isAtMonsterTemplateLimit).toBe(false)
    store.list = summaries(2)
    expect(store.isAtMonsterTemplateLimit).toBe(true)
  })
})

describe('monster-template store — reset', () => {
  it('清空 list / detailCache / loaded / error 等 session-bound state', async () => {
    const m = createMockMonsterTemplate()
    mockList.mockResolvedValue([monsterToSummary(m)])
    mockGet.mockResolvedValue(m)

    const { useMonsterTemplateStore } = await import('~/stores/monster-template')
    const store = useMonsterTemplateStore()
    await store.loadList()
    await store.loadDetail(m.id)
    expect(store.list.length).toBeGreaterThan(0)
    expect(store.detailCache.size).toBeGreaterThan(0)

    store.reset()

    expect(store.list).toEqual([])
    expect(store.detailCache.size).toBe(0)
    expect(store.listLoaded).toBe(false)
    expect(store.listError).toBeNull()
    expect(store.detailError).toBeNull()
  })
})
