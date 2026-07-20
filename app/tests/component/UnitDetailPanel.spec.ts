import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '~/i18n'
import AppButton from '~/components/common/AppButton.vue'
import UnitDetailPanel from '~/components/business/battlefield/UnitDetailPanel.vue'
import { formatModifier } from '~/helpers/ability'
import { formatCharacterTitle, hpRatioTier } from '~/helpers/battlefield'
import { calculateTotalLevel } from '~/helpers/character'
import { createMockBattlefieldUnit } from '~/tests/fixtures/battlefield'
import type { BattlefieldUnit } from '~/types/business/battlefield'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('hpRatioTier', hpRatioTier)
  vi.stubGlobal('formatCharacterTitle', formatCharacterTitle)
  vi.stubGlobal('calculateTotalLevel', calculateTotalLevel)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ButtonStub = {
  name: 'Button',
  props: ['radius', 'disabled', 'bgColor', 'loading'],
  template:
    '<button type="button" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
}

const mountPanel = (unit: Partial<BattlefieldUnit> = {}, isActive = false) =>
  mount(UnitDetailPanel, {
    props: {
      unit: createMockBattlefieldUnit({
        name: '哥布林 1',
        kind: 'monster',
        faction: 'enemy',
        inCombat: true,
        maxHp: 7,
        currentHp: 7,
        currentAc: 15,
        baseAc: 15,
        speedValue: null,
        speedText: '30 ft.',
        initiativeBonus: 2,
        ...unit,
      }),
      isActive,
    },
    global: {
      stubs: {
        Icon: true,
        Button: ButtonStub,
        BusinessBattlefieldHpQuickControls: true,
        BusinessBattlefieldConditionBadgeList: true,
      },
      components: { CommonAppButton: AppButton },
      mocks: { formatModifier, hpRatioTier },
    },
  })

type Wrapper = ReturnType<typeof mountPanel>

const buttonByLabel = (wrapper: Wrapper, label: string) =>
  wrapper.find(`button[aria-label="${label}"]`)
const buttonByText = (wrapper: Wrapper, text: string) =>
  wrapper.findAll('button').find((button) => button.text() === text)

describe('UnitDetailPanel', () => {
  it('行動中顯示 chip；否則參戰單位顯示「設為行動者」並可 emit', async () => {
    const active = mountPanel({}, true)
    expect(active.text()).toContain(t('battlefield.activeChip'))
    expect(buttonByText(active, t('battlefield.setActive'))).toBeUndefined()

    const idle = mountPanel()
    await buttonByText(idle, t('battlefield.setActive'))!.trigger('click')
    expect(idle.emitted('setActive')).toHaveLength(1)
  })

  it('參戰單位顯示退出戰鬥、未參戰顯示參戰', async () => {
    const inCombat = mountPanel()
    await buttonByText(inCombat, t('battlefield.leaveCombat'))!.trigger('click')
    expect(inCombat.emitted('leaveCombat')).toHaveLength(1)

    const bench = mountPanel({ inCombat: false })
    await buttonByText(bench, t('battlefield.join'))!.trigger('click')
    expect(bench.emitted('enterCombat')).toHaveLength(1)
  })

  it('陣營 segment 點擊 emit setFaction', async () => {
    const wrapper = mountPanel()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === t('battlefield.faction.player'))!
      .trigger('click')
    expect(wrapper.emitted('setFaction')).toEqual([['player']])
  })

  it('臨時／最大 HP／AC／先攻的 ±1 鈕 emit 對應 delta', async () => {
    const wrapper = mountPanel({ tempHp: 2 })
    await buttonByLabel(wrapper, `${t('battlefield.hpTemp')} -1`).trigger('click')
    await buttonByLabel(wrapper, `${t('battlefield.hpTemp')} +1`).trigger('click')
    expect(wrapper.emitted('adjustTemp')).toEqual([[-1], [1]])

    await buttonByLabel(wrapper, `${t('battlefield.hpMax')} +1`).trigger('click')
    expect(wrapper.emitted('adjustMax')).toEqual([[1]])

    await buttonByLabel(wrapper, `${t('battlefield.acLabel')} -1`).trigger('click')
    expect(wrapper.emitted('adjustAc')).toEqual([[-1]])

    await buttonByLabel(wrapper, `${t('battlefield.initiativeLabel')} +1`).trigger('click')
    expect(wrapper.emitted('adjustInitiative')).toEqual([[1]])
  })

  it('臨時 HP 為 0 時 -1 鈕停用', () => {
    const wrapper = mountPanel({ tempHp: 0 })
    expect(
      buttonByLabel(wrapper, `${t('battlefield.hpTemp')} -1`).attributes('disabled'),
    ).toBeDefined()
  })

  it('擲先攻鈕 emit rollInitiative', async () => {
    const wrapper = mountPanel()
    await buttonByLabel(wrapper, t('battlefield.rollInitiativeAria')).trigger('click')
    expect(wrapper.emitted('rollInitiative')).toHaveLength(1)
  })

  it('先攻輸入：change 提交數值、清空提交 null', async () => {
    const wrapper = mountPanel()
    const input = wrapper.find(
      `input[aria-label="${t('battlefield.initiativeAria', { name: '哥布林 1' })}"]`,
    )
    await input.setValue('14')
    expect(wrapper.emitted('setInitiative')?.at(-1)).toEqual([14])
    await input.setValue('')
    expect(wrapper.emitted('setInitiative')?.at(-1)).toEqual([null])
  })

  it('改名：change 提交修剪後名稱、空值不提交', async () => {
    const wrapper = mountPanel()
    const input = wrapper.find(`input[aria-label="${t('battlefield.nameAria')}"]`)
    await input.setValue('  哥布林斥候  ')
    expect(wrapper.emitted('rename')?.at(-1)).toEqual(['哥布林斥候'])
    await input.setValue('   ')
    expect(wrapper.emitted('rename')).toHaveLength(1)
  })

  it('AC 有調整量時顯示 (±N)', () => {
    const wrapper = mountPanel({ currentAc: 17, baseAc: 15 })
    expect(wrapper.text()).toContain('(+2)')
  })

  it('怪物速度顯示模板字串原樣', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('30 ft.')
  })

  it('character 由快照組「種族 主職業 Lv.總等級」；monster 顯示 title 原字', () => {
    const character = mountPanel({
      kind: 'character',
      race: '人類',
      classes: [{ classKey: 'fighter', level: 5, subclass: null }],
    })
    expect(character.text()).toContain(`人類 ${t('class.label.fighter')} Lv.5`)

    const monster = mountPanel({ title: 'CR 1' })
    expect(monster.text()).toContain('CR 1')
  })

  it('套用狀態：選擇 key＋備註 emit addCondition，備註隨後清空', async () => {
    const wrapper = mountPanel()
    const select = wrapper.find('select')
    await select.setValue('prone')
    const note = wrapper.find(`input[aria-label="${t('battlefield.conditionNotePlaceholder')}"]`)
    await note.setValue('被巨蛛絆倒')
    await buttonByText(wrapper, `＋${t('battlefield.applyCondition')}`)!.trigger('click')
    expect(wrapper.emitted('addCondition')?.at(-1)).toEqual(['prone', '被巨蛛絆倒'])
    expect((note.element as HTMLInputElement).value).toBe('')
  })
})
