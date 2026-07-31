import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '~/i18n'
import AppButton from '~/components/common/AppButton.vue'
import UnitDetailPanel from '~/components/business/battlefield/UnitDetailPanel.vue'
import { formatModifier } from '~/helpers/ability'
import {
  effectiveAc,
  effectiveMaxHp,
  formatChallengeRating,
  formatCharacterTitle,
  hpRatioTier,
} from '~/helpers/battlefield'
import { calculateTotalLevel } from '~/helpers/character'
import { parseIntegerInput } from '~/utils/parse'
import { createMockBattlefieldUnit } from '~/tests/fixtures/battlefield'
import type { BattlefieldUnit } from '@rolling-dice-app/core'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('hpRatioTier', hpRatioTier)
  vi.stubGlobal('formatCharacterTitle', formatCharacterTitle)
  vi.stubGlobal('formatChallengeRating', formatChallengeRating)
  vi.stubGlobal('effectiveAc', effectiveAc)
  vi.stubGlobal('effectiveMaxHp', effectiveMaxHp)
  vi.stubGlobal('calculateTotalLevel', calculateTotalLevel)
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
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

const DeathSavesSectionStub = {
  name: 'DeathSavesSectionStub',
  props: ['successes', 'failures'],
  emits: ['setSuccess', 'setFailure', 'roll'],
  template: '<div data-death-saves />',
}

const UnitAttackRowStub = {
  name: 'UnitAttackRowStub',
  props: ['attack'],
  emits: ['rollHit', 'rollDamage'],
  template: '<li data-attack-row :data-name="attack.name" />',
}

