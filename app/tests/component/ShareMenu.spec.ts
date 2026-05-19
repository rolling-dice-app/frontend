import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import ShareMenu from '~/components/business/character-list/ShareMenu.vue'
import type { CharacterListItem } from '~/types/business/character-list'

const makeCharacter = (overrides: Partial<CharacterListItem> = {}): CharacterListItem => ({
  id: 'char-1',
  name: '測試角色',
  classes: [{ classKey: 'fighter', level: 3, subclass: null }],
  level: 3,
  avatar: null,
  updatedAt: '2026-05-01T00:00:00.000Z',
  race: 'human',
  shareable: false,
  shareId: 'share-1',
  ...overrides,
})

const mountMenu = (character: CharacterListItem = makeCharacter()) =>
  mount(ShareMenu, {
    attachTo: document.body,
    props: { character },
    global: { stubs: { Icon: true, teleport: true } },
  })

const openViaClick = async (wrapper: ReturnType<typeof mountMenu>) => {
  await wrapper.get('button[aria-haspopup="menu"]').trigger('click')
  await nextTick()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ShareMenu', () => {
  it('預設收合：trigger aria-expanded=false 且無 menu', () => {
    const wrapper = mountMenu()
    const trigger = wrapper.get('button[aria-haspopup="menu"]')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('點 trigger 展開：aria-expanded=true，三個 menuitem', async () => {
    const wrapper = mountMenu()
    await openViaClick(wrapper)
    expect(wrapper.get('button[aria-haspopup="menu"]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(3)
  })

  it('未公開時第一項為「開啟公開」，公開時為「關閉公開」', async () => {
    const off = mountMenu(makeCharacter({ shareable: false }))
    await openViaClick(off)
    const offLabel = off.findAll('[role="menuitem"]')[0]!.text()

    const on = mountMenu(makeCharacter({ shareable: true }))
    await openViaClick(on)
    const onLabel = on.findAll('[role="menuitem"]')[0]!.text()

    expect(offLabel).not.toBe(onLabel)
  })

  it('點選 menuitem 發出對應事件並帶 character、關閉選單', async () => {
    const character = makeCharacter()
    const wrapper = mountMenu(character)
    await openViaClick(wrapper)

    const items = wrapper.findAll('[role="menuitem"]')
    await items[0]!.trigger('click') // toggle-share（第一項）
    await nextTick()

    expect(wrapper.emitted('toggle-share')?.[0]).toEqual([character])
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('copy-link / open-page 對應正確順序的 menuitem', async () => {
    const character = makeCharacter()
    const wrapper = mountMenu(character)
    await openViaClick(wrapper)
    await wrapper.findAll('[role="menuitem"]')[1]!.trigger('click')
    expect(wrapper.emitted('copy-link')?.[0]).toEqual([character])

    await openViaClick(wrapper)
    await wrapper.findAll('[role="menuitem"]')[2]!.trigger('click')
    expect(wrapper.emitted('open-page')?.[0]).toEqual([character])
  })

  it('ArrowDown 於 trigger 開啟並聚焦第一項', async () => {
    const wrapper = mountMenu()
    await wrapper.get('button[aria-haspopup="menu"]').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const items = wrapper.findAll('[role="menuitem"]')
    expect(items).toHaveLength(3)
    expect(document.activeElement).toBe(items[0]!.element)
  })

  it('menu 內 ArrowDown / ArrowUp 循環聚焦', async () => {
    const wrapper = mountMenu()
    await openViaClick(wrapper)
    const menu = wrapper.get('[role="menu"]')
    const items = wrapper.findAll('[role="menuitem"]')

    await items[0]!.trigger('focus')
    await menu.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(document.activeElement).toBe(items[1]!.element)

    await menu.trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect(document.activeElement).toBe(items[0]!.element)

    await menu.trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect(document.activeElement).toBe(items[2]!.element)
  })

  it('Esc 關閉並還原焦點到 trigger', async () => {
    const wrapper = mountMenu()
    await openViaClick(wrapper)
    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('button[aria-haspopup="menu"]').element)
  })

  it('點選單外部關閉選單', async () => {
    const wrapper = mountMenu()
    await openViaClick(wrapper)
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })
})
