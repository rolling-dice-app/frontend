import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useId } from 'vue'
import SpellSlotsPanel from '~/components/business/character/form/spells/SpellSlotsPanel.vue'
import type {
  SpellLevel,
  SpellSlotsDelta,
  ProfessionKey,
  SubprofessionKey,
} from '@rolling-dice-app/core'
import type { FormProfessionEntry } from '~/types/business/character-form'

vi.stubGlobal('useId', useId)

const profession = (
  profession: ProfessionKey,
  level: number,
  subprofession: SubprofessionKey | null = null,
): FormProfessionEntry => ({ profession, level, subprofession })

const mountPanel = (params: {
  professions: FormProfessionEntry[]
  spellSlotsDelta?: SpellSlotsDelta
  pactSlotsDelta?: SpellSlotsDelta
}) =>
  mount(SpellSlotsPanel, {
    props: {
      professions: params.professions,
      spellSlotsDelta: params.spellSlotsDelta ?? {},
      pactSlotsDelta: params.pactSlotsDelta ?? {},
      'onUpdate:spellSlotsDelta': () => {},
      'onUpdate:pactSlotsDelta': () => {},
    },
    global: {
      stubs: { Icon: true },
    },
  })

const getDisplayedAt = (wrapper: ReturnType<typeof mountPanel>, level: SpellLevel): number => {
  const cells = wrapper.findAll('.grid > div')
  return Number(cells[level - 1]!.find('span.font-mono').text())
}

const clickAdjust = async (
  wrapper: ReturnType<typeof mountPanel>,
  level: SpellLevel,
  dir: 'inc' | 'dec',
): Promise<void> => {
  const cells = wrapper.findAll('.grid > div')
  const buttons = cells[level - 1]!.findAll('button')
  await buttons[dir === 'dec' ? 0 : 1]!.trigger('click')
}

