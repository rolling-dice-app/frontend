import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useId } from 'vue'
import LearnedSpellList from '~/components/business/character/form/spells/LearnedSpellList.vue'
import { formatSpellLevel, groupSpellsByLevel } from '~/helpers/spell'
import type { Spell, SpellEntry } from '@rolling-dice-app/core'

const spellMap = new Map<string, Spell>()

const stubGetSpell = (id: string): Spell | undefined => spellMap.get(id)

beforeEach(() => {
  spellMap.clear()
  vi.stubGlobal('useId', useId)
  vi.stubGlobal('useSpells', () => ({ getSpell: stubGetSpell }))
  vi.stubGlobal('formatSpellLevel', formatSpellLevel)
  vi.stubGlobal('groupSpellsByLevel', groupSpellsByLevel)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const makeSpell = (overrides: Partial<Spell> = {}): Spell =>
  ({
    id: overrides.id ?? `s-${Math.random()}`,
    name: '魔法飛彈',
    level: 1,
    school: 'evocation',
    castingTime: '1 動作',
    range: '120 呎',
    components: { v: true, s: true, m: false },
    material: null,
    duration: '即效',
    desc: '射出三道魔力箭',
    ritual: false,
    concentration: false,
    ...overrides,
  }) as Spell

const mountList = (spells: SpellEntry[] = []) =>
  mount(LearnedSpellList, {
    props: { spells },
    global: { mocks: { formatSpellLevel, groupSpellsByLevel } },
  })

describe('LearnedSpellList (form)', () => {
  describe('空狀態', () => {
    it('spells = [] 顯示「尚未掌握任何法術」', () => {
      const wrapper = mountList()
      expect(wrapper.text()).toContain('尚未掌握任何法術')
      expect(wrapper.text()).toContain('共 0 個')
    })
  })

  describe('已掌握法術渲染', () => {
    it('依環級分組、各組顯示組標題與筆數', () => {
      spellMap.set('a', makeSpell({ id: 'a', name: '魔法飛彈', level: 1 }))
      spellMap.set('b', makeSpell({ id: 'b', name: '冰雪風暴', level: 4 }))
      spellMap.set('c', makeSpell({ id: 'c', name: '光亮術', level: 0 }))

      const wrapper = mountList([
        { id: 'a', isPrepared: false, isFavorite: false },
        { id: 'b', isPrepared: false, isFavorite: false },
        { id: 'c', isPrepared: false, isFavorite: false },
      ])

      const text = wrapper.text()
      expect(text).toContain('共 3 個')
      expect(text).toContain('戲法') // level 0 label
      expect(text).toContain('1 環')
      expect(text).toContain('4 環')
      expect(text).toContain('魔法飛彈')
      expect(text).toContain('冰雪風暴')
      expect(text).toContain('光亮術')
    })

    it('點按鈕 emit select [spellId]', async () => {
      spellMap.set('a', makeSpell({ id: 'a', name: '魔法飛彈' }))
      const wrapper = mountList([{ id: 'a', isPrepared: false, isFavorite: false }])
      const button = wrapper.findAll('button').find((b) => b.text() === '魔法飛彈')!
      await button.trigger('click')
      expect(wrapper.emitted('select')).toEqual([['a']])
    })
  })

  describe('找不到的法術', () => {
    it('資料庫查不到時顯示警示文字', () => {
      // 不在 spellMap 中的 id
      const wrapper = mountList([{ id: 'missing-1', isPrepared: false, isFavorite: false }])
      expect(wrapper.text()).toContain('資料庫中找不到下列法術：')
      expect(wrapper.text()).toContain('missing-1')
      expect(wrapper.text()).toContain('尚未掌握任何法術')
    })

    it('部分找到 / 部分缺漏：缺漏顯示在警示、找到顯示在分組', () => {
      spellMap.set('a', makeSpell({ id: 'a', name: '魔法飛彈', level: 1 }))
      const wrapper = mountList([
        { id: 'a', isPrepared: false, isFavorite: false },
        { id: 'gone', isPrepared: false, isFavorite: false },
      ])
      const text = wrapper.text()
      expect(text).toContain('魔法飛彈')
      expect(text).toContain('資料庫中找不到下列法術：gone')
    })
  })
})
