import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { createMockCharacter } from '~/tests/fixtures/character'
import RollDrawer from '~/components/business/character-detail/quickview/RollDrawer.vue'
import { getAbilityModifier } from '~/helpers/ability'
import {
  calculateSavingThrowBonuses,
  getSavingThrowBonus,
  getSkillBonus,
} from '~/helpers/character'
import { calculateSkillBonuses } from '~/helpers/skill'
import { getAttackHit } from '~/helpers/combat'
import type { AttackEntry, CharacterDTO } from '@rolling-dice-app/core'
import type { TotalAbilityScores } from '~/types/business/character-form'

vi.mock('~/helpers/dice', () => ({
  rollD20: vi.fn(),
  rollDice: vi.fn(),
  rollDie: vi.fn(),
}))

const { rollD20, rollDice, rollDie } = await import('~/helpers/dice')

const push = vi.fn()
const clear = vi.fn()
const entries = ref<unknown[]>([])

beforeEach(() => {
  push.mockClear()
  clear.mockClear()
  entries.value = []
  vi.stubGlobal('useDiceRollLog', () => ({ push, clear, entries }))
  vi.stubGlobal('getAbilityModifier', getAbilityModifier)
  vi.stubGlobal('getSavingThrowBonus', getSavingThrowBonus)
  vi.stubGlobal('calculateSavingThrowBonuses', calculateSavingThrowBonuses)
  vi.stubGlobal('getSkillBonus', getSkillBonus)
  vi.stubGlobal('calculateSkillBonuses', calculateSkillBonuses)
  vi.stubGlobal('getAttackHit', getAttackHit)
  vi.mocked(rollD20).mockReset()
  vi.mocked(rollDice).mockReset()
  vi.mocked(rollDie).mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ABILITY_SCORES: TotalAbilityScores = {
  strength: 16, // mod +3
  dexterity: 14, // mod +2
  constitution: 12, // mod +1
  intelligence: 10, // mod 0
  wisdom: 10,
  charisma: 10,
}

const DrawerStub = {
  name: 'Drawer',
  props: ['modelValue', 'placement', 'size', 'title', 'bgColor', 'textColor', 'borderColor'],
  emits: ['update:modelValue'],
  template: `<div data-drawer><slot v-if="modelValue" /></div>`,
}

const TriggerRowStub = {
  name: 'BusinessCharacterDetailQuickviewRollTriggerRow',
  props: ['label', 'modifier', 'disabled', 'modes'],
  emits: ['roll'],
  template: `<li data-trigger-row :data-label="label" :data-modifier="modifier" />`,
}

const AttackRowStub = {
  name: 'BusinessCharacterDetailQuickviewRollAttackRow',
  props: ['attack', 'abilityScores', 'proficiencyBonus'],
  emits: ['rollHit', 'rollDamage'],
  template: `<li data-attack-row :data-name="attack.name" />`,
}

const OutputListStub = {
  name: 'BusinessCharacterDetailQuickviewRollOutputList',
  props: ['entries'],
  emits: ['clear'],
  template: `<div data-output-list />`,
}

const makeAttack = (overrides: Partial<AttackEntry> = {}): AttackEntry => ({
  id: overrides.id ?? `atk-${Math.random()}`,
  name: '長劍',
  abilityKey: 'strength',
  damageDice: [{ id: 'd-1', dieType: 8, count: 1, bonus: null, damageType: 'slashing' }],
  extraHitBonus: null,
  applyAbilityToDamage: true,
  comment: null,
  ...overrides,
})

const makeCharacter = (overrides: Partial<CharacterDTO> = {}): CharacterDTO =>
  createMockCharacter(overrides)

const mountDrawer = (
  params: {
    character?: CharacterDTO
    abilityScores?: TotalAbilityScores
    proficiencyBonus?: number
    savingThrowProficiencies?: (
      | 'strength'
      | 'dexterity'
      | 'constitution'
      | 'intelligence'
      | 'wisdom'
      | 'charisma'
    )[]
    savingThrowAdjustments?: Partial<Record<string, number>>
    hitDiceUsed?: Partial<Record<string, number>>
    totalInitiative?: number
    onHealFromHitDie?: (amount: number) => void
    onConsumeHitDie?: (classKey: string, level: number) => void
  } = {},
) =>
  mount(RollDrawer, {
    props: {
      character: params.character ?? makeCharacter(),
      abilityScores: params.abilityScores ?? ABILITY_SCORES,
      proficiencyBonus: params.proficiencyBonus ?? 2,
      savingThrowProficiencies: params.savingThrowProficiencies ?? [],
      savingThrowAdjustments: params.savingThrowAdjustments ?? {},
      hitDiceUsed: params.hitDiceUsed ?? {},
      totalInitiative: params.totalInitiative ?? 2,
      onHealFromHitDie: params.onHealFromHitDie ?? vi.fn(),
      onConsumeHitDie: params.onConsumeHitDie ?? vi.fn(),
    },
    global: {
      stubs: {
        Icon: true,
        Drawer: DrawerStub,
        BusinessCharacterDetailQuickviewRollTriggerRow: TriggerRowStub,
        BusinessCharacterDetailQuickviewRollAttackRow: AttackRowStub,
        BusinessCharacterDetailQuickviewRollOutputList: OutputListStub,
      },
    },
  })

const triggerBtn = (wrapper: ReturnType<typeof mountDrawer>) =>
  wrapper.find('button[aria-label="開啟擲骰面板"]')

const openDrawer = async (wrapper: ReturnType<typeof mountDrawer>) => {
  await triggerBtn(wrapper).trigger('click')
  await nextTick()
}

const triggerRows = (wrapper: ReturnType<typeof mountDrawer>) =>
  wrapper.findAllComponents(TriggerRowStub)

const findRowByLabel = (wrapper: ReturnType<typeof mountDrawer>, label: string) =>
  triggerRows(wrapper).find((row) => row.props('label') === label)

describe('RollDrawer', () => {
  describe('Drawer 開合', () => {
    it('預設關閉，aria-expanded = false', () => {
      const wrapper = mountDrawer()
      expect(triggerBtn(wrapper).attributes('aria-expanded')).toBe('false')
    })

    it('點觸發按鈕後 aria-expanded = true', async () => {
      const wrapper = mountDrawer()
      await openDrawer(wrapper)
      expect(triggerBtn(wrapper).attributes('aria-expanded')).toBe('true')
    })
  })

  describe('行數與計算', () => {
    it('開啟後渲染 1 個 initiative row、6 個 ability row、6 個 saving-throw row、18 個 skill row、1 個生命骰 row（單 class）', async () => {
      const wrapper = mountDrawer()
      await openDrawer(wrapper)
      // 1 initiative + 6 ability + 6 saving + 18 skill + 1 hit-die（戰士 / d10） = 32
      expect(triggerRows(wrapper)).toHaveLength(1 + 6 + 6 + 18 + 1)
    })

    it('ability row 的 modifier 對應 abilityScores 的 mod', async () => {
      const wrapper = mountDrawer()
      await openDrawer(wrapper)
      const row = findRowByLabel(wrapper, '力量')
      expect(row?.props('modifier')).toBe(3) // mod +3
    })

    it('saving-throw 不熟練時 modifier = ability mod + adjustment', async () => {
      const wrapper = mountDrawer({
        savingThrowAdjustments: { strength: 1 },
      })
      await openDrawer(wrapper)
      // 力量豁免在 ability 與 saving 兩 section 都會出現「力量」label
      // saving-throw section 在 ability section 之後
      const rows = triggerRows(wrapper)
      const strengthSavingRow = rows.filter((r) => r.props('label') === '力量')[1]!
      expect(strengthSavingRow.props('modifier')).toBe(3 + 1) // 不熟練：mod +3 + adjust +1
    })

    it('saving-throw 有熟練時 modifier 加 proficiencyBonus', async () => {
      const wrapper = mountDrawer({
        savingThrowProficiencies: ['strength'],
        proficiencyBonus: 3,
      })
      await openDrawer(wrapper)
      const strengthSavingRow = triggerRows(wrapper).filter((r) => r.props('label') === '力量')[1]!
      expect(strengthSavingRow.props('modifier')).toBe(3 + 3) // mod +3 + prof 3
    })

    it('isJackOfAllTrades 時 proficiency=none 的 skill 加 floor(prof/2)', async () => {
      const wrapper = mountDrawer({
        character: makeCharacter({ isJackOfAllTrades: true, skills: {} }),
        proficiencyBonus: 4,
      })
      await openDrawer(wrapper)
      // 運動（力量）proficiency none、jack +2 → mod +3 + 2 = +5
      const row = findRowByLabel(wrapper, '運動')
      expect(row?.props('modifier')).toBe(3 + 2)
    })
  })

  describe('Attack section 條件渲染', () => {
    it('character.attacks 為空時不渲染攻擊區', async () => {
      const wrapper = mountDrawer({ character: makeCharacter({ attacks: [] }) })
      await openDrawer(wrapper)
      expect(wrapper.find('section[aria-labelledby="roll-section-attack"]').exists()).toBe(false)
      expect(wrapper.findAllComponents(AttackRowStub)).toHaveLength(0)
    })

    it('character.attacks 有資料時渲染攻擊區與對應行數', async () => {
      const wrapper = mountDrawer({
        character: makeCharacter({
          attacks: [makeAttack({ id: 'a' }), makeAttack({ id: 'b' })],
        }),
      })
      await openDrawer(wrapper)
      expect(wrapper.find('section[aria-labelledby="roll-section-attack"]').exists()).toBe(true)
      expect(wrapper.findAllComponents(AttackRowStub)).toHaveLength(2)
    })
  })

  describe('handleD20Roll', () => {
    it('chosen = 20 → push isCritical=true、total = chosen + modifier', async () => {
      vi.mocked(rollD20).mockReturnValueOnce({ rolls: [20], chosen: 20 })
      const wrapper = mountDrawer()
      await openDrawer(wrapper)
      const row = findRowByLabel(wrapper, '力量')!
      row.vm.$emit('roll', 'normal')
      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'ability',
          label: '力量',
          chosen: 20,
          modifier: 3,
          total: 23,
          isCritical: true,
          isFumble: false,
        }),
      )
    })

    it('chosen = 1 → push isFumble=true', async () => {
      vi.mocked(rollD20).mockReturnValueOnce({ rolls: [1], chosen: 1 })
      const wrapper = mountDrawer()
      await openDrawer(wrapper)
      const row = findRowByLabel(wrapper, '力量')!
      row.vm.$emit('roll', 'normal')
      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({ chosen: 1, isFumble: true, isCritical: false }),
      )
    })
  })

  describe('handleAttackHit', () => {
    it('攻擊命中 push label 含攻擊名 + 命中、kind = attack-hit', async () => {
      vi.mocked(rollD20).mockReturnValueOnce({ rolls: [10], chosen: 10 })
      const wrapper = mountDrawer({
        character: makeCharacter({
          attacks: [makeAttack({ id: 'a', name: '長劍' })],
        }),
      })
      await openDrawer(wrapper)
      const attackRow = wrapper.findAllComponents(AttackRowStub)[0]!
      attackRow.vm.$emit('rollHit', 'normal')
      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'attack-hit',
          label: '長劍 命中',
        }),
      )
    })
  })

  describe('handleAttackDamage', () => {
    it('一般傷害：count 不翻倍、push entry total 正確', async () => {
      // 1d8+0 ability mod +3（applyAbilityToDamage true, str mod +3） → 骰 [5] + 3 = 8
      vi.mocked(rollDice).mockReturnValueOnce([5])
      const wrapper = mountDrawer({
        character: makeCharacter({
          attacks: [makeAttack({ id: 'a', name: '長劍' })],
        }),
      })
      await openDrawer(wrapper)
      const attackRow = wrapper.findAllComponents(AttackRowStub)[0]!
      attackRow.vm.$emit('rollDamage', false)
      expect(rollDice).toHaveBeenCalledWith(1, 8)
      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'attack-damage',
          label: '長劍 傷害',
          isCritical: false,
          total: 8,
        }),
      )
    })

    it('暴擊：rollDice 用 count*2 呼叫', async () => {
      vi.mocked(rollDice).mockReturnValueOnce([5, 6])
      const wrapper = mountDrawer({
        character: makeCharacter({
          attacks: [makeAttack({ id: 'a', name: '長劍' })],
        }),
      })
      await openDrawer(wrapper)
      const attackRow = wrapper.findAllComponents(AttackRowStub)[0]!
      attackRow.vm.$emit('rollDamage', true)
      expect(rollDice).toHaveBeenCalledWith(2, 8)
      expect(push).toHaveBeenCalledWith(expect.objectContaining({ isCritical: true }))
    })

    it('renderable 為空（純 0 加值且無骰）時不 push', async () => {
      const wrapper = mountDrawer({
        character: makeCharacter({
          attacks: [
            makeAttack({
              id: 'a',
              applyAbilityToDamage: false, // 排除 ability mod
              damageDice: [{ id: 'd-1', dieType: null, count: 0, bonus: 0, damageType: null }],
            }),
          ],
        }),
      })
      await openDrawer(wrapper)
      const attackRow = wrapper.findAllComponents(AttackRowStub)[0]!
      attackRow.vm.$emit('rollDamage', false)
      expect(push).not.toHaveBeenCalled()
    })
  })

  describe('先攻', () => {
    it('先攻列位於第一個 section、label = 先攻、modifier = totalInitiative prop', async () => {
      const wrapper = mountDrawer({ totalInitiative: 4 })
      await openDrawer(wrapper)
      const rows = triggerRows(wrapper)
      expect(rows[0]!.props('label')).toBe('先攻')
      expect(rows[0]!.props('modifier')).toBe(4)
    })

    it('normal：push kind=initiative、total = chosen + totalInitiative', async () => {
      vi.mocked(rollD20).mockReturnValueOnce({ rolls: [15], chosen: 15 })
      const wrapper = mountDrawer({ totalInitiative: 3 })
      await openDrawer(wrapper)
      const row = findRowByLabel(wrapper, '先攻')!
      row.vm.$emit('roll', 'normal')
      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'initiative',
          label: '先攻',
          mode: 'normal',
          chosen: 15,
          modifier: 3,
          total: 18,
        }),
      )
    })

    it('advantage / disadvantage 也會帶 mode 與正確 total', async () => {
      vi.mocked(rollD20).mockReturnValueOnce({ rolls: [8, 17], chosen: 17 })
      const wrapper = mountDrawer({ totalInitiative: 2 })
      await openDrawer(wrapper)
      const row = findRowByLabel(wrapper, '先攻')!
      row.vm.$emit('roll', 'advantage')
      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'initiative',
          mode: 'advantage',
          chosen: 17,
          total: 19,
        }),
      )
    })
  })

  describe('生命骰', () => {
    it('每個 class 對應一列、label = 職業名 / d{hitDie}、modifier = CON mod', async () => {
      const wrapper = mountDrawer({
        character: makeCharacter({
          classes: [
            { classKey: 'fighter', level: 3, subclass: null },
            { classKey: 'wizard', level: 2, subclass: null },
          ],
        }),
      })
      await openDrawer(wrapper)
      const fighterRow = findRowByLabel(wrapper, '戰士 / d10')
      const wizardRow = findRowByLabel(wrapper, '法師 / d6')
      expect(fighterRow).toBeTruthy()
      expect(wizardRow).toBeTruthy()
      // CON 12 → mod +1
      expect(fighterRow?.props('modifier')).toBe(1)
      expect(wizardRow?.props('modifier')).toBe(1)
    })

    it('hitDiceUsed 已達 level 時對應列 disabled=true', async () => {
      const wrapper = mountDrawer({
        character: makeCharacter({
          classes: [
            { classKey: 'fighter', level: 3, subclass: null },
            { classKey: 'wizard', level: 2, subclass: null },
          ],
        }),
        hitDiceUsed: { fighter: 3, wizard: 1 },
      })
      await openDrawer(wrapper)
      expect(findRowByLabel(wrapper, '戰士 / d10')?.props('disabled')).toBe(true)
      expect(findRowByLabel(wrapper, '法師 / d6')?.props('disabled')).toBe(false)
    })

    it('擲一次：onConsumeHitDie(+1)、onHealFromHitDie(roll+CON)、push hit-die entry', async () => {
      vi.mocked(rollDie).mockReturnValueOnce(7)
      const onHeal = vi.fn()
      const onConsume = vi.fn()
      const wrapper = mountDrawer({
        onHealFromHitDie: onHeal,
        onConsumeHitDie: onConsume,
      })
      await openDrawer(wrapper)
      const row = findRowByLabel(wrapper, '戰士 / d10')!
      row.vm.$emit('roll', 'normal')
      expect(rollDie).toHaveBeenCalledWith(10)
      // CON 12 → mod +1，healed = max(0, 7 + 1) = 8
      expect(onConsume).toHaveBeenCalledWith('fighter', 5)
      expect(onHeal).toHaveBeenCalledWith(8)
      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'hit-die',
          classKey: 'fighter',
          sides: 10,
          roll: 7,
          modifier: 1,
          healed: 8,
        }),
      )
    })

    it('低 CON：roll 1 + mod -2 healed = 0、不呼叫 onHealFromHitDie 但仍消耗', async () => {
      vi.mocked(rollDie).mockReturnValueOnce(1)
      const onHeal = vi.fn()
      const onConsume = vi.fn()
      const wrapper = mountDrawer({
        abilityScores: { ...ABILITY_SCORES, constitution: 7 }, // mod -2
        onHealFromHitDie: onHeal,
        onConsumeHitDie: onConsume,
      })
      await openDrawer(wrapper)
      const row = findRowByLabel(wrapper, '戰士 / d10')!
      row.vm.$emit('roll', 'normal')
      expect(onConsume).toHaveBeenCalledTimes(1)
      expect(onHeal).not.toHaveBeenCalled()
      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'hit-die', roll: 1, modifier: -2, healed: 0 }),
      )
    })
  })

  describe('character 切換', () => {
    it('character.id 變動時呼叫 clear', async () => {
      const wrapper = mountDrawer({ character: makeCharacter({ id: 'c-1' }) })
      await wrapper.setProps({ character: makeCharacter({ id: 'c-2' }) })
      expect(clear).toHaveBeenCalled()
    })
  })
})