const UnitSkillListStub = {
  name: 'UnitSkillListStub',
  props: ['skills'],
  emits: ['roll'],
  template: '<ul data-skill-list />',
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
        hp: { current: 7, tempHp: 0, maxAdjustment: 0 },
        ac: 15,
        acAdjustment: 0,
        speed: 30,
        speedAdjustment: 0,
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
        BusinessBattlefieldDeathSavesSection: DeathSavesSectionStub,
        BusinessBattlefieldUnitAttackRow: UnitAttackRowStub,
        BusinessBattlefieldUnitSkillList: UnitSkillListStub,
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
    const wrapper = mountPanel({ hp: { current: 7, tempHp: 2, maxAdjustment: 0 } })
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
    const wrapper = mountPanel({ hp: { current: 7, tempHp: 0, maxAdjustment: 0 } })
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

  it('先攻超出上限：emit clamp 後的值，且 DOM 不殘留超界輸入', async () => {
    // store 已是 999 時再輸入 9999，clamp 後值不變 → Vue 不 patch DOM，
    // 未回寫的話輸入框會一直顯示 9999
    const wrapper = mountPanel({ initiative: 999 })
    const input = wrapper.find<HTMLInputElement>(
      `input[aria-label="${t('battlefield.initiativeAria', { name: '哥布林 1' })}"]`,
    )

    await input.setValue('9999')

    expect(wrapper.emitted('setInitiative')?.at(-1)).toEqual([999])
    expect(input.element.value).toBe('999')
  })

  it('先攻輸入非數字：emit null 並清空 DOM', async () => {
    const wrapper = mountPanel()
    const input = wrapper.find<HTMLInputElement>(
      `input[aria-label="${t('battlefield.initiativeAria', { name: '哥布林 1' })}"]`,
    )

    await input.setValue('abc')

    expect(wrapper.emitted('setInitiative')?.at(-1)).toEqual([null])
    expect(input.element.value).toBe('')
  })

  it('改名：change 提交修剪後名稱、空值不提交', async () => {
    const wrapper = mountPanel()
    const input = wrapper.find(`input[aria-label="${t('battlefield.nameAria')}"]`)
    await input.setValue('  哥布林斥候  ')
    expect(wrapper.emitted('rename')?.at(-1)).toEqual(['哥布林斥候'])
    await input.setValue('   ')
    expect(wrapper.emitted('rename')).toHaveLength(1)
  })

  it('改名空值：DOM 還原為現值，不殘留空白', async () => {
    const wrapper = mountPanel()
    const input = wrapper.find<HTMLInputElement>(`input[aria-label="${t('battlefield.nameAria')}"]`)

    await input.setValue('   ')

    expect(wrapper.emitted('rename')).toBeUndefined()
    expect(input.element.value).toBe('哥布林 1')
  })

  it('改名超過長度上限：emit 截斷後名稱，且 DOM 同步為截斷值', async () => {
    const wrapper = mountPanel()
    const input = wrapper.find<HTMLInputElement>(`input[aria-label="${t('battlefield.nameAria')}"]`)
    const tooLong = '哥'.repeat(120)

    await input.setValue(tooLong)

    const emitted = wrapper.emitted('rename')?.at(-1)?.[0] as string
    expect(emitted.length).toBeLessThan(tooLong.length)
    expect(input.element.value).toBe(emitted)
  })

  it('AC 有調整量時顯示有效值與 (±N)', () => {
    const wrapper = mountPanel({ ac: 15, acAdjustment: 2 })
    expect(wrapper.text()).toContain('17')
    expect(wrapper.text()).toContain('(+2)')
  })

  it('最大 HP 有調整量時顯示有效值與 (±N)', () => {
    const wrapper = mountPanel({ maxHp: 7, hp: { current: 7, tempHp: 0, maxAdjustment: 3 } })
    expect(wrapper.text()).toContain('10')
    expect(wrapper.text()).toContain('(+3)')
  })

  it('速度卡顯示有效速度（快照＋調整）與 (±N)；±鈕 emit adjustSpeed', async () => {
    const wrapper = mountPanel({ speed: 30, speedAdjustment: 10 })
    expect(wrapper.text()).toContain('40')
    expect(wrapper.text()).toContain('(+10)')
    await buttonByLabel(wrapper, `${t('battlefield.speedLabel')} -1`).trigger('click')
    expect(wrapper.emitted('adjustSpeed')?.at(-1)).toEqual([-1])
  })

  it('速度快照未知（null）顯示 em dash 且不給調整鈕', () => {
    const wrapper = mountPanel({ speed: null, speedAdjustment: 0 })
    expect(wrapper.text()).toContain('—')
    expect(wrapper.find(`button[aria-label="${t('battlefield.speedLabel')} +1"]`).exists()).toBe(
      false,
    )
  })

  it('character 由快照組「種族 主職業 Lv.總等級」；monster 由 challengeRating 組 CR 顯示', () => {
    const character = mountPanel({
      kind: 'character',
      race: '人類',
      classes: [{ classKey: 'fighter', level: 5, subclass: null }],
    })
    expect(character.text()).toContain(`人類 ${t('class.label.fighter')} Lv.5`)

    const monster = mountPanel({ challengeRating: '1' })
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

describe('UnitDetailPanel — 死亡豁免 / 攻擊 / 技能', () => {
  it('HP 0 才渲染死亡豁免區塊，計數與擲骰事件透傳', () => {
    const alive = mountPanel()
    expect(alive.find('[data-death-saves]').exists()).toBe(false)

    const downed = mountPanel({
      hp: { current: 0, tempHp: 0, maxAdjustment: 0 },
      deathSaves: { successes: 1, failures: 0 },
    })
    const section = downed.findComponent({ name: 'DeathSavesSectionStub' })
    expect(section.exists()).toBe(true)
    expect(section.props()).toMatchObject({ successes: 1, failures: 0 })
    section.vm.$emit('setSuccess', 2)
    section.vm.$emit('setFailure', 3)
    section.vm.$emit('roll')
    expect(downed.emitted('setDeathSaveSuccesses')).toEqual([[2]])
    expect(downed.emitted('setDeathSaveFailures')).toEqual([[3]])
    expect(downed.emitted('rollDeathSave')).toHaveLength(1)
  })

  it('attacks 空陣列不渲染攻擊區塊；有值逐列渲染並透傳擲骰事件', () => {
    expect(mountPanel().find('[data-attack-row]').exists()).toBe(false)

    const attack = {
      id: 'a-1',
      name: '彎刀',
      hitBonus: 4,
      damageDice: [{ id: 'd-1', dieType: 6 as const, count: 1, bonus: 2, damageType: null }],
      comment: null,
    }
    const wrapper = mountPanel({ attacks: [attack] })
    const row = wrapper.findComponent({ name: 'UnitAttackRowStub' })
    expect(row.props('attack')).toMatchObject({ name: '彎刀' })
    row.vm.$emit('rollHit', 'advantage')
    row.vm.$emit('rollDamage', true)
    expect(wrapper.emitted('rollAttackHit')).toEqual([[attack, 'advantage']])
    expect(wrapper.emitted('rollAttackDamage')).toEqual([[attack, true]])
  })

  it('skills 空物件不渲染技能區塊；有值透傳 roll 事件', () => {
    expect(mountPanel().find('[data-skill-list]').exists()).toBe(false)

    const wrapper = mountPanel({ skills: { stealth: 6 } })
    const list = wrapper.findComponent({ name: 'UnitSkillListStub' })
    expect(list.props('skills')).toEqual({ stealth: 6 })
    list.vm.$emit('roll', 'stealth', 'disadvantage')
    expect(wrapper.emitted('rollSkill')).toEqual([['stealth', 'disadvantage']])
  })
})
