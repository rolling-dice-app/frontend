import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdventuresStorageKey } from '~/constants/storage'
import { createMockCharacter, seedCharacterInStore } from '~/tests/fixtures/character'
import type { AdventureEntry, AdventureEntryDraft, AdventureLog } from '~/types/business/adventure'
import type { CharacterCurrency } from '@rolling-dice-app/core'

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
  characterId: string,
  options: {
    currency?: CharacterCurrency
    seededAdventures?: AdventureLog
  } = {},
) {
  const character = createMockCharacter({
    id: characterId,
    currency: options.currency ?? { cp: 0, sp: 0, gp: 0, pp: 0 },
  })
  seedCharacterInStore(character)
  if (options.seededAdventures) {
    seedAdventures(characterId, options.seededAdventures)
  }

  const { useCharacterStore } = await import('~/stores/character')
  const { useAdventureStore } = await import('~/stores/adventure')
  vi.stubGlobal('useCharacterStore', useCharacterStore)
  vi.stubGlobal('useAdventureStore', useAdventureStore)

  const { useCharacterAdventures } = await import('~/composables/domain/useCharacterAdventures')
  return useCharacterAdventures(characterId)
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
    const { entries, addAdventure } = await getComposable(CHAR_ID)
    addAdventure(makeDraft({ name: '舊任務', date: '2026-01-10' }))
    addAdventure(makeDraft({ name: '新任務', date: '2026-04-01' }))
    addAdventure(makeDraft({ name: '中間任務', date: '2026-03-01' }))
    expect(entries.value.map((e) => e.name)).toEqual(['新任務', '中間任務', '舊任務'])
  })

  it('updateAdventure 更新指定紀錄欄位', async () => {
    const { entries, addAdventure, updateAdventure } = await getComposable(CHAR_ID)
    addAdventure(makeDraft({ name: '舊名', date: '2026-04-30', expEarning: 100 }))
    const id = entries.value[0]!.id
    updateAdventure(id, makeDraft({ name: '新名', date: '2026-04-30', expEarning: 250 }))
    expect(entries.value[0]!.name).toBe('新名')
    expect(entries.value[0]!.expEarning).toBe(250)
  })

  it('removeAdventure 自列表移除指定 id', async () => {
    const { entries, addAdventure, removeAdventure } = await getComposable(CHAR_ID)
    addAdventure(makeDraft({ name: 'A', date: '2026-04-29' }))
    addAdventure(makeDraft({ name: 'B', date: '2026-04-30' }))
    const target = entries.value.find((e) => e.name === 'A')!
    removeAdventure(target.id)
    expect(entries.value).toHaveLength(1)
    expect(entries.value[0]!.name).toBe('B')
  })

  it('totalExpEarned 為所有紀錄 expEarning 加總', async () => {
    const { totalExpEarned, addAdventure } = await getComposable(CHAR_ID)
    addAdventure(makeDraft({ expEarning: 100 }))
    addAdventure(makeDraft({ expEarning: 250 }))
    addAdventure(makeDraft({ expEarning: 50 }))
    expect(totalExpEarned.value).toBe(400)
  })
})

// ─── syncMoneyToCurrency tests skipped: backend 尚未實作 character PATCH endpoint，
//     composable 內 currency 反向計算路徑（呼 store.patchCharacter）會 throw。
//     待 backend update endpoint 上線、store mutation 重新可用後恢復。

