import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdventuresStorageKey } from '~/constants/storage'
import type {
  AdventureEntry,
  AdventureEntryDraft,
  AdventureLog,
  CurrencyAmount,
} from '~/types/business/adventure'

const CHAR_ID = 'adv-001'

function makeDraft(overrides: Partial<AdventureEntryDraft> = {}): AdventureEntryDraft {
  return {
    name: overrides.name ?? '失落礦坑',
    date: overrides.date ?? '2026-04-30',
    content: overrides.content ?? '',
    moneyEarning: overrides.moneyEarning ?? { cp: 0, sp: 0, gp: 0, pp: 0 },
    expEarning: overrides.expEarning ?? 0,
  }
}

function seedAdventures(characterId: string, value: AdventureLog): void {
  localStorage.setItem(getAdventuresStorageKey(characterId), JSON.stringify(value))
}

async function getComposable(
  options: {
    currency?: CurrencyAmount
    seededAdventures?: AdventureLog
  } = {},
) {
  if (options.seededAdventures) {
    seedAdventures(CHAR_ID, options.seededAdventures)
  }

  const { useCharacterStore } = await import('~/stores/character')
  const { useCharacterInventoryStore } = await import('~/stores/character-inventory')
  const { useAdventureStore } = await import('~/stores/adventure')

  vi.stubGlobal('useCharacterStore', useCharacterStore)
  vi.stubGlobal('useCharacterInventoryStore', useCharacterInventoryStore)
  vi.stubGlobal('useAdventureStore', useAdventureStore)

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

  const { useCharacterAdventures } = await import('~/composables/domain/useCharacterAdventures')
  return { ...useCharacterAdventures(CHAR_ID), inventoryStore }
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

describe('useCharacterAdventures — CRUD 與排序', () => {
  it('addAdventure 將新紀錄加入並回傳依日期倒序的列表', async () => {
    const { entries, addAdventure } = await getComposable()
    await addAdventure(makeDraft({ name: '舊任務', date: '2026-01-10' }))
    await addAdventure(makeDraft({ name: '新任務', date: '2026-04-01' }))
    await addAdventure(makeDraft({ name: '中間任務', date: '2026-03-01' }))
    expect(entries.value.map((e) => e.name)).toEqual(['新任務', '中間任務', '舊任務'])
  })

  it('updateAdventure 更新指定紀錄欄位', async () => {
    const { entries, addAdventure, updateAdventure } = await getComposable()
    await addAdventure(makeDraft({ name: '舊名', date: '2026-04-30', expEarning: 100 }))
    const id = entries.value[0]!.id
    await updateAdventure(id, makeDraft({ name: '新名', date: '2026-04-30', expEarning: 250 }))
    expect(entries.value[0]!.name).toBe('新名')
    expect(entries.value[0]!.expEarning).toBe(250)
  })

  it('removeAdventure 自列表移除指定 id', async () => {
    const { entries, addAdventure, removeAdventure } = await getComposable()
    await addAdventure(makeDraft({ name: 'A', date: '2026-04-29' }))
    await addAdventure(makeDraft({ name: 'B', date: '2026-04-30' }))
    const target = entries.value.find((e) => e.name === 'A')!
    await removeAdventure(target.id)
    expect(entries.value).toHaveLength(1)
    expect(entries.value[0]!.name).toBe('B')
  })

  it('totalExpEarned 為所有紀錄 expEarning 加總', async () => {
    const { totalExpEarned, addAdventure } = await getComposable()
    await addAdventure(makeDraft({ expEarning: 100 }))
    await addAdventure(makeDraft({ expEarning: 250 }))
    await addAdventure(makeDraft({ expEarning: 50 }))
    expect(totalExpEarned.value).toBe(400)
  })
})

describe('useCharacterAdventures — 同步 toggle 關閉時不動 currency', () => {
  it('add / update / remove 都不影響 currency', async () => {
    const { entries, addAdventure, updateAdventure, removeAdventure, inventoryStore } =
      await getComposable({
        currency: { cp: 0, sp: 0, gp: 100, pp: 0 },
        seededAdventures: { entries: [], syncMoneyToCurrency: false },
      })
    await addAdventure(makeDraft({ moneyEarning: { cp: 0, sp: 0, gp: 50, pp: 0 } }))
    expect(inventoryStore.currency?.gp).toBe(100)
    const id = entries.value[0]!.id
    await updateAdventure(id, makeDraft({ moneyEarning: { cp: 0, sp: 0, gp: 80, pp: 0 } }))
    expect(inventoryStore.currency?.gp).toBe(100)
    await removeAdventure(id)
    expect(inventoryStore.currency?.gp).toBe(100)
  })
})

describe('useCharacterAdventures — 切換 toggle 不回算歷史', () => {
  it('開啟同步前已存在的紀錄不會回頭加到 currency', async () => {
    const seeded: AdventureEntry = {
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
      seededAdventures: { entries: [seeded], syncMoneyToCurrency: false },
    })
    setSyncMoneyToCurrency(true)
    expect(inventoryStore.currency?.gp).toBe(50)
  })

  it('關閉同步後新增紀錄不影響 currency', async () => {
    const { syncMoneyToCurrency, setSyncMoneyToCurrency, addAdventure, inventoryStore } =
      await getComposable({
        currency: { cp: 0, sp: 0, gp: 50, pp: 0 },
        seededAdventures: { entries: [], syncMoneyToCurrency: true },
      })
    expect(syncMoneyToCurrency.value).toBe(true)
    setSyncMoneyToCurrency(false)
    await addAdventure(makeDraft({ moneyEarning: { cp: 0, sp: 0, gp: 30, pp: 0 } }))
    expect(inventoryStore.currency?.gp).toBe(50)
  })
})
