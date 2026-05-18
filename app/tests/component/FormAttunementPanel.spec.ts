import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppSelect from '~/components/common/AppSelect.vue'
import AttunementPanel from '~/components/business/character-form/inventory/AttunementPanel.vue'
import type { InventoryItemDTO } from '@rolling-dice-app/core'

const makeItem = (overrides: Partial<InventoryItemDTO> = {}): InventoryItemDTO => ({
  id: overrides.id ?? `i-${Math.random()}`,
  name: '魔法戒指',
  description: null,
  quantity: 1,
  weight: 0,
  type: 'other',
  location: 'backpack',
  isAttuned: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const mountPanel = (
  params: { allItems?: InventoryItemDTO[]; attunedItems?: InventoryItemDTO[]; cap?: number } = {},
) =>
  mount(AttunementPanel, {
    props: {
      allItems: params.allItems ?? [],
      attunedItems: params.attunedItems ?? [],
      cap: params.cap ?? 3,
    },
    global: {
      components: { CommonAppSelect: AppSelect },
    },
  })

describe('AttunementPanel (form)', () => {
  describe('渲染', () => {
    it('永遠渲染 3 個 slot', () => {
      const wrapper = mountPanel()
      expect(wrapper.findAll('label[for^="attunement-slot-"]')).toHaveLength(3)
    })

    it('總計顯示「已同調 N / 3」', () => {
      const ring = makeItem({ id: 'ring', name: '魔法戒指' })
      const wrapper = mountPanel({ allItems: [ring], attunedItems: [ring] })
      expect(wrapper.text()).toContain('已同調：1 / 3')
    })

    it('已同調 slot 顯示對應 item 名稱', () => {
      const ring = makeItem({ id: 'ring', name: '魔法戒指' })
      const wrapper = mountPanel({ allItems: [ring], attunedItems: [ring] })
      expect(wrapper.text()).toContain('魔法戒指')
    })
  })

  describe('解除同調 emit', () => {
    it('selecting 解除同調（none）emit update [slotIndex, null]', async () => {
      const ring = makeItem({ id: 'ring', name: '魔法戒指' })
      const wrapper = mountPanel({ allItems: [ring], attunedItems: [ring] })
      const slot1 = wrapper.findComponent({ name: 'Select' })
      slot1.vm.$emit('update:modelValue', 'none')
      expect(wrapper.emitted('update')?.at(-1)).toEqual([0, null])
    })

    it('null 值（清除選項）也視為解除', async () => {
      const ring = makeItem({ id: 'ring' })
      const wrapper = mountPanel({ allItems: [ring], attunedItems: [ring] })
      const slot1 = wrapper.findComponent({ name: 'Select' })
      slot1.vm.$emit('update:modelValue', null)
      expect(wrapper.emitted('update')?.at(-1)).toEqual([0, null])
    })
  })

  describe('選擇物品 emit', () => {
    it('選擇 item id emit update [slotIndex, id]', async () => {
      const ring = makeItem({ id: 'ring', name: '魔法戒指' })
      const wrapper = mountPanel({ allItems: [ring], attunedItems: [] })
      const slot1 = wrapper.findComponent({ name: 'Select' })
      slot1.vm.$emit('update:modelValue', 'ring')
      expect(wrapper.emitted('update')?.at(-1)).toEqual([0, 'ring'])
    })

    it('第二 slot 選擇時 slotIndex = 1', async () => {
      const ring = makeItem({ id: 'ring', name: '魔法戒指' })
      const wrapper = mountPanel({ allItems: [ring], attunedItems: [] })
      const slots = wrapper.findAllComponents({ name: 'Select' })
      slots[1]!.vm.$emit('update:modelValue', 'ring')
      expect(wrapper.emitted('update')?.at(-1)).toEqual([1, 'ring'])
    })
  })
})
