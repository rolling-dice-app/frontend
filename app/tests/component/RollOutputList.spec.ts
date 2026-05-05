import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RollOutputList from '~/components/business/character/quickview/RollOutputList.vue'
import { formatModifier } from '~/helpers/ability'
import type { D20RollEntry, DamageRollEntry, RollEntry } from '~/types/business/dice'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const makeD20Entry = (overrides: Partial<D20RollEntry> = {}): D20RollEntry => ({
  id: 'r-1',
  rolledAt: 0,
  kind: 'ability',
  label: '力量',
  mode: 'normal',
  rolls: [12],
  chosen: 12,
  modifier: 3,
  total: 15,
  isCritical: false,
  isFumble: false,
  ...overrides,
})

const makeDamageEntry = (overrides: Partial<DamageRollEntry> = {}): DamageRollEntry => ({
  id: 'd-1',
  rolledAt: 0,
  kind: 'attack-damage',
  label: '長劍 傷害',
  lines: [{ rolls: [5], sides: 8, count: 1, bonus: 3, damageType: 'slashing', subtotal: 8 }],
  total: 8,
  isCritical: false,
  ...overrides,
})

const mountList = (entries: RollEntry[] = []) =>
  mount(RollOutputList, {
    props: { entries },
    global: { mocks: { formatModifier } },
  })

const clearBtn = (wrapper: ReturnType<typeof mountList>) =>
  wrapper.find('button[aria-label="清空擲骰歷史"]')

describe('RollOutputList', () => {
  describe('空狀態', () => {
    it('entries = [] 顯示「無擲骰紀錄」、清空按鈕 disabled', () => {
      const wrapper = mountList()
      expect(wrapper.text()).toContain('無擲骰紀錄')
      expect(clearBtn(wrapper).attributes('disabled')).toBeDefined()
    })

    it('entries 有資料時 disabled 解除', () => {
      const wrapper = mountList([makeD20Entry()])
      expect(clearBtn(wrapper).attributes('disabled')).toBeUndefined()
    })
  })

  describe('清空互動', () => {
    it('點清空 emit clear', async () => {
      const wrapper = mountList([makeD20Entry()])
      await clearBtn(wrapper).trigger('click')
      expect(wrapper.emitted('clear')).toEqual([[]])
    })
  })

  describe('d20 entry 渲染', () => {
    it('一般擲骰：顯示骰值 / modifier / total，不顯示 advantage / disadvantage 標籤', () => {
      const wrapper = mountList([makeD20Entry({ rolls: [12], chosen: 12, modifier: 3, total: 15 })])
      const text = wrapper.text()
      expect(text).toContain('力量')
      expect(text).toContain('12')
      expect(text).toContain('+3')
      expect(text).toContain('15')
      expect(text).not.toContain('優勢')
      expect(text).not.toContain('劣勢')
    })

    it('優勢顯示「優勢」標籤', () => {
      const wrapper = mountList([makeD20Entry({ mode: 'advantage', rolls: [10, 18], chosen: 18 })])
      expect(wrapper.text()).toContain('優勢')
    })

    it('劣勢顯示「劣勢」標籤', () => {
      const wrapper = mountList([
        makeD20Entry({ mode: 'disadvantage', rolls: [10, 18], chosen: 10 }),
      ])
      expect(wrapper.text()).toContain('劣勢')
    })

    it('isCritical 顯示「大成功」標籤', () => {
      const wrapper = mountList([makeD20Entry({ chosen: 20, isCritical: true })])
      expect(wrapper.text()).toContain('大成功')
    })

    it('isFumble 顯示「大失敗」標籤', () => {
      const wrapper = mountList([makeD20Entry({ chosen: 1, isFumble: true })])
      expect(wrapper.text()).toContain('大失敗')
    })

    it('modifier = 0 不顯示加值區段', () => {
      const wrapper = mountList([makeD20Entry({ modifier: 0, total: 12 })])
      // 不應出現 +0
      expect(wrapper.text()).not.toContain('+0')
    })
  })

  describe('傷害 entry 渲染', () => {
    it('顯示骰值與 total、不顯示 advantage / disadvantage 標籤', () => {
      const wrapper = mountList([makeDamageEntry()])
      const text = wrapper.text()
      expect(text).toContain('長劍 傷害')
      expect(text).toContain('1d8')
      expect(text).toContain('[5]')
      expect(text).toContain('+3')
      expect(text).toContain('劈砍')
      expect(text).toContain('8')
      expect(text).not.toContain('優勢')
    })

    it('isCritical 顯示「重擊」標籤', () => {
      const wrapper = mountList([makeDamageEntry({ isCritical: true })])
      expect(wrapper.text()).toContain('重擊')
    })

    it('多行傷害以 + 連接', () => {
      const wrapper = mountList([
        makeDamageEntry({
          lines: [
            { rolls: [5], sides: 8, count: 1, bonus: 3, damageType: 'slashing', subtotal: 8 },
            { rolls: [3], sides: 6, count: 1, bonus: 0, damageType: 'fire', subtotal: 3 },
          ],
          total: 11,
        }),
      ])
      const text = wrapper.text().replace(/\s+/g, '')
      expect(text).toContain('1d8')
      expect(text).toContain('1d6')
      expect(text).toContain('+')
    })

    it('純加值行（sides = null）以 bonus + 類型顯示', () => {
      const wrapper = mountList([
        makeDamageEntry({
          lines: [
            { rolls: [], sides: null, count: 0, bonus: 10, damageType: 'acid', subtotal: 10 },
          ],
          total: 10,
        }),
      ])
      expect(wrapper.text()).toContain('10')
      expect(wrapper.text()).toContain('酸蝕')
    })
  })
})
