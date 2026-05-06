import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue'
import AppInput from '~/components/common/AppInput.vue'
import AppSelect from '~/components/common/AppSelect.vue'
import SpellBookPanel from '~/components/business/character/form/spells/SpellBookPanel.vue'
import { useCharacterSpellsForm } from '~/composables/domain/useCharacterSpellsForm'
import { formatSpellComponents, formatSpellLevel, groupSpellsByLevel } from '~/helpers/spell'
import { debounce } from '~/utils/timing'
import type { Spell, SpellEntry } from '@rolling-dice-app/core'
import type { CharacterUpdateFormState } from '~/types/business/character-form'

const allSpells = ref<Spell[]>([])

beforeEach(() => {
  allSpells.value = []
  vi.stubGlobal('useId', useId)
  vi.stubGlobal('onBeforeUnmount', onBeforeUnmount)
  vi.stubGlobal('useSpells', () => ({ spells: computed(() => allSpells.value) }))
  vi.stubGlobal('useCharacterSpellsForm', useCharacterSpellsForm)
  vi.stubGlobal('formatSpellLevel', formatSpellLevel)
  vi.stubGlobal('formatSpellComponents', formatSpellComponents)
  vi.stubGlobal('groupSpellsByLevel', groupSpellsByLevel)
  vi.stubGlobal('debounce', debounce)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const AccordionStub = {
  name: 'Accordion',
  props: ['multiple', 'modelValue'],
  emits: ['update:modelValue'],
  template: '<div><slot /></div>',
}

const AccordionItemStub = {
  name: 'AccordionItem',
  props: ['value'],
  template:
    '<div data-accordion-item><div class="ai-title"><slot name="title" /></div><div class="ai-body"><slot /></div></div>',
}

const BadgeStub = {
  name: 'Badge',
  props: ['size', 'bgColor', 'textColor'],
  template: '<span class="badge"><slot /></span>',
}

const ButtonStub = {
  name: 'Button',
  props: ['size', 'outline', 'radius', 'textColor', 'borderColor'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
}

const CheckboxStub = {
  name: 'Checkbox',
  props: ['modelValue', 'size', 'color'],
  emits: ['update:modelValue'],
  template: `
    <input
      type="checkbox"
      :checked="modelValue"
      :aria-label="$attrs['aria-label']"
      @change="$emit('update:modelValue', $event.target.checked)"
    />`,
  inheritAttrs: false,
}

const ToggleStub = {
  name: 'Toggle',
  props: ['modelValue', 'size', 'color'],
  emits: ['update:modelValue'],
  template: `
    <input
      type="checkbox"
      role="switch"
      :checked="modelValue"
      :aria-label="$attrs['aria-label']"
      @change="$emit('update:modelValue', $event.target.checked)"
    />`,
  inheritAttrs: false,
}

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

const baseFormState = (spells: SpellEntry[] = []): CharacterUpdateFormState =>
  ({ spells }) as unknown as CharacterUpdateFormState

const mountPanel = (
  params: {
    formState?: CharacterUpdateFormState
    spells?: Spell[]
  } = {},
) => {
  if (params.spells) allSpells.value = params.spells
  const formState = params.formState ?? baseFormState()
  return mount(SpellBookPanel, {
    props: {
      formState,
      'onUpdate:formState': (next: CharacterUpdateFormState) => Object.assign(formState, next),
    },
    global: {
      stubs: {
        Accordion: AccordionStub,
        AccordionItem: AccordionItemStub,
        Badge: BadgeStub,
        Button: ButtonStub,
        Checkbox: CheckboxStub,
        Toggle: ToggleStub,
      },
      components: { CommonAppInput: AppInput, CommonAppSelect: AppSelect },
      mocks: {
        formatSpellLevel,
        formatSpellComponents,
        groupSpellsByLevel,
        useCharacterSpellsForm,
        debounce,
      },
    },
  })
}

describe('SpellBookPanel (form)', () => {
  describe('渲染', () => {
    it('無資料時顯示「沒有符合條件的法術」', () => {
      const wrapper = mountPanel({ spells: [] })
      expect(wrapper.text()).toContain('沒有符合條件的法術')
    })

    it('依環級分組渲染法術項目', () => {
      const wrapper = mountPanel({
        spells: [
          makeSpell({ id: 'a', name: '魔法飛彈', level: 1 }),
          makeSpell({ id: 'b', name: '冰雪風暴', level: 4 }),
        ],
      })
      const items = wrapper.findAllComponents(AccordionItemStub)
      expect(items).toHaveLength(2)
      const text = wrapper.text()
      expect(text).toContain('1 環')
      expect(text).toContain('4 環')
      expect(text).toContain('魔法飛彈')
      expect(text).toContain('冰雪風暴')
    })

    it('儀式 / 專注 法術顯示對應 badge', () => {
      const wrapper = mountPanel({
        spells: [makeSpell({ name: '感知魔法', ritual: true, concentration: true })],
      })
      const text = wrapper.text()
      expect(text).toContain('儀式')
      expect(text).toContain('專注')
    })

    it('展開 accordion item 顯示 spell 詳情（成分 / 持續時間 / 描述）', () => {
      const wrapper = mountPanel({
        spells: [makeSpell({ name: '魔法飛彈', desc: '射出三道魔力箭' })],
      })
      // AccordionItemStub 永遠渲染預設 slot 內容（測試方便）
      expect(wrapper.text()).toContain('成分')
      expect(wrapper.text()).toContain('持續時間')
      expect(wrapper.text()).toContain('描述')
      expect(wrapper.text()).toContain('射出三道魔力箭')
    })
  })

  describe('掌握 toggle', () => {
    it('未掌握法術 checkbox 不勾、formState.spells 為空', () => {
      const formState = baseFormState()
      const wrapper = mountPanel({
        formState,
        spells: [makeSpell({ id: 'a', name: '魔法飛彈' })],
      })
      const cb = wrapper
        .findAll('input[type="checkbox"]')
        .find((c) => c.attributes('aria-label') === '掌握 魔法飛彈')!
      expect((cb.element as HTMLInputElement).checked).toBe(false)
    })

    it('已掌握法術 checkbox 勾選', () => {
      const formState = baseFormState([{ id: 'a', isPrepared: false, isFavorite: false }])
      const wrapper = mountPanel({
        formState,
        spells: [makeSpell({ id: 'a', name: '魔法飛彈' })],
      })
      const cb = wrapper
        .findAll('input[type="checkbox"]')
        .find((c) => c.attributes('aria-label') === '掌握 魔法飛彈')!
      expect((cb.element as HTMLInputElement).checked).toBe(true)
    })

    it('勾選未掌握法術會 push 新 entry', async () => {
      const formState = baseFormState()
      const wrapper = mountPanel({
        formState,
        spells: [makeSpell({ id: 'a', name: '魔法飛彈' })],
      })
      const cb = wrapper
        .findAll('input[type="checkbox"]')
        .find((c) => c.attributes('aria-label') === '掌握 魔法飛彈')!
      await cb.setValue(true)
      expect(formState.spells).toEqual([{ id: 'a', isPrepared: false, isFavorite: false }])
    })

    it('取消已掌握法術會從 spells 移除', async () => {
      const formState = baseFormState([{ id: 'a', isPrepared: false, isFavorite: false }])
      const wrapper = mountPanel({
        formState,
        spells: [makeSpell({ id: 'a', name: '魔法飛彈' })],
      })
      const cb = wrapper
        .findAll('input[type="checkbox"]')
        .find((c) => c.attributes('aria-label') === '掌握 魔法飛彈')!
      await cb.setValue(false)
      expect(formState.spells).toEqual([])
    })
  })

  describe('Filter', () => {
    it('keyword filter 模糊搜尋（debounce 後生效）', async () => {
      vi.useFakeTimers()
      try {
        const wrapper = mountPanel({
          spells: [
            makeSpell({ id: 'a', name: '魔法飛彈', level: 1 }),
            makeSpell({ id: 'b', name: '冰雪風暴', level: 4 }),
          ],
        })
        const search = wrapper.find('input[type="search"]')
        await search.setValue('飛彈')
        // debounce 250ms — 沒推進前不變
        expect(wrapper.findAllComponents(AccordionItemStub)).toHaveLength(2)
        vi.advanceTimersByTime(250)
        await nextTick()
        const items = wrapper.findAllComponents(AccordionItemStub)
        expect(items).toHaveLength(1)
        expect(wrapper.text()).toContain('魔法飛彈')
        expect(wrapper.text()).not.toContain('冰雪風暴')
      } finally {
        vi.useRealTimers()
      }
    })

    it('儀式 toggle 啟用後僅顯示儀式法術', async () => {
      const wrapper = mountPanel({
        spells: [
          makeSpell({ id: 'a', name: '感知魔法', ritual: true }),
          makeSpell({ id: 'b', name: '魔法飛彈', ritual: false }),
        ],
      })
      const ritualToggle = wrapper
        .findAll('input[role="switch"]')
        .find((t) => t.attributes('aria-label') === '只顯示儀式法術')!
      await ritualToggle.setValue(true)
      const items = wrapper.findAllComponents(AccordionItemStub)
      expect(items).toHaveLength(1)
      expect(wrapper.text()).toContain('感知魔法')
      expect(wrapper.text()).not.toContain('魔法飛彈')
    })

    it('專注 toggle 啟用後僅顯示需專注法術', async () => {
      const wrapper = mountPanel({
        spells: [
          makeSpell({ id: 'a', name: '冰霜射線', concentration: true }),
          makeSpell({ id: 'b', name: '魔法飛彈', concentration: false }),
        ],
      })
      const concToggle = wrapper
        .findAll('input[role="switch"]')
        .find((t) => t.attributes('aria-label') === '只顯示需要專注的法術')!
      await concToggle.setValue(true)
      const items = wrapper.findAllComponents(AccordionItemStub)
      expect(items).toHaveLength(1)
      expect(wrapper.text()).toContain('冰霜射線')
    })

    it('清除篩選按鈕在無 active filter 時不顯示', () => {
      const wrapper = mountPanel({ spells: [makeSpell()] })
      expect(wrapper.text()).not.toContain('清除篩選')
    })

    it('啟用 filter 後顯示清除按鈕、點擊重置 filter', async () => {
      const wrapper = mountPanel({
        spells: [makeSpell({ id: 'a', name: '感知魔法', ritual: true })],
      })
      const ritualToggle = wrapper
        .findAll('input[role="switch"]')
        .find((t) => t.attributes('aria-label') === '只顯示儀式法術')!
      await ritualToggle.setValue(true)
      expect(wrapper.text()).toContain('清除篩選')
      const clearBtn = wrapper.findAll('button').find((b) => b.text() === '清除篩選')!
      await clearBtn.trigger('click')
      expect(wrapper.text()).not.toContain('清除篩選')
    })
  })
})
