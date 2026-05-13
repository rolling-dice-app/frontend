import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCampaignsStorageKey } from '~/constants/storage'
import type {
  CampaignEntry,
  CampaignEntryDraft,
  CampaignLog,
  CurrencyAmount,
} from '~/types/business/campaign'

const CHAR_ID = 'camp-001'

function makeDraft(overrides: Partial<CampaignEntryDraft> = {}): CampaignEntryDraft {
  return {
    name: overrides.name ?? '失落礦坑',
    date: overrides.date ?? '2026-04-30',
    content: overrides.content ?? '',
    moneyEarning: overrides.moneyEarning ?? { cp: 0, sp: 0, gp: 0, pp: 0 },
    expEarning: overrides.expEarning ?? 0,
  }
}

function seedCampaigns(characterId: string, value: CampaignLog): void {
  localStorage.setItem(getCampaignsStorageKey(characterId), JSON.stringify(value))
}

async function getComposable(
  options: {
    currency?: CurrencyAmount
    seededCampaigns?: CampaignLog
  } = {},
) {
  if (options.seededCampaigns) {
    seedCampaigns(CHAR_ID, options.seededCampaigns)
  }

  const { useCharacterStore } = await import('~/stores/character')
  const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
  const { useCampaignStore } = await import('~/stores/campaign')

  vi.stubGlobal('useCharacterStore', useCharacterStore)
  vi.stubGlobal('useCharacterInventoryStore', useCharacterInventoryStore)
  vi.stubGlobal('useCampaignStore', useCampaignStore)

  const inventoryStore = useCharacterInventoryStore()
  const initialCurrency = options.currency ?? { cp: 0, sp: 0, gp: 0, pp: 0 }
  inventoryStore.currency = {
    ...initialCurrency,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
  inventoryStore.updateCurrency = vi.fn(async (body) => {
    inventoryStore.currency = {
      cp: body.cp ?? inventoryStore.currency!.cp,
      sp: body.sp ?? inventoryStore.currency!.sp,
      gp: body.gp ?? inventoryStore.currency!.gp,
      pp: body.pp ?? inventoryStore.currency!.pp,
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
  })

  const { useCharacterCampaigns } = await import('~/composables/domain/useCharacterCampaigns')
  return { ...useCharacterCampaigns(CHAR_ID), inventoryStore }
}

beforeEach(() => {
  vi.resetModules()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  localStorage.clear()
})

describe('useCharacterCampaigns — CRUD 與排序', () => {
  it('addCampaign 將新紀錄加入並回傳依日期倒序的列表', async () => {
    const { entries, addCampaign } = await getComposable()
    await addCampaign(makeDraft({ name: '舊任務', date: '2026-01-10' }))
    await addCampaign(makeDraft({ name: '新任務', date: '2026-04-01' }))
    await addCampaign(makeDraft({ name: '中間任務', date: '2026-03-01' }))
    expect(entries.value.map((e) => e.name)).toEqual(['新任務', '中間任務', '舊任務'])
  })

  it('updateCampaign 更新指定紀錄欄位', async () => {
    const { entries, addCampaign, updateCampaign } = await getComposable()
    await addCampaign(makeDraft({ name: '舊名', date: '2026-04-30', expEarning: 100 }))
    const id = entries.value[0]!.id
    await updateCampaign(id, makeDraft({ name: '新名', date: '2026-04-30', expEarning: 250 }))
    expect(entries.value[0]!.name).toBe('新名')
    expect(entries.value[0]!.expEarning).toBe(250)
  })

  it('removeCampaign 自列表移除指定 id', async () => {
    const { entries, addCampaign, removeCampaign } = await getComposable()
    await addCampaign(makeDraft({ name: 'A', date: '2026-04-29' }))
    await addCampaign(makeDraft({ name: 'B', date: '2026-04-30' }))
    const target = entries.value.find((e) => e.name === 'A')!
    await removeCampaign(target.id)
    expect(entries.value).toHaveLength(1)
    expect(entries.value[0]!.name).toBe('B')
  })

  it('totalExpEarned 為所有紀錄 expEarning 加總', async () => {
    const { totalExpEarned, addCampaign } = await getComposable()
    await addCampaign(makeDraft({ expEarning: 100 }))
    await addCampaign(makeDraft({ expEarning: 250 }))
    await addCampaign(makeDraft({ expEarning: 50 }))
    expect(totalExpEarned.value).toBe(400)
  })
})

describe('useCharacterCampaigns — 同步 toggle 關閉時不動 currency', () => {
  it('add / update / remove 都不影響 currency', async () => {
    const { entries, addCampaign, updateCampaign, removeCampaign, inventoryStore } =
      await getComposable({
        currency: { cp: 0, sp: 0, gp: 100, pp: 0 },
        seededCampaigns: { entries: [], syncMoneyToCurrency: false },
      })
    await addCampaign(makeDraft({ moneyEarning: { cp: 0, sp: 0, gp: 50, pp: 0 } }))
    expect(inventoryStore.currency?.gp).toBe(100)
    const id = entries.value[0]!.id
    await updateCampaign(id, makeDraft({ moneyEarning: { cp: 0, sp: 0, gp: 80, pp: 0 } }))
    expect(inventoryStore.currency?.gp).toBe(100)
    await removeCampaign(id)
    expect(inventoryStore.currency?.gp).toBe(100)
  })
})

describe('useCharacterCampaigns — 切換 toggle 不回算歷史', () => {
  it('開啟同步前已存在的紀錄不會回頭加到 currency', async () => {
    const seeded: CampaignEntry = {
      id: 'seed-1',
      name: '舊紀錄',
      date: '2026-01-01',
      content: '',
      moneyEarning: { cp: 0, sp: 0, gp: 999, pp: 0 },
      expEarning: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const { setSyncMoneyToCurrency, inventoryStore } = await getComposable({
      currency: { cp: 0, sp: 0, gp: 50, pp: 0 },
      seededCampaigns: { entries: [seeded], syncMoneyToCurrency: false },
    })
    setSyncMoneyToCurrency(true)
    expect(inventoryStore.currency?.gp).toBe(50)
  })

  it('關閉同步後新增紀錄不影響 currency', async () => {
    const { syncMoneyToCurrency, setSyncMoneyToCurrency, addCampaign, inventoryStore } =
      await getComposable({
        currency: { cp: 0, sp: 0, gp: 50, pp: 0 },
        seededCampaigns: { entries: [], syncMoneyToCurrency: true },
      })
    expect(syncMoneyToCurrency.value).toBe(true)
    setSyncMoneyToCurrency(false)
    await addCampaign(makeDraft({ moneyEarning: { cp: 0, sp: 0, gp: 30, pp: 0 } }))
    expect(inventoryStore.currency?.gp).toBe(50)
  })
})
