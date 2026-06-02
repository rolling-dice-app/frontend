import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ShareInventoryView from '~/components/business/character/share/ShareInventoryView.vue'
import type { CurrencyAmount, SharedCharacterProfileDTO } from '@rolling-dice-app/core'
import type { SharedInventoryItemViewModel } from '~/types/business/share'

beforeEach(() => {
  vi.stubGlobal('calculateBackpackLoad', () => 0)
  vi.stubGlobal('calculateMaxCarryWeight', () => 100)
  vi.stubGlobal('getTotalScore', () => 10)
  vi.stubGlobal('formatWeight', (n: number) => String(n))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ZERO_CURRENCY: CurrencyAmount = { cp: 0, sp: 0, gp: 0, pp: 0 }

const makeItem = (
  overrides: Partial<SharedInventoryItemViewModel> & Pick<SharedInventoryItemViewModel, 'id'>,
): SharedInventoryItemViewModel => ({
  name: '物品',
  description: null,
  quantity: 1,
  weight: 0,
  type: 'other',
  location: 'backpack',
  isAttuned: false,
  ...overrides,
})

const mountView = (items: SharedInventoryItemViewModel[], attunedCap: number) =>
  mount(ShareInventoryView, {
    props: {
      character: { abilities: { strength: {} } } as unknown as SharedCharacterProfileDTO,
      items,
      currency: ZERO_CURRENCY,
      attunedCap,
    },
    global: {
      stubs: { Icon: true, CommonAppBadge: { template: '<span><slot /></span>' } },
      mocks: {
        calculateBackpackLoad: () => 0,
        calculateMaxCarryWeight: () => 100,
        getTotalScore: () => 10,
        formatWeight: (n: number) => String(n),
      },
    },
  })

describe('ShareInventoryView', () => {
  describe('同調計數', () => {
    it('超量同調時計數用未裁切數量顯示，列表仍裁切至 cap', () => {
      const items = [
        makeItem({ id: 'a', name: '甲', isAttuned: true }),
        makeItem({ id: 'b', name: '乙', isAttuned: true }),
        makeItem({ id: 'c', name: '丙', isAttuned: true }),
        makeItem({ id: 'd', name: '丁', isAttuned: true }),
        makeItem({ id: 'e', name: '戊', isAttuned: true }),
        makeItem({ id: 'f', name: '己', isAttuned: false }),
      ]
      const wrapper = mountView(items, 3)
      // 計數如實顯示 5（非被裁切的 3）
      expect(wrapper.find('#share-inventory-label').exists()).toBe(true)
      const attunementHeading = wrapper.findAll('h3').find((h) => h.text().includes('/'))!
      expect(attunementHeading.text()).toContain('5 / 3')
      // 列表只渲染 cap 內 3 筆
      const attunedList = wrapper.findAll('ul')[0]!
      expect(attunedList.findAll('li')).toHaveLength(3)
    })
  })
})
