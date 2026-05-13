import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CAMPAIGNS_STORAGE_PREFIX, getCampaignsStorageKey } from '~/constants/storage'
import { useCampaignStore } from '~/stores/campaign'
import type { CampaignLog } from '~/types/business/campaign'

const UNRELATED_KEY = 'rd:unrelated:fixture'

function makePayload(overrides: Partial<CampaignLog> = {}): CampaignLog {
  return {
    entries: overrides.entries ?? [
      {
        id: 'a-1',
        name: '失落礦坑',
        date: '2026-04-30',
        content: 'demo',
        moneyEarning: { cp: 0, sp: 0, gp: 50, pp: 0 },
        expEarning: 100,
        createdAt: '2026-04-30T00:00:00.000Z',
      },
    ],
    syncMoneyToCurrency: overrides.syncMoneyToCurrency ?? false,
  }
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  localStorage.clear()
})

describe('useCampaignStore — load', () => {
  it('storage 無資料時回傳空集合', () => {
    const store = useCampaignStore()
    const result = store.load('char-x')
    expect(result.entries).toEqual([])
    expect(result.syncMoneyToCurrency).toBe(false)
  })

  it('storage 有資料時自 localStorage 載入', () => {
    const payload = makePayload()
    localStorage.setItem(getCampaignsStorageKey('char-1'), JSON.stringify(payload))
    const store = useCampaignStore()
    const result = store.load('char-1')
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]!.name).toBe('失落礦坑')
  })

  it('多次 load 同一角色回傳互相獨立的物件，避免外部修改污染 cache', () => {
    const store = useCampaignStore()
    const a = store.load('char-1')
    a.entries.push({
      id: 'mutated',
      name: 'should not appear',
      date: '2026-05-01',
      content: '',
      moneyEarning: { cp: 0, sp: 0, gp: 0, pp: 0 },
      expEarning: 0,
      createdAt: '2026-05-01T00:00:00.000Z',
    })
    const b = store.load('char-1')
    expect(b.entries).toHaveLength(0)
  })
})

describe('useCampaignStore — save', () => {
  it('save 後 load 應反映最新資料', () => {
    const store = useCampaignStore()
    store.save('char-1', makePayload({ syncMoneyToCurrency: true }))
    const result = store.load('char-1')
    expect(result.syncMoneyToCurrency).toBe(true)
    expect(result.entries).toHaveLength(1)
  })

  it('save 同步寫入 localStorage', () => {
    const store = useCampaignStore()
    const payload = makePayload()
    store.save('char-1', payload)
    const raw = localStorage.getItem(getCampaignsStorageKey('char-1'))
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toEqual(payload)
  })
})

describe('useCampaignStore — remove', () => {
  it('remove 清除指定角色的紀錄與 storage key', () => {
    const store = useCampaignStore()
    store.save('char-1', makePayload())
    expect(localStorage.getItem(getCampaignsStorageKey('char-1'))).not.toBeNull()
    store.remove('char-1')
    expect(localStorage.getItem(getCampaignsStorageKey('char-1'))).toBeNull()
    expect(store.load('char-1').entries).toEqual([])
  })

  it('remove 不影響其他角色', () => {
    const store = useCampaignStore()
    store.save('char-1', makePayload())
    store.save('char-2', makePayload())
    store.remove('char-1')
    expect(store.load('char-2').entries).toHaveLength(1)
  })
})

describe('useCampaignStore — removeAll', () => {
  it('removeAll 清除所有戰役前綴的 storage key', () => {
    const store = useCampaignStore()
    store.save('char-1', makePayload())
    store.save('char-2', makePayload())
    store.save('char-3', makePayload())
    store.removeAll()
    expect(localStorage.getItem(getCampaignsStorageKey('char-1'))).toBeNull()
    expect(localStorage.getItem(getCampaignsStorageKey('char-2'))).toBeNull()
    expect(localStorage.getItem(getCampaignsStorageKey('char-3'))).toBeNull()
  })

  it('removeAll 不會刪除其他前綴的 key', () => {
    localStorage.setItem(UNRELATED_KEY, JSON.stringify([{ id: 'unrelated' }]))
    localStorage.setItem('roll-dice:combat-state:char-1', JSON.stringify({ hp: 10 }))
    localStorage.setItem('rd:character-view-mode', 'grid')

    const store = useCampaignStore()
    store.save('char-1', makePayload())
    store.removeAll()

    expect(localStorage.getItem(UNRELATED_KEY)).not.toBeNull()
    expect(localStorage.getItem('roll-dice:combat-state:char-1')).not.toBeNull()
    expect(localStorage.getItem('rd:character-view-mode')).toBe('grid')
    expect(localStorage.getItem(getCampaignsStorageKey('char-1'))).toBeNull()
  })

  it('removeAll 清空記憶體 cache，後續 load 從 storage 重讀', () => {
    const store = useCampaignStore()
    store.save('char-1', makePayload())
    store.removeAll()
    // 直接用 native API 寫入新資料
    localStorage.setItem(
      getCampaignsStorageKey('char-1'),
      JSON.stringify(makePayload({ syncMoneyToCurrency: true })),
    )
    expect(store.load('char-1').syncMoneyToCurrency).toBe(true)
  })

  it('CAMPAIGNS_STORAGE_PREFIX 與實際使用的 storage key 對齊', () => {
    expect(getCampaignsStorageKey('x')).toBe(`${CAMPAIGNS_STORAGE_PREFIX}x`)
  })
})
