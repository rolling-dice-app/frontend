import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '~/i18n'
import AppButton from '~/components/common/AppButton.vue'
import RosterPanel from '~/components/business/battlefield/RosterPanel.vue'
import { effectiveAc, effectiveMaxHp, sortOtherUnits } from '~/helpers/battlefield'
import { createMockBattlefieldUnit } from '~/tests/fixtures/battlefield'
import type { BattlefieldUnit } from '@rolling-dice-app/core'
import type { BattlefieldTemplateSource } from '~/types/business/battlefield'

beforeEach(() => {
  vi.stubGlobal('effectiveAc', effectiveAc)
  vi.stubGlobal('effectiveMaxHp', effectiveMaxHp)
  vi.stubGlobal('sortOtherUnits', sortOtherUnits)
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

const mountPanel = (
  units: BattlefieldUnit[] = [character, monster, adhoc],
  selectedId: string | null = null,
) =>
  mount(RosterPanel, {
    props: { units, templates, selectedId },
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

  it('參戰中的角色仍列在「出席角色」：參戰鈕 disabled、移除鈕照常 emit', async () => {
    const fighting = { ...character, inCombat: true }
    const wrapper = mountPanel([fighting])
    const row = rowOf(wrapper, '艾莉亞')
    const join = row.findAll('button').find((b) => b.text() === t('battlefield.join'))!

    expect(join.attributes('disabled')).toBeDefined()
    await join.trigger('click')
    expect(wrapper.emitted('enter')).toBeUndefined()

    await row.find(`[aria-label="${t('battlefield.removeUnit')} 艾莉亞"]`).trigger('click')
    expect(wrapper.emitted('removeUnit')?.at(-1)).toEqual(['u-aliya'])
  })

  it('未參戰的角色參戰鈕可按', () => {
    const wrapper = mountPanel([character])
    const join = rowOf(wrapper, '艾莉亞')
      .findAll('button')
      .find((b) => b.text() === t('battlefield.join'))!
    expect(join.attributes('disabled')).toBeUndefined()
  })

  it('參戰中的怪物與 adhoc 仍列在「其他單位」：參戰鈕 disabled、移除鈕照常 emit', async () => {
    const wrapper = mountPanel([
      { ...monster, inCombat: true },
      { ...adhoc, inCombat: true },
    ])
    expect(wrapper.findAll('[data-testid="battlefield-roster-row"]')).toHaveLength(2)

    const row = rowOf(wrapper, '哥布林 1')
    const join = row.findAll('button').find((b) => b.text() === t('battlefield.join'))!
    expect(join.attributes('disabled')).toBeDefined()

    await row.find(`[aria-label="${t('battlefield.removeUnit')} 哥布林 1"]`).trigger('click')
    expect(wrapper.emitted('removeUnit')?.at(-1)).toEqual(['u-g1'])
  })

  it('其他單位依模板分組排序，adhoc 殿後', () => {
    const goblin2 = { ...monster, id: 'u-g2', name: '哥布林 2', templateId: 't-goblin' }
    const goblin1 = { ...monster, templateId: 't-goblin' }
    const gnoll = { ...monster, id: 'u-n1', name: '豺狼人 1', templateId: 't-gnoll' }
    const wrapper = mountPanel([goblin2, adhoc, gnoll, goblin1])
    const names = wrapper
      .findAll('[data-testid="battlefield-roster-row"]')
      .map((row) => row.find('button').text())
    expect(names).toEqual(['哥布林 1', '哥布林 2', '豺狼人 1', '皮波'])
  })

  it('點單位列或名稱鈕 emit select；參戰／移除鈕不觸發選取', async () => {
    const wrapper = mountPanel()

    await rowOf(wrapper, '艾莉亞').trigger('click')
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['u-aliya'])

    const row = rowOf(wrapper, '哥布林 1')
    await row
      .find(`[aria-label="${t('battlefield.selectUnitAria', { name: '哥布林 1' })}"]`)
      .trigger('click')
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['u-g1'])
    expect(wrapper.emitted('select')).toHaveLength(2)

    await row
      .findAll('button')
      .find((b) => b.text() === t('battlefield.join'))!
      .trigger('click')
    await row.find(`[aria-label="${t('battlefield.removeUnit')} 哥布林 1"]`).trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(2)
  })

  it('selectedId 對應的列帶選取外框與 aria-pressed', () => {
    const wrapper = mountPanel(undefined, 'u-g1')
    const pressed = (name: string) =>
      rowOf(wrapper, name)
        .find(`[aria-label="${t('battlefield.selectUnitAria', { name })}"]`)
        .attributes('aria-pressed')

    expect(rowOf(wrapper, '哥布林 1').classes()).toContain('ring-primary')
    expect(pressed('哥布林 1')).toBe('true')
    expect(rowOf(wrapper, '艾莉亞').classes()).not.toContain('ring-primary')
    expect(pressed('艾莉亞')).toBe('false')
  })

  it('空狀態文案分流：沒有角色顯示「沒有參戰角色」、沒有其他單位顯示「沒有其他單位」', () => {
    const wrapper = mountPanel([])
    const texts = wrapper.findAll('p').map((p) => p.text())
    expect(texts).toEqual([
      t('battlefield.groupCharactersEmpty'),
      t('battlefield.groupOthersEmpty'),
    ])
  })
})