describe('SpellSlotsPanel', () => {
  describe('顯示值 = base + delta', () => {
    it('空 delta 時顯示 base（法師 5 級）', () => {
      const wrapper = mountPanel({ professions: [profession('wizard', 5)] })
      expect(getDisplayedAt(wrapper, 1)).toBe(4)
      expect(getDisplayedAt(wrapper, 2)).toBe(3)
      expect(getDisplayedAt(wrapper, 3)).toBe(2)
      expect(getDisplayedAt(wrapper, 4)).toBe(0)
    })

    it('正向 delta 疊加在 base 上', () => {
      const wrapper = mountPanel({
        professions: [profession('wizard', 5)],
        spellSlotsDelta: { 1: 2, 5: 1 },
      })
      expect(getDisplayedAt(wrapper, 1)).toBe(6)
      expect(getDisplayedAt(wrapper, 5)).toBe(1)
    })

    it('負向 delta 從 base 扣除（最低 0）', () => {
      const wrapper = mountPanel({
        professions: [profession('wizard', 5)],
        spellSlotsDelta: { 1: -1, 2: -10 },
      })
      expect(getDisplayedAt(wrapper, 1)).toBe(3)
      expect(getDisplayedAt(wrapper, 2)).toBe(0)
    })
  })

  describe('+/- 按鈕只異動 delta', () => {
    it('點擊 + 將 delta 設為 displayed - base', async () => {
      const wrapper = mountPanel({ professions: [profession('wizard', 5)] })
      await clickAdjust(wrapper, 1, 'inc')
      const emitted = wrapper.emitted('update:spellSlotsDelta')
      expect(emitted?.at(-1)).toEqual([{ 1: 1 }])
    })

    it('點擊 - 後再點擊 + 回到 base，delta key 應移除', async () => {
      const wrapper = mountPanel({ professions: [profession('wizard', 5)] })
      await clickAdjust(wrapper, 1, 'dec')
      let emitted = wrapper.emitted('update:spellSlotsDelta')
      expect(emitted?.at(-1)).toEqual([{ 1: -1 }])
      await wrapper.setProps({ spellSlotsDelta: { 1: -1 } })
      await clickAdjust(wrapper, 1, 'inc')
      emitted = wrapper.emitted('update:spellSlotsDelta')
      expect(emitted?.at(-1)).toEqual([{}])
    })

    it('在無 base 環級點擊 + 仍可加環位（戰士 5 級的 1 環）', async () => {
      const wrapper = mountPanel({ professions: [profession('fighter', 5)] })
      await clickAdjust(wrapper, 1, 'inc')
      const emitted = wrapper.emitted('update:spellSlotsDelta')
      expect(emitted?.at(-1)).toEqual([{ 1: 1 }])
    })
  })

  describe('邊界', () => {
    it('displayed 為 0 時 - 按鈕 disabled', () => {
      const wrapper = mountPanel({ professions: [profession('fighter', 5)] })
      const cells = wrapper.findAll('.grid > div')
      const decBtn = cells[0]!.findAll('button')[0]!
      expect(decBtn.attributes('disabled')).toBeDefined()
    })

    it('displayed 達 SLOT_MAX(9) 時 + 按鈕 disabled', () => {
      const wrapper = mountPanel({
        professions: [profession('wizard', 5)],
        spellSlotsDelta: { 1: 5 },
      })
      expect(getDisplayedAt(wrapper, 1)).toBe(9)
      const cells = wrapper.findAll('.grid > div')
      const incBtn = cells[0]!.findAll('button')[1]!
      expect(incBtn.attributes('disabled')).toBeDefined()
    })
  })

  describe('base 異動時 delta 應保留', () => {
    it('職業等級提升後，原 delta 仍疊加在新 base 上', async () => {
      const wrapper = mountPanel({
        professions: [profession('wizard', 1)],
        spellSlotsDelta: { 1: 1 },
      })
      expect(getDisplayedAt(wrapper, 1)).toBe(3) // base 2 + delta 1

      await wrapper.setProps({ professions: [profession('wizard', 5)] })
      expect(getDisplayedAt(wrapper, 1)).toBe(5) // base 4 + delta 1
      expect(getDisplayedAt(wrapper, 3)).toBe(2) // 新環級 base 自動帶入
    })

    it('subprofession 從 null 改為祕法騎士後，base 自動帶入但 delta 維持', async () => {
      const wrapper = mountPanel({
        professions: [profession('fighter', 9)],
        spellSlotsDelta: { 1: 2 },
      })
      expect(getDisplayedAt(wrapper, 1)).toBe(2) // base 0 + delta 2

      await wrapper.setProps({
        professions: [profession('fighter', 9, 'eldritchKnight')],
      })
      expect(getDisplayedAt(wrapper, 1)).toBe(6) // base 4 (effective 3) + delta 2
      expect(getDisplayedAt(wrapper, 2)).toBe(2) // 新 base 帶出 2 環
    })
  })

  describe('tab 切換', () => {
    it('預設為一般環位，切到契術後 + 寫入 pactSlotsDelta', async () => {
      const wrapper = mountPanel({ professions: [profession('warlock', 5)] })
      const tabs = wrapper.findAll('[role="tab"]')
      await tabs[1]!.trigger('click') // 切到契術

      // base for warlock 5 = { 3: 2 }
      expect(getDisplayedAt(wrapper, 3)).toBe(2)
      await clickAdjust(wrapper, 3, 'inc')
      const emitted = wrapper.emitted('update:pactSlotsDelta')
      expect(emitted?.at(-1)).toEqual([{ 3: 1 }])
      expect(wrapper.emitted('update:spellSlotsDelta')).toBeUndefined()
    })

    it('一般 tab 的 + 不會寫入契術 delta', async () => {
      const wrapper = mountPanel({ professions: [profession('wizard', 5)] })
      await clickAdjust(wrapper, 1, 'inc')
      expect(wrapper.emitted('update:spellSlotsDelta')).toBeDefined()
      expect(wrapper.emitted('update:pactSlotsDelta')).toBeUndefined()
    })
  })

  describe('ARIA 與鍵盤', () => {
    it('tabpanel 的 aria-labelledby 對應當前 active tab id', async () => {
      const wrapper = mountPanel({ professions: [profession('wizard', 5)] })
      const tabs = wrapper.findAll('[role="tab"]')
      const panel = wrapper.find('[role="tabpanel"]')
      expect(panel.exists()).toBe(true)
      expect(panel.attributes('aria-labelledby')).toBe(tabs[0]!.attributes('id'))

      await tabs[1]!.trigger('click')
      expect(panel.attributes('aria-labelledby')).toBe(tabs[1]!.attributes('id'))
    })

    it('每個 tab 的 aria-controls 指向 tabpanel id', () => {
      const wrapper = mountPanel({ professions: [profession('wizard', 5)] })
      const tabs = wrapper.findAll('[role="tab"]')
      const panel = wrapper.find('[role="tabpanel"]')
      const panelId = panel.attributes('id')
      expect(panelId).toBeTruthy()
      for (const tab of tabs) {
        expect(tab.attributes('aria-controls')).toBe(panelId)
      }
    })

    it('roving tabindex：active tab 為 0，inactive 為 -1', async () => {
      const wrapper = mountPanel({ professions: [profession('wizard', 5)] })
      const tabs = wrapper.findAll('[role="tab"]')
      expect(tabs[0]!.attributes('tabindex')).toBe('0')
      expect(tabs[1]!.attributes('tabindex')).toBe('-1')

      await tabs[1]!.trigger('click')
      expect(tabs[0]!.attributes('tabindex')).toBe('-1')
      expect(tabs[1]!.attributes('tabindex')).toBe('0')
    })

    it('右方向鍵切到下一個 tab，左方向鍵循環回上一個', async () => {
      const wrapper = mountPanel({ professions: [profession('wizard', 5)] })
      const tabs = wrapper.findAll('[role="tab"]')

      await tabs[0]!.trigger('keydown', { key: 'ArrowRight' })
      expect(tabs[1]!.attributes('aria-selected')).toBe('true')

      await tabs[1]!.trigger('keydown', { key: 'ArrowLeft' })
      expect(tabs[0]!.attributes('aria-selected')).toBe('true')
    })

    it('Home / End 跳到首 / 末 tab', async () => {
      const wrapper = mountPanel({ professions: [profession('wizard', 5)] })
      const tabs = wrapper.findAll('[role="tab"]')

      await tabs[0]!.trigger('keydown', { key: 'End' })
      expect(tabs[1]!.attributes('aria-selected')).toBe('true')

      await tabs[1]!.trigger('keydown', { key: 'Home' })
      expect(tabs[0]!.attributes('aria-selected')).toBe('true')
    })
  })
})
