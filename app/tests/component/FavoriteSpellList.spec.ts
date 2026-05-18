import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useId } from 'vue'
import FavoriteSpellList from '~/components/business/character-detail/quickview/FavoriteSpellList.vue'
import { formatSpellLevel, groupSpellsByLevel } from '~/helpers/spell'
import { useCharacterSpellsStore } from '~/stores/character-spells'
import type { SpellDTO, SpellEntryDTO } from '@rolling-dice-app/core'

const FIREBALL_ID = 'fav-spell-001'
const FROST_RAY_ID = 'fav-spell-002'
const CANTRIP_ID = 'fav-spell-003'

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
  [FIREBALL_ID]: makeSpell({ id: FIREBALL_ID, name: '火球術', level: 3 }),
  [FROST_RAY_ID]: makeSpell({ id: FROST_RAY_ID, name: '寒冰射線', level: 1, ritual: true }),
  [CANTRIP_ID]: makeSpell({ id: CANTRIP_ID, name: '火花', level: 0 }),
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal('useId', useId)
  vi.stubGlobal('useSpells', () => ({ getSpell: (id: string) => SPELLS[id] }))
  vi.stubGlobal('useCharacterSpellsStore', useCharacterSpellsStore)
  vi.stubGlobal('groupSpellsByLevel', groupSpellsByLevel)
  vi.stubGlobal('formatSpellLevel', formatSpellLevel)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const makeEntry = (spellId: string, isFavorite: boolean, isPrepared = false): SpellEntryDTO => ({
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

const mountList = () =>
  mount(FavoriteSpellList, {
    global: { mocks: { formatSpellLevel } },
  })

describe('FavoriteSpellList', () => {
  it('沒有 isFavorite 的 entry 時顯示空狀態提示', () => {
    seedStore([makeEntry(FIREBALL_ID, false, true)])
    const wrapper = mountList()
    expect(wrapper.text()).toContain('尚未標記常用法術')
  })

  it('只渲染 isFavorite = true 的 entry，依環位分組並由低到高排序', () => {
    seedStore([
      makeEntry(FIREBALL_ID, true),
      makeEntry(CANTRIP_ID, true),
      makeEntry(FROST_RAY_ID, true),
      makeEntry('non-fav', false),
    ])
    const wrapper = mountList()
    const groupHeaders = wrapper.findAll('h4').map((el) => el.text())
    expect(groupHeaders).toEqual(['戲法', '1 環', '3 環'])
  })

  it('點選法術 → emit select 事件帶該法術 id', async () => {
    seedStore([makeEntry(FIREBALL_ID, true)])
    const wrapper = mountList()
    await wrapper.find('li button').trigger('click')
    expect(wrapper.emitted('select')).toEqual([[FIREBALL_ID]])
  })

  it('資料庫中不存在的 id 應被靜默過濾，不渲染', () => {
    seedStore([makeEntry(FIREBALL_ID, true), makeEntry('unknown-id', true)])
    const wrapper = mountList()
    const rows = wrapper.findAll('li button')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.text()).toContain('火球術')
  })
})
