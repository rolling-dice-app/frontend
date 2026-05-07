import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HitDiceCard from '~/components/business/character/quickview/HitDiceCard.vue'
import type { ClassEntry } from '@rolling-dice-app/core'

const BadgeStub = {
  name: 'Badge',
  props: ['bgColor', 'size'],
  template: '<span class="badge"><slot /></span>',
}

const mountCard = (
  params: {
    classes?: ClassEntry[]
    hitDiceUsed?: Partial<Record<string, number>>
  } = {},
) =>
  mount(HitDiceCard, {
    props: {
      classes: params.classes ?? [],
      hitDiceUsed: params.hitDiceUsed ?? {},
    },
    global: {
      stubs: { Icon: true, Badge: BadgeStub },
    },
  })

const decBtn = (wrapper: ReturnType<typeof mountCard>, label: string) =>
  wrapper.find(`span[role="button"][aria-label="${label} 生命骰 -1"]`)
const incBtn = (wrapper: ReturnType<typeof mountCard>, label: string) =>
  wrapper.find(`span[role="button"][aria-label="${label} 生命骰 +1"]`)

describe('HitDiceCard', () => {
  describe('空狀態', () => {
    it('classes = [] 顯示提示文字、無 li', () => {
      const wrapper = mountCard()
      expect(wrapper.text()).toContain('尚未設定任何職業')
      expect(wrapper.findAll('li')).toHaveLength(0)
    })
  })

  describe('剩餘 / 總數顯示', () => {
    it('未使用顯示「level / level」', () => {
      const wrapper = mountCard({
        classes: [{ classKey: 'fighter', level: 5, subclass: null }],
      })
      const text = wrapper.find('li').text().replace(/\s+/g, '')
      expect(text).toContain('5/5')
    })

    it('hitDiceUsed 缺 key 視為 0', () => {
      const wrapper = mountCard({
        classes: [{ classKey: 'wizard', level: 3, subclass: null }],
        hitDiceUsed: {},
      })
      expect(wrapper.find('li').text().replace(/\s+/g, '')).toContain('3/3')
    })

    it('溢用時剩餘 clamp 為 0', () => {
      const wrapper = mountCard({
        classes: [{ classKey: 'fighter', level: 5, subclass: null }],
        hitDiceUsed: { fighter: 99 },
      })
      expect(wrapper.find('li').text().replace(/\s+/g, '')).toContain('0/5')
    })

    it('多職業各自一行', () => {
      const wrapper = mountCard({
        classes: [
          { classKey: 'fighter', level: 3, subclass: null },
          { classKey: 'wizard', level: 2, subclass: null },
        ],
      })
      expect(wrapper.findAll('li')).toHaveLength(2)
      expect(wrapper.text()).toContain('戰士')
      expect(wrapper.text()).toContain('法師')
      expect(wrapper.text()).toContain('d10')
      expect(wrapper.text()).toContain('d6')
    })
  })

  describe('decrement (-) 行為', () => {
    it('剩餘 > 0 點擊 emit adjust [classKey, +1, level]', async () => {
      const wrapper = mountCard({
        classes: [{ classKey: 'fighter', level: 5, subclass: null }],
      })
      await decBtn(wrapper, '戰士').trigger('click')
      expect(wrapper.emitted('adjust')).toEqual([['fighter', 1, 5]])
    })

    it('剩餘 = 0 時 aria-disabled 且點擊不 emit', async () => {
      const wrapper = mountCard({
        classes: [{ classKey: 'fighter', level: 3, subclass: null }],
        hitDiceUsed: { fighter: 3 },
      })
      expect(decBtn(wrapper, '戰士').attributes('aria-disabled')).toBe('true')
      await decBtn(wrapper, '戰士').trigger('click')
      expect(wrapper.emitted('adjust')).toBeUndefined()
    })
  })

  describe('increment (+) 行為', () => {
    it('剩餘 < level 點擊 emit adjust [classKey, -1, level]', async () => {
      const wrapper = mountCard({
        classes: [{ classKey: 'wizard', level: 4, subclass: null }],
        hitDiceUsed: { wizard: 2 },
      })
      await incBtn(wrapper, '法師').trigger('click')
      expect(wrapper.emitted('adjust')).toEqual([['wizard', -1, 4]])
    })

    it('剩餘 = level 時 aria-disabled 且點擊不 emit', async () => {
      const wrapper = mountCard({
        classes: [{ classKey: 'fighter', level: 5, subclass: null }],
      })
      expect(incBtn(wrapper, '戰士').attributes('aria-disabled')).toBe('true')
      await incBtn(wrapper, '戰士').trigger('click')
      expect(wrapper.emitted('adjust')).toBeUndefined()
    })
  })

  describe('鍵盤操作', () => {
    it('Enter 觸發 decrement 同 click', async () => {
      const wrapper = mountCard({
        classes: [{ classKey: 'fighter', level: 5, subclass: null }],
      })
      await decBtn(wrapper, '戰士').trigger('keydown.enter')
      expect(wrapper.emitted('adjust')).toEqual([['fighter', 1, 5]])
    })

    it('Space 觸發 increment 同 click', async () => {
      const wrapper = mountCard({
        classes: [{ classKey: 'wizard', level: 3, subclass: null }],
        hitDiceUsed: { wizard: 1 },
      })
      await incBtn(wrapper, '法師').trigger('keydown.space')
      expect(wrapper.emitted('adjust')).toEqual([['wizard', -1, 3]])
    })
  })
})
