import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FeatureList from '~/components/business/character-detail/quickview/FeatureList.vue'
import type { CharacterFeature } from '@rolling-dice-app/core'

const AccordionStub = {
  name: 'Accordion',
  props: ['multiple', 'modelValue'],
  template: '<div><slot /></div>',
}

const AccordionItemStub = {
  name: 'AccordionItem',
  props: ['value'],
  template:
    '<div><div class="ai-title"><slot name="title" /></div><div class="ai-body"><slot /></div></div>',
}

const BadgeStub = {
  name: 'Badge',
  props: ['size', 'bgColor', 'textColor'],
  template: '<span class="badge"><slot /></span>',
}

const makeFeature = (overrides: Partial<CharacterFeature> = {}): CharacterFeature =>
  ({
    id: overrides.id ?? `f-${Math.random()}`,
    name: '怒火',
    description: '進入狂暴',
    source: 'class',
    usage: { hasUses: false },
    ...overrides,
  }) as CharacterFeature

const mountList = (
  params: {
    features?: CharacterFeature[]
    featureUsesSpent?: Partial<Record<string, number>>
  } = {},
) =>
  mount(FeatureList, {
    props: {
      features: params.features ?? [],
      featureUsesSpent: params.featureUsesSpent ?? {},
    },
    global: {
      stubs: {
        Icon: true,
        Badge: BadgeStub,
        Accordion: AccordionStub,
        AccordionItem: AccordionItemStub,
      },
    },
  })

const decBtn = (wrapper: ReturnType<typeof mountList>, name: string) =>
  wrapper.find(`span[role="button"][aria-label="${name} -1"]`)
const incBtn = (wrapper: ReturnType<typeof mountList>, name: string) =>
  wrapper.find(`span[role="button"][aria-label="${name} +1"]`)

