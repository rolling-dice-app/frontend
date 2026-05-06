import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useId } from 'vue'
import LearnedSpellAccordion from '~/components/business/character/quickview/LearnedSpellAccordion.vue'
import { CHARACTERS_STORAGE_KEY } from '~/constants/storage'
import {
  formatSpellComponents,
  formatSpellLevel,
  groupSpellsByLevel,
  withToggledFlag,
} from '~/helpers/spell'
import { useCharacterStore } from '~/stores/character'
import { createMockCharacter } from '~/tests/fixtures/character'
import type { Character, Spell } from '@rolling-dice-app/core'

const CHAR_ID = 'lsa-001'
const FIREBALL_ID = 'cccccccc-0000-0000-0000-000000000001'
const FROST_RAY_ID = 'cccccccc-0000-0000-0000-000000000002'
const CANTRIP_ID = 'cccccccc-0000-0000-0000-000000000003'

function makeSpell(overrides: Partial<Spell> & Pick<Spell, 'id' | 'name' | 'level'>): Spell {
  return {
    school: 'evocation',
    castingTime: '1 個動作',
    range: '90 英尺',
    verbal: true,
    somatic: true,
    material: '',
    duration: '瞬間',
    concentration: false,
    ritual: false,
    desc: '',
    ...overrides,
  }
}

const SPELLS: Record<string, Spell> = {
  [FIREBALL_ID]: makeSpell({ id: FIREBALL_ID, name: '火焰箭', level: 1 }),
  [FROST_RAY_ID]: makeSpell({ id: FROST_RAY_ID, name: '寒冰射線', level: 1 }),
  [CANTRIP_ID]: makeSpell({ id: CANTRIP_ID, name: '火焰術', level: 0 }),
}

beforeEach(() => {
  setActivePinia(createPinia())
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal('useId', useId)
  vi.stubGlobal('useCharacterStore', useCharacterStore)
  vi.stubGlobal('useSpells', () => ({ getSpell: (id: string) => SPELLS[id] }))
  vi.stubGlobal('groupSpellsByLevel', groupSpellsByLevel)
  vi.stubGlobal('formatSpellLevel', formatSpellLevel)
  vi.stubGlobal('formatSpellComponents', formatSpellComponents)
  vi.stubGlobal('withToggledFlag', withToggledFlag)
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function seedCharacter(overrides: Partial<Character> = {}): Character {
  const character = createMockCharacter({
    id: CHAR_ID,
    spells: [],
    ...overrides,
  })
  localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([character]))
  return useCharacterStore().getById(CHAR_ID)!
}

const entry = (id: string, isPrepared = false, isFavorite = false) => ({
  id,
  isPrepared,
  isFavorite,
})

function mountAccordion(character: Character) {
  return mount(LearnedSpellAccordion, {
    props: { character },
    global: {
      mocks: { formatSpellLevel, formatSpellComponents },
    },
  })
}

describe('LearnedSpellAccordion', () => {
  it('勾選未準備的法術 → patchCharacter 將該 entry 標為 isPrepared', async () => {
    const character = seedCharacter({ spells: [entry(FIREBALL_ID)] })
    const wrapper = mountAccordion(character)

    const checkbox = wrapper.findAllComponents({ name: 'Checkbox' })[0]
    await checkbox!.vm.$emit('update:modelValue', true)

    expect(useCharacterStore().getById(CHAR_ID)?.spells).toEqual([entry(FIREBALL_ID, true)])
  })

  it('取消勾選已準備的法術 → patchCharacter 將該 entry 標為 !isPrepared', async () => {
    const character = seedCharacter({ spells: [entry(FIREBALL_ID, true)] })
    const wrapper = mountAccordion(character)

    const checkbox = wrapper.findAllComponents({ name: 'Checkbox' })[0]
    await checkbox!.vm.$emit('update:modelValue', false)

    expect(useCharacterStore().getById(CHAR_ID)?.spells).toEqual([entry(FIREBALL_ID, false)])
  })

  it('戲法 (level 0) 的 checkbox disabled 且預勾，emit 也不會寫入', async () => {
    const character = seedCharacter({ spells: [entry(CANTRIP_ID)] })
    const wrapper = mountAccordion(character)

    const checkbox = wrapper.findAllComponents({ name: 'Checkbox' })[0]
    expect(checkbox?.props('disabled')).toBe(true)
    expect(checkbox?.props('modelValue')).toBe(true)

    await checkbox!.vm.$emit('update:modelValue', false)
    expect(useCharacterStore().getById(CHAR_ID)?.spells).toEqual([entry(CANTRIP_ID, false)])
  })

  it('連續勾選兩個法術，第二次以 store 最新狀態為基準（不會丟更新）', async () => {
    const character = seedCharacter({ spells: [entry(FIREBALL_ID), entry(FROST_RAY_ID)] })
    const wrapper = mountAccordion(character)

    const checkboxes = wrapper.findAllComponents({ name: 'Checkbox' })
    await checkboxes[0]!.vm.$emit('update:modelValue', true)
    await checkboxes[1]!.vm.$emit('update:modelValue', true)

    expect(useCharacterStore().getById(CHAR_ID)?.spells).toEqual([
      entry(FIREBALL_ID, true),
      entry(FROST_RAY_ID, true),
    ])
  })

  it('沒有 spells 時顯示空狀態', () => {
    const character = seedCharacter()
    const wrapper = mountAccordion(character)
    expect(wrapper.text()).toContain('尚未掌握任何法術')
  })

  it('spells 含資料庫不存在的 id 時顯示 missing banner', () => {
    const unknownId = 'cccccccc-0000-0000-0000-000000000999'
    const character = seedCharacter({ spells: [entry(unknownId)] })
    const wrapper = mountAccordion(character)
    expect(wrapper.text()).toContain('資料庫中找不到下列法術')
  })

  it('點 star 按鈕 → patchCharacter 將該 entry 標為 isFavorite', async () => {
    const character = seedCharacter({ spells: [entry(FIREBALL_ID)] })
    const wrapper = mountAccordion(character)

    const starBtn = wrapper.find('button.favorite-btn')
    await starBtn.trigger('click')

    expect(useCharacterStore().getById(CHAR_ID)?.spells).toEqual([entry(FIREBALL_ID, false, true)])
  })

  it('再次點已 favorite 的 star → patchCharacter 將該 entry 標為 !isFavorite', async () => {
    const character = seedCharacter({ spells: [entry(FIREBALL_ID, false, true)] })
    const wrapper = mountAccordion(character)

    const starBtn = wrapper.find('button.favorite-btn')
    expect(starBtn.attributes('aria-pressed')).toBe('true')
    await starBtn.trigger('click')

    expect(useCharacterStore().getById(CHAR_ID)?.spells).toEqual([entry(FIREBALL_ID, false, false)])
  })

  it('focusSpell expose：呼叫後對應 id 應被加入 expandedSpellIds', async () => {
    const character = seedCharacter({ spells: [entry(FIREBALL_ID)] })
    const wrapper = mountAccordion(character)

    const exposed = wrapper.vm as unknown as { focusSpell: (id: string) => Promise<void> }
    await exposed.focusSpell(FIREBALL_ID)

    const accordion = wrapper.findComponent({ name: 'Accordion' })
    expect(accordion.props('modelValue')).toContain(FIREBALL_ID)
  })
})
