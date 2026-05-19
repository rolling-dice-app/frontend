import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import AppButton from '~/components/common/AppButton.vue'
import AppBadge from '~/components/common/AppBadge.vue'
import ShareSpellList from '~/components/business/character/share/ShareSpellList.vue'
import { formatSpellComponents, formatSpellLevel, groupSpellsByLevel } from '~/helpers/spell'
import type { SharedSpellEntryDTO, SpellDTO } from '@rolling-dice-app/core'

const FIREBALL_ID = 'spell-001'
const FROST_ID = 'spell-002'

const makeSpell = (
  overrides: Partial<SpellDTO> & Pick<SpellDTO, 'id' | 'name' | 'level'>,
): SpellDTO => ({
  engName: 'Test Spell',
  school: 'evocation',
  castingTime: '1 個動作',
  range: '90 英尺',
  verbal: true,
  somatic: true,
  material: '',
  duration: '瞬間',
  concentration: false,
  ritual: false,
  source: 'PHB',
  classes: [],
  desc: '說明文字',
  ...overrides,
})

const CATALOG: Record<string, SpellDTO> = {
  [FIREBALL_ID]: makeSpell({ id: FIREBALL_ID, name: '火球術', level: 3 }),
  [FROST_ID]: makeSpell({ id: FROST_ID, name: '寒冰射線', level: 1 }),
}

const pending = ref(false)
const error = ref<unknown>(null)
const refresh = vi.fn()

beforeEach(() => {
  pending.value = false
  error.value = null
  refresh.mockClear()
  vi.stubGlobal('useSpells', () => ({
    getSpell: (id: string): SpellDTO | undefined => CATALOG[id],
    pending,
    error,
    refresh,
  }))
  vi.stubGlobal('groupSpellsByLevel', groupSpellsByLevel)
  vi.stubGlobal('formatSpellLevel', formatSpellLevel)
  vi.stubGlobal('formatSpellComponents', formatSpellComponents)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const AccordionStub = { template: '<div><slot /></div>' }
const AccordionItemStub = {
  template: '<div><slot name="title" /><slot /></div>',
}

const makeEntry = (spellId: string): SharedSpellEntryDTO => ({
  spellId,
  isPrepared: false,
  isFavorite: false,
  sourceClass: undefined,
})

const mountList = (entries: SharedSpellEntryDTO[]) =>
  mount(ShareSpellList, {
    props: { entries },
    global: {
      stubs: { Accordion: AccordionStub, AccordionItem: AccordionItemStub },
      components: { CommonAppButton: AppButton, CommonAppBadge: AppBadge },
      mocks: { formatSpellLevel, formatSpellComponents, groupSpellsByLevel },
    },
  })

describe('ShareSpellList', () => {
  it('圖鑑載入中：顯示 loading，不顯示空狀態', () => {
    pending.value = true
    const wrapper = mountList([makeEntry(FIREBALL_ID)])
    expect(wrapper.text()).toContain('法術資料載入中')
    expect(wrapper.text()).not.toContain('尚未掌握任何法術')
  })

  it('圖鑑載入失敗：顯示錯誤與重試，點重試呼叫 refresh', async () => {
    error.value = new Error('boom')
    const wrapper = mountList([makeEntry(FIREBALL_ID)])
    expect(wrapper.text()).toContain('法術資料載入失敗')
    await wrapper.get('button').trigger('click')
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('全部查得：渲染法術名稱，無 missing banner', () => {
    const wrapper = mountList([makeEntry(FIREBALL_ID), makeEntry(FROST_ID)])
    expect(wrapper.text()).toContain('火球術')
    expect(wrapper.text()).toContain('寒冰射線')
    expect(wrapper.text()).not.toContain('資料庫中找不到下列法術')
  })

  it('部分查無：顯示 missing banner 含查無 id，且仍渲染查得的法術', () => {
    const wrapper = mountList([makeEntry(FIREBALL_ID), makeEntry('spell-missing')])
    expect(wrapper.text()).toContain('火球術')
    expect(wrapper.text()).toContain('資料庫中找不到下列法術')
    expect(wrapper.text()).toContain('spell-missing')
  })

  it('entries 為空：顯示空狀態，無 missing banner', () => {
    const wrapper = mountList([])
    expect(wrapper.text()).toContain('尚未掌握任何法術')
    expect(wrapper.text()).not.toContain('資料庫中找不到下列法術')
  })

  it('有 entries 但全部查無：顯示 missing banner，不誤報「尚未掌握」', () => {
    const wrapper = mountList([makeEntry('x-1'), makeEntry('x-2')])
    expect(wrapper.text()).toContain('資料庫中找不到下列法術')
    expect(wrapper.text()).not.toContain('尚未掌握任何法術')
  })
})
