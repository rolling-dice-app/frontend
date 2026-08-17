import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '~/i18n'
import AppButton from '~/components/common/AppButton.vue'
import RosterPanel from '~/components/business/battlefield/RosterPanel.vue'
import { effectiveAc, effectiveMaxHp } from '~/helpers/battlefield'
import { createMockBattlefieldUnit } from '~/tests/fixtures/battlefield'
import type { BattlefieldUnit } from '@rolling-dice-app/core'
import type { BattlefieldTemplateSource } from '~/types/business/battlefield'

beforeEach(() => {
  vi.stubGlobal('effectiveAc', effectiveAc)
  vi.stubGlobal('effectiveMaxHp', effectiveMaxHp)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const IconStub = { name: 'Icon', props: ['name', 'size'], template: '<span aria-hidden="true" />' }

const ButtonStub = {
  name: 'Button',
  props: ['radius', 'disabled', 'bgColor', 'loading'],
  template:
    '<button type="button" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
}

const character = createMockBattlefieldUnit({
  id: 'u-aliya',
  kind: 'character',
  faction: 'player',
  name: '艾莉亞',
  inCombat: false,
  maxHp: 44,
  hp: { current: 30, tempHp: 0, maxAdjustment: 0 },
  ac: 16,
})

const monster = createMockBattlefieldUnit({
  id: 'u-g1',
  kind: 'monster',
  faction: 'enemy',
  name: '哥布林 1',
  inCombat: false,
  maxHp: 7,
  hp: { current: 7, tempHp: 0, maxAdjustment: 0 },
})

const adhoc = createMockBattlefieldUnit({
  id: 'u-pipo',
  kind: 'adhoc',
  faction: 'neutral',
  name: '皮波',
  inCombat: false,
})

const templates: BattlefieldTemplateSource[] = [
  { id: 't-1', name: '座狼', challengeRating: '1/4', hp: 11, ac: 13 },
]

const mountPanel = (rosterUnits: BattlefieldUnit[] = [character, monster, adhoc]) =>
  mount(RosterPanel, {
    props: { rosterUnits, templates },
    global: {
      stubs: { Icon: IconStub, Button: ButtonStub },
      components: { CommonAppButton: AppButton },
    },
  })

type Wrapper = ReturnType<typeof mountPanel>

const rowOf = (wrapper: Wrapper, name: string) =>
  wrapper
    .findAll('[data-testid="battlefield-roster-row"]')
    .find((row) => row.text().includes(name))!

describe('RosterPanel', () => {
  it('依 kind 分組：角色進「出席角色」、怪物與 adhoc 進「其他單位」', () => {
    const wrapper = mountPanel()
    const groups = wrapper.findAll('h3').map((h) => h.text())
    expect(groups).toEqual([
      t('battlefield.groupCharacters'),
      t('battlefield.groupTemplates'),
      t('battlefield.groupOthers'),
    ])
    // 「其他單位」段落同時含退場的怪物與 adhoc
    const otherSection = wrapper.findAll('div.flex.flex-col').at(-1)!
    expect(otherSection.text()).toContain('哥布林 1')
    expect(otherSection.text()).toContain('皮波')
    expect(otherSection.text()).not.toContain('艾莉亞')
  })

  it('狀態列顯示有效 HP／AC（含調整值）', () => {
    const adjusted = createMockBattlefieldUnit({
      id: 'u-adj',
      kind: 'adhoc',
      name: '調整過',
      inCombat: false,
      maxHp: 20,
      hp: { current: 12, tempHp: 0, maxAdjustment: 5 },
      ac: 10,
      acAdjustment: 3,
    })
    const wrapper = mountPanel([adjusted])
    expect(rowOf(wrapper, '調整過').text()).toContain(
      t('battlefield.statHpAc', { current: 12, max: 25, ac: 13 }),
    )
  })

  it('帶狀態的單位在狀態列後綴狀態數', () => {
    const conditioned = createMockBattlefieldUnit({
      id: 'u-cond',
      kind: 'adhoc',
      name: '中毒的',
      inCombat: false,
      conditions: [
        { id: 'c1', key: 'poisoned', note: null },
        { id: 'c2', key: 'prone', note: null },
      ],
    })
    const wrapper = mountPanel([conditioned])
    expect(rowOf(wrapper, '中毒的').text()).toContain(t('battlefield.conditionCount', { count: 2 }))
  })

  it('參戰／移除鈕各自 emit 對應 unitId', async () => {
    const wrapper = mountPanel()
    const row = rowOf(wrapper, '哥布林 1')
    await row
      .findAll('button')
      .find((b) => b.text() === t('battlefield.join'))!
      .trigger('click')
    expect(wrapper.emitted('enter')?.at(-1)).toEqual(['u-g1'])

    await row.find(`[aria-label="${t('battlefield.removeUnit')} 哥布林 1"]`).trigger('click')
    expect(wrapper.emitted('removeUnit')?.at(-1)).toEqual(['u-g1'])
  })

  it('模板一鍵建實例並參戰：emit templateId', async () => {
    const wrapper = mountPanel([])
    const joinButtons = wrapper.findAll('button').filter((b) => b.text() === t('battlefield.join'))
    await joinButtons[0]!.trigger('click')
    expect(wrapper.emitted('addTemplate')?.at(-1)).toEqual(['t-1'])
  })

  it('分組為空時顯示「皆已參戰」提示', () => {
    const wrapper = mountPanel([])
    const hints = wrapper.findAll('p').filter((p) => p.text() === t('battlefield.groupEmpty'))
    expect(hints).toHaveLength(2) // 出席角色、其他單位
  })
})
