import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useId } from 'vue'
import LearnedSpellAccordion from '~/components/business/character-detail/quickview/LearnedSpellAccordion.vue'
import { formatSpellComponents, formatSpellLevel, groupSpellsByLevel } from '~/helpers/spell'
import { useCharacterSpellsStore } from '~/stores/character-spells'
import type { SpellDTO, SpellEntryDTO } from '@rolling-dice-app/core'

const FIREBALL_ID = 'cccccccc-0000-0000-0000-000000000001'
const FROST_RAY_ID = 'cccccccc-0000-0000-0000-000000000002'
const CANTRIP_ID = 'cccccccc-0000-0000-0000-000000000003'

function makeSpell(
  overrides: Partial<SpellDTO> & Pick<SpellDTO, 'id' | 'name' | 'level'>,
): SpellDTO {
  return {
    engName: 'Test SpellDTO',
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
    desc: '',
    ...overrides,
  }
}

const SPELLS: Record<string, SpellDTO> = {
  [FIREBALL_ID]: makeSpell({ id: FIREBALL_ID, name: '火焰箭', level: 1 }),
  [FROST_RAY_ID]: makeSpell({ id: FROST_RAY_ID, name: '寒冰射線', level: 1 }),
  [CANTRIP_ID]: makeSpell({ id: CANTRIP_ID, name: '火焰術', level: 0 }),
}

beforeEach(() => {
  setActivePinia(createPinia())
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal('useId', useId)
  vi.stubGlobal('useCharacterSpellsStore', useCharacterSpellsStore)
  vi.stubGlobal('useSpells', () => ({
    getSpell: (id: string) => SPELLS[id],
    refresh: vi.fn(),
  }))
  vi.stubGlobal('useApiErrorToast', () => ({ handle: vi.fn() }))
  vi.stubGlobal('groupSpellsByLevel', groupSpellsByLevel)
  vi.stubGlobal('formatSpellLevel', formatSpellLevel)
  vi.stubGlobal('formatSpellComponents', formatSpellComponents)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const makeEntry = (spellId: string, isPrepared = false, isFavorite = false): SpellEntryDTO => ({
  id: `entry-${spellId}`,
  spellId,
  isPrepared,
  isFavorite,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

const seedStore = (entries: SpellEntryDTO[]) => {
  const store = useCharacterSpellsStore()
  store.entries = entries
}

const mountAccordion = () =>
  mount(LearnedSpellAccordion, {
    global: { mocks: { formatSpellLevel, formatSpellComponents } },
  })

describe('LearnedSpellAccordion', () => {
  it('沒有 spells 時顯示空狀態', () => {
    seedStore([])
    const wrapper = mountAccordion()
    expect(wrapper.text()).toContain('尚未掌握任何法術')
  })

  it('spells 含資料庫不存在的 id 時顯示 missing banner', () => {
    const unknownId = 'cccccccc-0000-0000-0000-000000000999'
    seedStore([makeEntry(unknownId)])
    const wrapper = mountAccordion()
    expect(wrapper.text()).toContain('資料庫中找不到下列法術')
  })

  it('勾選未準備的法術 → spellsStore 對應 entry isPrepared 翻為 true', async () => {
    seedStore([makeEntry(FIREBALL_ID)])
    const wrapper = mountAccordion()

    const checkbox = wrapper.findAllComponents({ name: 'Checkbox' })[0]
    await checkbox!.vm.$emit('update:modelValue', true)

    const store = useCharacterSpellsStore()
    expect(store.entries[0]!.isPrepared).toBe(true)
  })

  it('戲法（level 0）checkbox 預勾且 disabled，事件不寫入', async () => {
    seedStore([makeEntry(CANTRIP_ID)])
    const wrapper = mountAccordion()

    const checkbox = wrapper.findAllComponents({ name: 'Checkbox' })[0]
    expect(checkbox?.props('disabled')).toBe(true)
    expect(checkbox?.props('modelValue')).toBe(true)

    await checkbox!.vm.$emit('update:modelValue', false)
    const store = useCharacterSpellsStore()
    expect(store.entries[0]!.isPrepared).toBe(false)
  })

  it('點 star 按鈕 → spellsStore 對應 entry isFavorite 翻為 true', async () => {
    seedStore([makeEntry(FIREBALL_ID)])
    const wrapper = mountAccordion()

    const starBtn = wrapper.find('button.favorite-btn')
    await starBtn.trigger('click')

    const store = useCharacterSpellsStore()
    expect(store.entries[0]!.isFavorite).toBe(true)
  })

  it('focusSpell expose：呼叫後對應 id 應被加入 expandedSpellIds', async () => {
    seedStore([makeEntry(FIREBALL_ID)])
    const wrapper = mountAccordion()

    const exposed = wrapper.vm as unknown as { focusSpell: (id: string) => Promise<void> }
    await exposed.focusSpell(FIREBALL_ID)

    const accordion = wrapper.findComponent({ name: 'Accordion' })
    expect(accordion.props('modelValue')).toContain(FIREBALL_ID)
  })
})
