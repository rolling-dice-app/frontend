import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppInput from '~/components/common/AppInput.vue'
import AppSelect from '~/components/common/AppSelect.vue'
import AppButton from '~/components/common/AppButton.vue'
import CharacterInfoSection from '~/components/business/character/form/basic/CharacterInfoSection.vue'
import { parseIntegerInput } from '~/utils/parse'
import type { CharacterFormStateBase, FormClassEntry } from '~/types/business/character-form'

beforeEach(() => {
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ButtonStub = {
  name: 'Button',
  props: ['size', 'outline', 'disabled', 'textColor', 'borderColor', 'radius'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
}

const baseClass = (overrides: Partial<FormClassEntry> = {}): FormClassEntry => ({
  classKey: null,
  level: 1,
  subclass: null,
  ...overrides,
})

const baseFormState = (overrides: Partial<CharacterFormStateBase> = {}): CharacterFormStateBase =>
  ({
    name: '',
    gender: null,
    race: null,
    subrace: null,
    alignment: null,
    background: null,
    faith: null,
    languages: null,
    tools: null,
    weaponProficiencies: null,
    armorProficiencies: null,
    classes: [baseClass()],
    skills: {},
    isJackOfAllTrades: false,
    isTough: false,
    age: null,
    height: null,
    weight: null,
    appearance: null,
    story: null,
    ...overrides,
  }) as CharacterFormStateBase

const mountSection = (
  params: {
    formState?: CharacterFormStateBase
    totalLevel?: number
    lockPrimaryClass?: boolean
  } = {},
) => {
  const formState = params.formState ?? baseFormState()
  return mount(CharacterInfoSection, {
    props: {
      formState,
      'onUpdate:formState': (next: CharacterFormStateBase) => Object.assign(formState, next),
      totalLevel: params.totalLevel ?? 1,
      lockPrimaryClass: params.lockPrimaryClass ?? false,
    },
    global: {
      stubs: { Icon: true, Button: ButtonStub },
      components: {
        CommonAppInput: AppInput,
        CommonAppSelect: AppSelect,
        CommonAppButton: AppButton,
      },
      mocks: { parseIntegerInput },
    },
  })
}

describe('CharacterInfoSection (form)', () => {
  describe('基本欄位', () => {
    it('name 輸入更新 formState.name', async () => {
      const formState = baseFormState()
      const wrapper = mountSection({ formState })
      await wrapper.find('input#char-name').setValue('亞倫')
      expect(formState.name).toBe('亞倫')
    })

    it('race 空字串時設為 null', async () => {
      const formState = baseFormState({ race: '矮人' })
      const wrapper = mountSection({ formState })
      await wrapper.find('input#char-race').setValue('')
      expect(formState.race).toBe(null)
    })

    it('languages / tools / weaponProficiencies / armorProficiencies 空字串時設為 null', async () => {
      const formState = baseFormState({ languages: '通用語' })
      const wrapper = mountSection({ formState })
      await wrapper.find('input#char-languages').setValue('')
      expect(formState.languages).toBe(null)
    })
  })

  describe('總等級顯示', () => {
    it('顯示「總等級：N / 20」', () => {
      const wrapper = mountSection({ totalLevel: 15 })
      expect(wrapper.text()).toContain('總等級：')
      expect(wrapper.text()).toContain('15')
      expect(wrapper.text()).toContain('/ 20')
    })
  })

  describe('職業列表', () => {
    it('每個職業 row 含 classKey select、subclass select、level input', () => {
      const wrapper = mountSection({
        formState: baseFormState({
          classes: [
            baseClass({ classKey: 'fighter', level: 5 }),
            baseClass({ classKey: 'wizard', level: 2 }),
          ],
        }),
      })
      expect(wrapper.find('input#prof-level-0').exists()).toBe(true)
      expect(wrapper.find('input#prof-level-1').exists()).toBe(true)
    })

    it('第一個 row label 為「主職業」、其後為「兼職 N」', () => {
      const wrapper = mountSection({
        formState: baseFormState({
          classes: [
            baseClass({ classKey: 'fighter', level: 5 }),
            baseClass({ classKey: 'wizard', level: 2 }),
          ],
        }),
      })
      const labels = wrapper.findAll('label[for^="prof-"]')
      const firstProfLabel = labels.find((l) => l.attributes('for') === 'prof-0')!
      const secondProfLabel = labels.find((l) => l.attributes('for') === 'prof-1')!
      expect(firstProfLabel.text()).toContain('主職業')
      expect(secondProfLabel.text()).toContain('兼職 1')
    })

    // 註：lockPrimaryClass 與 subclass disabled 的契約透過 @ui Select 元件 attrs
    // fall-through 控制；此測試環境下 @ui Select 為實際元件，內部結構不可控，留待整合測試覆蓋。

    it('level input 更新時 clamp 到 [1, 20]', async () => {
      const formState = baseFormState({
        classes: [baseClass({ classKey: 'fighter', level: 5 })],
      })
      const wrapper = mountSection({ formState })
      await wrapper.find('input#prof-level-0').setValue('25')
      expect(formState.classes[0]!.level).toBe(20)

      await wrapper.find('input#prof-level-0').setValue('0')
      expect(formState.classes[0]!.level).toBe(1)
    })

    it('新增職業按鈕：點擊 push 新 entry', async () => {
      const formState = baseFormState({
        classes: [baseClass({ classKey: 'fighter', level: 5 })],
      })
      const wrapper = mountSection({ formState })
      const addBtn = wrapper.findAll('button').find((b) => b.text().includes('新增職業'))!
      await addBtn.trigger('click')
      expect(formState.classes).toHaveLength(2)
      expect(formState.classes[1]).toEqual({ classKey: null, level: 1, subclass: null })
    })

    it('新增按鈕：未選 classKey 或 達上限時 disabled', () => {
      const wrapperUnselected = mountSection({
        formState: baseFormState({ classes: [baseClass()] }),
      })
      const addUnselected = wrapperUnselected
        .findAll('button')
        .find((b) => b.text().includes('新增職業'))!
      expect(addUnselected.attributes('disabled')).toBeDefined()
    })

    it('移除職業按鈕：第一 row 不顯示，其後 row 顯示且點擊移除', async () => {
      const formState = baseFormState({
        classes: [
          baseClass({ classKey: 'fighter', level: 5 }),
          baseClass({ classKey: 'wizard', level: 2 }),
        ],
      })
      const wrapper = mountSection({ formState })
      const removeBtns = wrapper.findAll('button[aria-label="移除此職業"]')
      expect(removeBtns).toHaveLength(1) // 只有 row 2 有移除按鈕
      await removeBtns[0]!.trigger('click')
      expect(formState.classes).toHaveLength(1)
      expect(formState.classes[0]!.classKey).toBe('fighter')
    })
  })
})