describe('FeatureList', () => {
  describe('空狀態', () => {
    it('features = [] 顯示提示文字、無 AccordionItem', () => {
      const wrapper = mountList()
      expect(wrapper.text()).toContain('尚未設定任何特性')
      expect(wrapper.findAllComponents(AccordionItemStub)).toHaveLength(0)
    })
  })

  describe('特性渲染', () => {
    it('多個特性各自一個 AccordionItem', () => {
      const wrapper = mountList({
        features: [
          makeFeature({ id: 'a', name: '怒火' }),
          makeFeature({ id: 'b', name: '狂戰士' }),
        ],
      })
      expect(wrapper.findAllComponents(AccordionItemStub)).toHaveLength(2)
      expect(wrapper.text()).toContain('怒火')
      expect(wrapper.text()).toContain('狂戰士')
    })

    it('description 存在時顯示，缺少時顯示「（無說明）」', () => {
      const withDesc = mountList({ features: [makeFeature({ description: '進入狂暴' })] })
      expect(withDesc.text()).toContain('進入狂暴')

      const withoutDesc = mountList({ features: [makeFeature({ description: null })] })
      expect(withoutDesc.text()).toContain('（無說明）')
    })

    it('hasUses = false 時不渲染計數區與 ± 按鈕', () => {
      const wrapper = mountList({
        features: [makeFeature({ name: '怒火', usage: { hasUses: false } })],
      })
      expect(decBtn(wrapper, '怒火').exists()).toBe(false)
      expect(incBtn(wrapper, '怒火').exists()).toBe(false)
    })

    it('hasUses = true 時渲染 ± 按鈕與「current / max」', () => {
      const wrapper = mountList({
        features: [
          makeFeature({
            id: 'rage',
            name: '怒火',
            usage: { hasUses: true, max: 3, recovery: 'longRest' },
          }),
        ],
      })
      expect(decBtn(wrapper, '怒火').exists()).toBe(true)
      expect(incBtn(wrapper, '怒火').exists()).toBe(true)
      expect(wrapper.text().replace(/\s+/g, '')).toContain('3/3')
    })
  })

  describe('current 計算', () => {
    it('未消耗時 current = max', () => {
      const wrapper = mountList({
        features: [
          makeFeature({
            id: 'rage',
            name: '怒火',
            usage: { hasUses: true, max: 3, recovery: 'longRest' },
          }),
        ],
        featureUsesSpent: {},
      })
      expect(wrapper.text().replace(/\s+/g, '')).toContain('3/3')
    })

    it('部分消耗：current = max - spent', () => {
      const wrapper = mountList({
        features: [
          makeFeature({
            id: 'rage',
            name: '怒火',
            usage: { hasUses: true, max: 3, recovery: 'longRest' },
          }),
        ],
        featureUsesSpent: { rage: 1 },
      })
      expect(wrapper.text().replace(/\s+/g, '')).toContain('2/3')
    })

    it('溢用 clamp 為 0', () => {
      const wrapper = mountList({
        features: [
          makeFeature({
            id: 'rage',
            name: '怒火',
            usage: { hasUses: true, max: 3, recovery: 'longRest' },
          }),
        ],
        featureUsesSpent: { rage: 99 },
      })
      expect(wrapper.text().replace(/\s+/g, '')).toContain('0/3')
    })
  })

  describe('decrement / increment 行為', () => {
    it('current > 0 點 - emit adjust [id, +1, max]', async () => {
      const wrapper = mountList({
        features: [
          makeFeature({
            id: 'rage',
            name: '怒火',
            usage: { hasUses: true, max: 3, recovery: 'longRest' },
          }),
        ],
      })
      await decBtn(wrapper, '怒火').trigger('click')
      expect(wrapper.emitted('adjust')).toEqual([['rage', 1, 3]])
    })

    it('current = 0 時 aria-disabled 且不 emit', async () => {
      const wrapper = mountList({
        features: [
          makeFeature({
            id: 'rage',
            name: '怒火',
            usage: { hasUses: true, max: 3, recovery: 'longRest' },
          }),
        ],
        featureUsesSpent: { rage: 3 },
      })
      expect(decBtn(wrapper, '怒火').attributes('aria-disabled')).toBe('true')
      await decBtn(wrapper, '怒火').trigger('click')
      expect(wrapper.emitted('adjust')).toBeUndefined()
    })

    it('current < max 點 + emit adjust [id, -1, max]', async () => {
      const wrapper = mountList({
        features: [
          makeFeature({
            id: 'rage',
            name: '怒火',
            usage: { hasUses: true, max: 3, recovery: 'longRest' },
          }),
        ],
        featureUsesSpent: { rage: 2 },
      })
      await incBtn(wrapper, '怒火').trigger('click')
      expect(wrapper.emitted('adjust')).toEqual([['rage', -1, 3]])
    })

    it('current = max 時 aria-disabled 且不 emit', async () => {
      const wrapper = mountList({
        features: [
          makeFeature({
            id: 'rage',
            name: '怒火',
            usage: { hasUses: true, max: 3, recovery: 'longRest' },
          }),
        ],
      })
      expect(incBtn(wrapper, '怒火').attributes('aria-disabled')).toBe('true')
      await incBtn(wrapper, '怒火').trigger('click')
      expect(wrapper.emitted('adjust')).toBeUndefined()
    })

    it('Enter / Space 觸發同 click', async () => {
      const wrapper = mountList({
        features: [
          makeFeature({
            id: 'rage',
            name: '怒火',
            usage: { hasUses: true, max: 3, recovery: 'longRest' },
          }),
        ],
      })
      await decBtn(wrapper, '怒火').trigger('keydown.enter')
      await incBtn(wrapper, '怒火').trigger('keydown.space')
      // 第一次：current = 3 → dec emit [rage, +1, 3]；第二次：current 仍由 prop 控制，max 還是 3 但 current 沒變、+ 仍 disabled，不會 emit
      // 實際是 current 仍 = 3 因為 props 未變，inc 為 disabled，不應 emit。所以只 emit 一次
      expect(wrapper.emitted('adjust')).toEqual([['rage', 1, 3]])
    })
  })
})