describe.skip('useCharacterAdventures — 同步 toggle 開啟時的 currency 反向計算', () => {
  it('add 時 currency 各幣別累加 moneyEarning', async () => {
    const { addAdventure } = await getComposable(CHAR_ID, {
      currency: { cp: 1, sp: 2, gp: 3, pp: 4 },
      seededAdventures: { entries: [], syncMoneyToCurrency: true },
    })
    addAdventure(makeDraft({ moneyEarning: { cp: 5, sp: 5, gp: 5, pp: 5 } }))
  })

  it('update 時 currency 先扣舊 moneyEarning 再加新值', async () => {
    const { entries, addAdventure, updateAdventure } = await getComposable(CHAR_ID, {
      currency: { cp: 0, sp: 0, gp: 100, pp: 0 },
      seededAdventures: { entries: [], syncMoneyToCurrency: true },
    })
    addAdventure(makeDraft({ moneyEarning: { cp: 0, sp: 0, gp: 50, pp: 0 } }))
    const id = entries.value[0]!.id
    updateAdventure(id, makeDraft({ moneyEarning: { cp: 0, sp: 0, gp: 80, pp: 0 } }))
  })

  it('remove 時 currency 扣回該筆 moneyEarning', async () => {
    const { entries, addAdventure, removeAdventure } = await getComposable(CHAR_ID, {
      currency: { cp: 0, sp: 0, gp: 100, pp: 0 },
      seededAdventures: { entries: [], syncMoneyToCurrency: true },
    })
    addAdventure(makeDraft({ moneyEarning: { cp: 0, sp: 0, gp: 30, pp: 0 } }))
    const id = entries.value[0]!.id
    removeAdventure(id)
  })

  it('反向計算可能讓 currency 為負值，不被阻擋', async () => {
    const seeded: AdventureEntry = {
      id: 'seed-spent',
      name: '舊紀錄',
      date: '2026-01-01',
      content: '',
      moneyEarning: { cp: 0, sp: 0, gp: 50, pp: 0 },
      expEarning: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const { removeAdventure } = await getComposable(CHAR_ID, {
      currency: { cp: 0, sp: 0, gp: 10, pp: 0 },
      seededAdventures: { entries: [seeded], syncMoneyToCurrency: true },
    })
    removeAdventure('seed-spent')
  })
})

describe('useCharacterAdventures — 同步 toggle 關閉時不動 currency', () => {
  it('add / update / remove 都不影響 currency', async () => {
    const characterStore = await import('~/stores/character').then((m) => m.useCharacterStore())
    const { entries, addAdventure, updateAdventure, removeAdventure } = await getComposable(
      CHAR_ID,
      {
        currency: { cp: 0, sp: 0, gp: 100, pp: 0 },
        seededAdventures: { entries: [], syncMoneyToCurrency: false },
      },
    )
    addAdventure(makeDraft({ moneyEarning: { cp: 0, sp: 0, gp: 50, pp: 0 } }))
    expect(characterStore.detailCache.get(CHAR_ID)?.currency.gp).toBe(100)
    const id = entries.value[0]!.id
    updateAdventure(id, makeDraft({ moneyEarning: { cp: 0, sp: 0, gp: 80, pp: 0 } }))
    expect(characterStore.detailCache.get(CHAR_ID)?.currency.gp).toBe(100)
    removeAdventure(id)
    expect(characterStore.detailCache.get(CHAR_ID)?.currency.gp).toBe(100)
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
    const characterStore = await import('~/stores/character').then((m) => m.useCharacterStore())
    const { setSyncMoneyToCurrency } = await getComposable(CHAR_ID, {
      currency: { cp: 0, sp: 0, gp: 50, pp: 0 },
      seededAdventures: { entries: [seeded], syncMoneyToCurrency: false },
    })
    setSyncMoneyToCurrency(true)
    expect(characterStore.detailCache.get(CHAR_ID)?.currency.gp).toBe(50)
  })

  it('關閉同步後新增紀錄不影響 currency', async () => {
    const characterStore = await import('~/stores/character').then((m) => m.useCharacterStore())
    const { syncMoneyToCurrency, setSyncMoneyToCurrency, addAdventure } = await getComposable(
      CHAR_ID,
      {
        currency: { cp: 0, sp: 0, gp: 50, pp: 0 },
        seededAdventures: { entries: [], syncMoneyToCurrency: true },
      },
    )
    expect(syncMoneyToCurrency.value).toBe(true)
    setSyncMoneyToCurrency(false)
    addAdventure(makeDraft({ moneyEarning: { cp: 0, sp: 0, gp: 30, pp: 0 } }))
    expect(characterStore.detailCache.get(CHAR_ID)?.currency.gp).toBe(50)
  })
})
