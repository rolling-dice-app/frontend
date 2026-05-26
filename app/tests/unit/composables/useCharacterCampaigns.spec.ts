import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CampaignRecordCreateBody,
  CampaignRecordDTO,
  CampaignRecordUpdateBody,
  SharedCharacterPreviewDTO,
} from '@rolling-dice-app/core'
import type { CampaignDraft } from '~/types/business/campaign'
import { useCharacterCampaigns } from '~/composables/domain/useCharacterCampaigns'

const CHAR_ID = 'char-001'

const buildPreview = (
  shareId: string,
  overrides: Partial<SharedCharacterPreviewDTO> = {},
): SharedCharacterPreviewDTO => ({
  shareId,
  available: overrides.available ?? true,
  name: overrides.name ?? `角色 ${shareId}`,
  avatar: overrides.avatar ?? null,
  ownerDisplayName: overrides.ownerDisplayName ?? 'OwnerName',
})

const mockList = vi.fn<(id: string) => Promise<CampaignRecordDTO[]>>()
const mockCreate =
  vi.fn<(id: string, body: CampaignRecordCreateBody) => Promise<CampaignRecordDTO>>()
const mockPatch =
  vi.fn<(id: string, recordId: string, body: CampaignRecordUpdateBody) => Promise<void>>()
const mockRemove = vi.fn<(id: string, recordId: string) => Promise<void>>()
const mockApiErrorHandle = vi.fn()
const mockToastError = vi.fn()
const mockT = vi.fn((key: string) => key)
const mockRefetchCurrency = vi.fn<() => Promise<unknown>>()
const authPreference = { applyMoneyToCurrency: true as boolean | undefined }

const buildDto = (overrides: Partial<CampaignRecordDTO> = {}): CampaignRecordDTO => ({
  id: overrides.id ?? 'rec-1',
  characterId: CHAR_ID,
  title: overrides.title ?? '失落礦坑',
  subtitle: overrides.subtitle ?? null,
  content: overrides.content ?? '',
  date: overrides.date ?? '2026-04-30',
  teammates: overrides.teammates ?? [],
  moneyEarning: overrides.moneyEarning ?? { cp: 0, sp: 0, gp: 0, pp: 0 },
  expEarning: overrides.expEarning ?? 0,
  createdAt: overrides.createdAt ?? '2026-04-30T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-04-30T00:00:00.000Z',
})

// 避免直接 import ofetch FetchError（transitive dep；vitest 解不到，見 auth.spec.ts）。
// composable 的 isStaleVersionError 只用 statusCode + data.code，不靠 instanceof，所以這裡用 plain Error + 屬性 mock。
const make409 = (code = 'STALE_CAMPAIGN_RECORD_VERSION'): Error =>
  Object.assign(new Error('Conflict'), { statusCode: 409, data: { code } })

