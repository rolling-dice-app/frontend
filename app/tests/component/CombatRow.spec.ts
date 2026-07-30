import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '~/i18n'
import CombatRow from '~/components/business/battlefield/CombatRow.vue'
import { effectiveMaxHp, hpRatioTier } from '~/helpers/battlefield'
import { parseIntegerInput } from '~/utils/parse'
import { createMockBattlefieldUnit } from '~/tests/fixtures/battlefield'
import type { BattlefieldUnit } from '@rolling-dice-app/core'

beforeEach(() => {
  vi.stubGlobal('effectiveMaxHp', effectiveMaxHp)
  vi.stubGlobal('hpRatioTier', hpRatioTier)
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const IconStub = { name: 'Icon', props: ['name', 'size'], template: '<span aria-hidden="true" />' }

const mountRow = (overrides: Partial<BattlefieldUnit> = {}) => {
  const unit = createMockBattlefieldUnit({ name: '哥布林 1', ...overrides })
  return mount(CombatRow, {
    props: { unit, active: false, selected: false },
    global: {
      stubs: {
        Icon: IconStub,
        BusinessBattlefieldConditionBadgeList: true,
        BusinessBattlefieldHpBar: true,
      },
      mocks: { effectiveMaxHp, hpRatioTier, parseIntegerInput },
    },
  })
}

type Wrapper = ReturnType<typeof mountRow>

const initiativeInput = (wrapper: Wrapper) =>
  wrapper.find<HTMLInputElement>(
    `input[aria-label="${t('battlefield.initiativeAria', { name: '哥布林 1' })}"]`,
  )

describe('CombatRow — 先攻輸入（B7 clamp 邊界去同步）', () => {
  it('輸入數值：emit 該值', async () => {
    const wrapper = mountRow()

    await initiativeInput(wrapper).setValue('14')

    expect(wrapper.emitted('setInitiative')?.at(-1)).toEqual([14])
  })

  it('清空：emit null', async () => {
    const wrapper = mountRow({ initiative: 12 })

    await initiativeInput(wrapper).setValue('')

    expect(wrapper.emitted('setInitiative')?.at(-1)).toEqual([null])
  })

  it('超出上限：emit clamp 後的值，且 DOM 不殘留超界輸入', async () => {
    // store 已是 999 時再輸入 9999，clamp 後值不變 → Vue 不 patch DOM，
    // 未回寫的話輸入框會一直顯示 9999
    const wrapper = mountRow({ initiative: 999 })

    await initiativeInput(wrapper).setValue('9999')

    expect(wrapper.emitted('setInitiative')?.at(-1)).toEqual([999])
    expect(initiativeInput(wrapper).element.value).toBe('999')
  })

  it('低於下限：同樣 clamp 並回寫', async () => {
    const wrapper = mountRow({ initiative: -999 })

    await initiativeInput(wrapper).setValue('-9999')

    expect(wrapper.emitted('setInitiative')?.at(-1)).toEqual([-999])
    expect(initiativeInput(wrapper).element.value).toBe('-999')
  })

  it('非數字輸入：emit null 並清空 DOM', async () => {
    const wrapper = mountRow()

    await initiativeInput(wrapper).setValue('abc')

    expect(wrapper.emitted('setInitiative')?.at(-1)).toEqual([null])
    expect(initiativeInput(wrapper).element.value).toBe('')
  })

  it('先攻欄的點擊不會冒泡成選取整列', async () => {
    const wrapper = mountRow()

    await initiativeInput(wrapper).trigger('click')

    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
