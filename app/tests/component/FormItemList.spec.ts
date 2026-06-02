import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import AppInput from '~/components/common/AppInput.vue'
import AppSelect from '~/components/common/AppSelect.vue'
import AppButton from '~/components/common/AppButton.vue'
import AppBadge from '~/components/common/AppBadge.vue'
import ItemList from '~/components/business/character-form/inventory/ItemList.vue'
import { calculateItemsWeight, formatWeight } from '~/helpers/inventory'
import type { InventoryItemDTO } from '@rolling-dice-app/core'

beforeEach(() => {
  vi.stubGlobal('calculateItemsWeight', calculateItemsWeight)
  vi.stubGlobal('formatWeight', formatWeight)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ModalStub = {
  name: 'Modal',
  props: ['modelValue', 'title', 'size', 'bgColor', 'textColor', 'borderColor'],
  emits: ['update:modelValue'],
  template: `
    <div v-if="modelValue" data-modal>
      <h2>{{ title }}</h2>
      <slot />
      <div data-modal-footer><slot name="footer" /></div>
    </div>`,
}

const ButtonStub = {
  name: 'Button',
  props: ['radius', 'disabled', 'bgColor'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
}

const BadgeStub = {
  name: 'Badge',
  props: ['size', 'bgColor'],
  template: '<span class="badge"><slot /></span>',
}

const TextAreaStub = {
  name: 'TextArea',
  props: ['modelValue', 'border', 'rows', 'maxlength', 'showCount'],
  emits: ['update:modelValue'],
  template: `
    <textarea
      :id="$attrs.id"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />`,
  inheritAttrs: false,
}

const makeItem = (overrides: Partial<InventoryItemDTO> = {}): InventoryItemDTO => ({
  id: overrides.id ?? `i-${Math.random()}`,
  name: '長劍',
  description: null,
  quantity: 1,
  weight: 3,
  type: 'weapon',
  location: 'backpack',
  isAttuned: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const mountList = (
  params: {
    items?: InventoryItemDTO[]
    totalItemCount?: number
    section?: 'backpack' | 'dimensionalBag'
    title?: string
    pendingItemIds?: Set<string>
  } = {},
) =>
  mount(ItemList, {
    props: {
      items: params.items ?? [],
      totalItemCount: params.totalItemCount ?? params.items?.length ?? 0,
      section: params.section ?? 'backpack',
      title: params.title ?? '背包',
      pendingItemIds: params.pendingItemIds ?? new Set<string>(),
    },
    global: {
      stubs: {
        Icon: true,
        Modal: ModalStub,
        Button: ButtonStub,
        Badge: BadgeStub,
        TextArea: TextAreaStub,
      },
      components: {
        CommonAppInput: AppInput,
        CommonAppSelect: AppSelect,
        CommonAppButton: AppButton,
        CommonAppBadge: AppBadge,
      },
      mocks: { calculateItemsWeight, formatWeight },
    },
  })

const addBtn = (wrapper: ReturnType<typeof mountList>) =>
  wrapper.find('button[aria-label="新增物品"]')

describe('ItemList (form)', () => {
  describe('Header 與列表', () => {
    it('顯示 title、件數與總重', () => {
      const wrapper = mountList({
        items: [makeItem({ name: '長劍', weight: 3, quantity: 1 })],
        title: '背包',
      })
      expect(wrapper.text()).toContain('背包')
      expect(wrapper.text()).toContain('1 件')
      expect(wrapper.text()).toContain('總重')
      expect(wrapper.text()).toContain('3')
    })

    it('items = [] 只渲染新增按鈕', () => {
      const wrapper = mountList()
      expect(wrapper.find('button[aria-label="新增物品"]').exists()).toBe(true)
      expect(wrapper.findAll('ul > li')).toHaveLength(1) // 僅新增按鈕
      expect(wrapper.text()).toContain('0 件')
    })

    it('多 item 各自一 row', () => {
      const wrapper = mountList({
        items: [makeItem({ id: 'a', name: '長劍' }), makeItem({ id: 'b', name: '盾牌' })],
      })
      expect(wrapper.findAll('ul > li')).toHaveLength(3) // 新增按鈕 + 2 件
      expect(wrapper.text()).toContain('長劍')
      expect(wrapper.text()).toContain('盾牌')
    })

    it('isAttuned 顯示同調 icon（aria-label 已同調）', () => {
      const wrapper = mountList({
        items: [makeItem({ name: '魔法戒指', isAttuned: true })],
      })
      // Icon stub 為 true，仍會渲染但不可見；直接驗 aria-label 屬性是否存在於 anchor element
      // 改用文字斷言已同調 icon：透過 findAll Icon stub instance
      const icons = wrapper.findAll('icon-stub')
      const attunedIcon = icons.find((i) => i.attributes('aria-label') === '已同調')
      expect(attunedIcon).toBeDefined()
    })
  })

  describe('Row 互動', () => {
    it('刪除按鈕 emit remove [id]', async () => {
      const wrapper = mountList({
        items: [makeItem({ id: 'a', name: '長劍' })],
      })
      const trash = wrapper
        .findAll('button')
        .find((b) => b.attributes('aria-label') === '刪除 長劍')!
      await trash.trigger('click')
      expect(wrapper.emitted('remove')).toEqual([['a']])
    })

    it('移動按鈕 emit move-item [id]', async () => {
      const wrapper = mountList({
        items: [makeItem({ id: 'a', name: '長劍' })],
      })
      const moveBtn = wrapper
        .findAll('button')
        .find((b) => b.attributes('aria-label') === '移至另一袋：長劍')!
      await moveBtn.trigger('click')
      expect(wrapper.emitted('move-item')).toEqual([['a']])
    })
  })

  describe('展開/收合', () => {
    const itemRow = (wrapper: ReturnType<typeof mountList>) => wrapper.findAll('ul > li')[1]! // index 0 為新增按鈕列
    const chevron = (wrapper: ReturnType<typeof mountList>) =>
      wrapper.findAll('button').find((b) => b.attributes('aria-expanded') !== undefined)

    it('有 description：點整列展開、再點 chevron 收合（chevron @click.stop 不重複 toggle）', async () => {
      const wrapper = mountList({
        items: [makeItem({ id: 'a', name: '長劍', description: '一把鋒利的劍' })],
      })
      expect(chevron(wrapper)!.attributes('aria-expanded')).toBe('false')

      await itemRow(wrapper).trigger('click')
      expect(chevron(wrapper)!.attributes('aria-expanded')).toBe('true')

      await chevron(wrapper)!.trigger('click')
      expect(chevron(wrapper)!.attributes('aria-expanded')).toBe('false')
    })

    it('無 description：不渲染 chevron，點整列不展開', async () => {
      const wrapper = mountList({
        items: [makeItem({ id: 'a', name: '長劍', description: null })],
      })
      expect(chevron(wrapper)).toBeUndefined()
      await itemRow(wrapper).trigger('click')
      expect(chevron(wrapper)).toBeUndefined()
    })

    it('點 action 按鈕不會冒泡觸發展開', async () => {
      const wrapper = mountList({
        items: [makeItem({ id: 'a', name: '長劍', description: '一把鋒利的劍' })],
      })
      const edit = wrapper
        .findAll('button')
        .find((b) => b.attributes('aria-label') === '編輯 長劍')!
      await edit.trigger('click')
      expect(chevron(wrapper)!.attributes('aria-expanded')).toBe('false')
    })
  })

  describe('pending 守衛', () => {
    const btnByLabel = (wrapper: ReturnType<typeof mountList>, label: string) =>
      wrapper.findAll('button').find((b) => b.attributes('aria-label') === label)!

    it('pendingItemIds 含 item.id：move / edit / 刪除 按鈕 disabled、<li> 不可拖曳', async () => {
      const wrapper = mountList({
        items: [makeItem({ id: 'a', name: '長劍' })],
        pendingItemIds: new Set(['a']),
      })
      expect(btnByLabel(wrapper, '移至另一袋：長劍').attributes('disabled')).toBeDefined()
      expect(btnByLabel(wrapper, '編輯 長劍').attributes('disabled')).toBeDefined()
      // 刪除亦封鎖：A5 store removeItem 已加 in-flight guard（C3）
      expect(btnByLabel(wrapper, '刪除 長劍').attributes('disabled')).toBeDefined()
      expect(wrapper.findAll('ul > li')[1]!.attributes('draggable')).toBe('false')
    })

    it('disabled move 按鈕點擊不 emit move-item', async () => {
      const wrapper = mountList({
        items: [makeItem({ id: 'a', name: '長劍' })],
        pendingItemIds: new Set(['a']),
      })
      await btnByLabel(wrapper, '移至另一袋：長劍').trigger('click')
      expect(wrapper.emitted('move-item')).toBeUndefined()
    })

    it('pendingItemIds 不含該 id：按鈕正常可用、可拖曳', () => {
      const wrapper = mountList({
        items: [makeItem({ id: 'a', name: '長劍' })],
        pendingItemIds: new Set(['other']),
      })
      expect(btnByLabel(wrapper, '移至另一袋：長劍').attributes('disabled')).toBeUndefined()
      expect(wrapper.findAll('ul > li')[1]!.attributes('draggable')).toBe('true')
    })
  })

  describe('Modal 開合', () => {
    it('預設關閉', () => {
      const wrapper = mountList()
      expect(wrapper.find('[data-modal]').exists()).toBe(false)
    })

    it('點新增按鈕開 modal、標題為「新增物品」', async () => {
      const wrapper = mountList()
      await addBtn(wrapper).trigger('click')
      const modal = wrapper.find('[data-modal]')
      expect(modal.exists()).toBe(true)
      expect(modal.text()).toContain('新增物品')
    })

    it('點編輯按鈕開 modal、標題為「編輯物品」、帶入 name', async () => {
      const wrapper = mountList({
        items: [makeItem({ id: 'a', name: '長劍' })],
      })
      const edit = wrapper
        .findAll('button')
        .find((b) => b.attributes('aria-label') === '編輯 長劍')!
      await edit.trigger('click')
      const modal = wrapper.find('[data-modal]')
      expect(modal.exists()).toBe(true)
      expect(modal.text()).toContain('編輯物品')
      const nameInput = modal.find('input#item-modal-name').element as HTMLInputElement
      expect(nameInput.value).toBe('長劍')
    })
  })

  describe('Modal save 行為', () => {
    it('name 空白時確認按鈕 disabled', async () => {
      const wrapper = mountList()
      await addBtn(wrapper).trigger('click')
      const confirm = wrapper.find('[data-modal-footer] button')
      expect(confirm.attributes('disabled')).toBeDefined()
    })

    it('輸入 name 後確認、emit add [draft]', async () => {
      const wrapper = mountList({ section: 'backpack' })
      await addBtn(wrapper).trigger('click')
      await wrapper.find('input#item-modal-name').setValue('短劍')
      await nextTick()
      const confirm = wrapper.find('[data-modal-footer] button')
      await confirm.trigger('click')
      expect(wrapper.emitted('add')?.at(-1)).toEqual([
        {
          name: '短劍',
          description: null,
          quantity: 1,
          weight: 0,
          type: 'other',
          location: 'backpack',
        },
      ])
    })

    it('編輯模式 emit update [id, draft]', async () => {
      const wrapper = mountList({
        items: [makeItem({ id: 'a', name: '長劍', quantity: 1, weight: 3, type: 'weapon' })],
      })
      const edit = wrapper
        .findAll('button')
        .find((b) => b.attributes('aria-label') === '編輯 長劍')!
      await edit.trigger('click')
      await wrapper.find('input#item-modal-name').setValue('巨劍')
      const confirm = wrapper.find('[data-modal-footer] button')
      await confirm.trigger('click')
      expect(wrapper.emitted('update')?.at(-1)).toEqual([
        'a',
        expect.objectContaining({ name: '巨劍', quantity: 1, weight: 3, type: 'weapon' }),
      ])
    })

    it('name 前後空白會被 trim', async () => {
      const wrapper = mountList()
      await addBtn(wrapper).trigger('click')
      await wrapper.find('input#item-modal-name').setValue('  魔法藥水  ')
      await nextTick()
      const confirm = wrapper.find('[data-modal-footer] button')
      await confirm.trigger('click')
      expect(wrapper.emitted('add')?.at(-1)).toEqual([
        expect.objectContaining({ name: '魔法藥水' }),
      ])
    })
  })

  describe('Drag and drop', () => {
    it('拖入跨 section 的物品 emit move-item [id]', async () => {
      const wrapper = mountList({ section: 'backpack' })
      const root = wrapper.find('div').element as HTMLElement
      const dataTransfer = {
        getData: vi.fn().mockReturnValue(JSON.stringify({ id: 'x', section: 'dimensionalBag' })),
        setData: vi.fn(),
      }
      const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent
      Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
      root.dispatchEvent(event)
      await nextTick()
      expect(wrapper.emitted('move-item')).toEqual([['x']])
    })

    it('同 section 拖放不 emit', async () => {
      const wrapper = mountList({ section: 'backpack' })
      const root = wrapper.find('div').element as HTMLElement
      const dataTransfer = {
        getData: vi.fn().mockReturnValue(JSON.stringify({ id: 'x', section: 'backpack' })),
      }
      const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent
      Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
      root.dispatchEvent(event)
      await nextTick()
      expect(wrapper.emitted('move-item')).toBeUndefined()
    })
  })
})