beforeEach(() => {
  mockList.mockReset()
  mockCreate.mockReset()
  mockPatch.mockReset()
  mockRemove.mockReset()
  mockApiErrorHandle.mockReset()
  mockToastError.mockReset()
  mockList.mockResolvedValue([])
  mockCreate.mockImplementation(async (_id, body) =>
    buildDto({
      id: `rec-${Date.now()}`,
      title: body.title,
      content: body.content,
      date: body.date,
      moneyEarning: body.moneyEarning,
      expEarning: body.expEarning,
    }),
  )
  mockPatch.mockResolvedValue(undefined)
  mockRemove.mockResolvedValue(undefined)
  mockRefetchCurrency.mockReset()
  mockRefetchCurrency.mockResolvedValue(null)
  authPreference.applyMoneyToCurrency = true

  vi.stubGlobal('characters', () => ({
    campaignRecords: {
      list: mockList,
      create: mockCreate,
      patch: mockPatch,
      remove: mockRemove,
    },
  }))
  vi.stubGlobal('useApiErrorToast', () => ({ handle: mockApiErrorHandle }))
  vi.stubGlobal('useToast', () => ({ error: mockToastError, success: vi.fn() }))
  vi.stubGlobal('useI18n', () => ({ t: mockT }))
  vi.stubGlobal('useCharacterInventoryStore', () => ({
    refetchCurrency: mockRefetchCurrency,
  }))
  vi.stubGlobal('useAuthStore', () => ({
    user: { preference: authPreference },
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('useCharacterCampaigns — load', () => {
  it('未呼叫 load 時 isReady=false、entries 空', () => {
    const { entries, isReady } = useCharacterCampaigns(CHAR_ID)
    expect(isReady.value).toBe(false)
    expect(entries.value).toEqual([])
  })

  it('load 成功填充 entries 並 isReady=true', async () => {
    mockList.mockResolvedValue([buildDto({ id: 'a', title: 'A', date: '2026-01-10' })])
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.load()
    expect(cmp.isReady.value).toBe(true)
    expect(cmp.entries.value).toHaveLength(1)
    expect(cmp.entries.value[0]!.title).toBe('A')
    expect(cmp.loadError.value).toBeNull()
  })

  it('load 失敗時 loadError 設值、isReady 維持 false', async () => {
    const err = new Error('boom')
    mockList.mockRejectedValue(err)
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.load()
    expect(cmp.isReady.value).toBe(false)
    expect(cmp.loadError.value).toBe(err)
  })

  it('entries 依日期倒序排列', async () => {
    mockList.mockResolvedValue([
      buildDto({ id: '1', title: '舊', date: '2026-01-10' }),
      buildDto({ id: '2', title: '新', date: '2026-04-01' }),
      buildDto({ id: '3', title: '中', date: '2026-03-01' }),
    ])
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.load()
    expect(cmp.entries.value.map((e) => e.title)).toEqual(['新', '中', '舊'])
  })
})

describe('useCharacterCampaigns — addCampaign', () => {
  const draft: CampaignDraft = {
    title: '新場次',
    subtitle: null,
    date: '2026-04-30',
    content: 'demo',
    teammates: [],
    moneyEarning: { cp: 0, sp: 0, gp: 50, pp: 0 },
    expEarning: 100,
  }

  it('create body 不再帶 applyMoneyToCurrency（旗標已搬到 user preference）', async () => {
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.addCampaign(draft)
    expect(mockCreate).toHaveBeenCalledTimes(1)
    const body = mockCreate.mock.calls[0]![1]
    expect(body).not.toHaveProperty('applyMoneyToCurrency')
    expect(body.title).toBe('新場次')
    expect(body.subtitle).toBeNull()
    expect(body.teammates).toEqual([])
  })

  it('create 成功後 entries 加入回傳 DTO', async () => {
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.addCampaign(draft)
    expect(cmp.entries.value).toHaveLength(1)
    expect(cmp.entries.value[0]!.title).toBe('新場次')
  })

  it('create 失敗回 false、走 apiErrorToast.handle', async () => {
    mockCreate.mockRejectedValue(new Error('fail'))
    const cmp = useCharacterCampaigns(CHAR_ID)
    const ok = await cmp.addCampaign(draft)
    expect(ok).toBe(false)
    expect(mockApiErrorHandle).toHaveBeenCalledTimes(1)
  })

  it('preference.applyMoneyToCurrency=true 時 create 成功後 fire inventoryStore.refetchCurrency 刷新背包資產', async () => {
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.addCampaign(draft)
    expect(mockRefetchCurrency).toHaveBeenCalledTimes(1)
  })

  it('preference.applyMoneyToCurrency=false 時不觸發 refetchCurrency', async () => {
    authPreference.applyMoneyToCurrency = false
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.addCampaign(draft)
    expect(mockRefetchCurrency).not.toHaveBeenCalled()
  })

  it('preference.applyMoneyToCurrency=undefined 時視為 true，仍 fire refetchCurrency', async () => {
    authPreference.applyMoneyToCurrency = undefined
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.addCampaign(draft)
    expect(mockRefetchCurrency).toHaveBeenCalledTimes(1)
  })

  it('create 失敗時不觸發 refetchCurrency', async () => {
    mockCreate.mockRejectedValue(new Error('fail'))
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.addCampaign(draft)
    expect(mockRefetchCurrency).not.toHaveBeenCalled()
  })

  it('subtitle 與 teammates preview 會帶到 create body（teammates 攤平成 shareId[]）', async () => {
    const draftWithExtras: CampaignDraft = {
      ...draft,
      subtitle: '失蹤的礦工',
      teammates: [
        buildPreview('chs_AbCdEfGhIjKlMnOpQrStUv'),
        buildPreview('chs_ZzZzZzZzZzZzZzZzZzZzZz', {
          available: false,
          name: null,
          ownerDisplayName: null,
        }),
      ],
    }
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.addCampaign(draftWithExtras)
    const body = mockCreate.mock.calls[0]![1]
    expect(body.subtitle).toBe('失蹤的礦工')
    expect(body.teammates).toEqual(['chs_AbCdEfGhIjKlMnOpQrStUv', 'chs_ZzZzZzZzZzZzZzZzZzZzZz'])
  })
})

describe('useCharacterCampaigns — updateCampaign', () => {
  const draft: CampaignDraft = {
    title: '改名',
    subtitle: null,
    date: '2026-04-30',
    content: '',
    teammates: [],
    moneyEarning: { cp: 0, sp: 0, gp: 0, pp: 0 },
    expEarning: 250,
  }

  it('PATCH body 帶該筆當前 updatedAt 做樂觀鎖', async () => {
    mockList.mockResolvedValue([buildDto({ id: 'rec-1', updatedAt: '2026-04-30T01:00:00.000Z' })])
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.load()
    await cmp.updateCampaign('rec-1', draft)
    expect(mockPatch).toHaveBeenCalledTimes(1)
    expect(mockPatch.mock.calls[0]![2].updatedAt).toBe('2026-04-30T01:00:00.000Z')
  })

  it('PATCH 成功後重新 load 列表', async () => {
    mockList
      .mockResolvedValueOnce([buildDto({ id: 'rec-1', title: '舊' })])
      .mockResolvedValueOnce([buildDto({ id: 'rec-1', title: '新', updatedAt: 'v2' })])
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.load()
    await cmp.updateCampaign('rec-1', draft)
    expect(mockList).toHaveBeenCalledTimes(2)
    expect(cmp.entries.value[0]!.title).toBe('新')
  })

  it('找不到該 id 時直接回 false，不發 PATCH', async () => {
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.load()
    const ok = await cmp.updateCampaign('missing', draft)
    expect(ok).toBe(false)
    expect(mockPatch).not.toHaveBeenCalled()
  })

  it('收到 409 + STALE_CAMPAIGN_RECORD_VERSION 時 toast staleRecord、conflictSignal +1、重新 load', async () => {
    mockList.mockResolvedValue([buildDto({ id: 'rec-1' })])
    mockPatch.mockRejectedValueOnce(make409())
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.load()
    const before = cmp.conflictSignal.value
    const callsBefore = mockList.mock.calls.length
    const ok = await cmp.updateCampaign('rec-1', draft)
    expect(ok).toBe(false)
    expect(mockToastError).toHaveBeenCalledWith('ui.message.staleRecord')
    expect(cmp.conflictSignal.value).toBe(before + 1)
    expect(mockList.mock.calls.length).toBe(callsBefore + 1)
  })

  it('非 409 錯誤走 apiErrorToast.handle 不觸發 conflict', async () => {
    mockList.mockResolvedValue([buildDto({ id: 'rec-1' })])
    mockPatch.mockRejectedValueOnce(new Error('network'))
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.load()
    const before = cmp.conflictSignal.value
    await cmp.updateCampaign('rec-1', draft)
    expect(mockApiErrorHandle).toHaveBeenCalledTimes(1)
    expect(cmp.conflictSignal.value).toBe(before)
  })

  it('subtitle 與 teammates preview 會帶到 PATCH body（teammates 攤平成 shareId[]）', async () => {
    mockList.mockResolvedValue([buildDto({ id: 'rec-1' })])
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.load()
    const draftWithExtras: CampaignDraft = {
      ...draft,
      subtitle: '副標',
      teammates: [buildPreview('chs_AbCdEfGhIjKlMnOpQrStUv')],
    }
    await cmp.updateCampaign('rec-1', draftWithExtras)
    const body = mockPatch.mock.calls[0]![2]
    expect(body.subtitle).toBe('副標')
    expect(body.teammates).toEqual(['chs_AbCdEfGhIjKlMnOpQrStUv'])
  })
})

describe('useCharacterCampaigns — removeCampaign', () => {
  it('DELETE 成功後從 entries 移除該筆，不重新 load', async () => {
    mockList.mockResolvedValue([
      buildDto({ id: 'a', title: 'A', date: '2026-04-29' }),
      buildDto({ id: 'b', title: 'B', date: '2026-04-30' }),
    ])
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.load()
    const listCallsBefore = mockList.mock.calls.length
    await cmp.removeCampaign('a')
    expect(cmp.entries.value).toHaveLength(1)
    expect(cmp.entries.value[0]!.id).toBe('b')
    expect(mockList.mock.calls.length).toBe(listCallsBefore)
  })

  it('DELETE 失敗走 apiErrorToast.handle、entries 不動', async () => {
    mockList.mockResolvedValue([buildDto({ id: 'a' })])
    mockRemove.mockRejectedValueOnce(new Error('fail'))
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.load()
    const ok = await cmp.removeCampaign('a')
    expect(ok).toBe(false)
    expect(cmp.entries.value).toHaveLength(1)
    expect(mockApiErrorHandle).toHaveBeenCalledTimes(1)
  })
})

describe('useCharacterCampaigns — totalExpEarned', () => {
  it('回傳 entries.expEarning 加總', async () => {
    mockList.mockResolvedValue([
      buildDto({ id: '1', expEarning: 100 }),
      buildDto({ id: '2', expEarning: 250 }),
      buildDto({ id: '3', expEarning: 50 }),
    ])
    const cmp = useCharacterCampaigns(CHAR_ID)
    await cmp.load()
    expect(cmp.totalExpEarned.value).toBe(400)
  })
})
