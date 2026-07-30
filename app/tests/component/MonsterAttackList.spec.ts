import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppInput from '~/components/common/AppInput.vue'
import AppSelect from '~/components/common/AppSelect.vue'
import AppButton from '~/components/common/AppButton.vue'
import AttackList from '~/components/business/monster-form/AttackList.vue'
import { t } from '~/i18n'
import { formatModifier } from '~/helpers/ability'
import { formatDamageDice, isMeaningfulDamageEntry } from '~/helpers/monster'
import { parseIntegerInput } from '~/utils/parse'
import { cleanText, cleanTextOrNull } from '~/utils/text'
import { createMockMonsterFormState, createMockMonsterTemplate } from '~/tests/fixtures/monster'
import type { MonsterTemplateFormState } from '~/types/business/monster'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('formatDamageDice', formatDamageDice)
  vi.stubGlobal('isMeaningfulDamageEntry', isMeaningfulDamageEntry)
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
  vi.stubGlobal('cleanText', cleanText)
  vi.stubGlobal('cleanTextOrNull', cleanTextOrNull)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ModalStub = {
  name: 'Modal',
  props: [
    'modelValue',
    'title',
    'size',
    'closeOnClickOutside',
    'bgColor',
    'textColor',
    'borderColor',
  ],
  emits: ['update:modelValue'],
  template: `
    <div v-if="modelValue" data-modal>
      <h2>{{ title }}</h2>
      <slot />
      <div data-modal-footer><slot name="footer" /></div>
    </div>`,
}

// @ui 的 Select 是自訂下拉，非原生元素；換成原生 select 才驗得動骰面選擇
const SelectStub = {
  name: 'Select',
  props: ['modelValue', 'options', 'size', 'placeholder'],
  emits: ['update:modelValue'],
  template: `
    <select
      :aria-label="$attrs['aria-label']"
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>`,
  inheritAttrs: false,
}

const TextAreaStub = {
  name: 'TextArea',
  props: ['modelValue', 'border', 'rows', 'maxHeight', 'maxlength', 'showCount'],
  emits: ['update:modelValue'],
  template: `<textarea :id="$attrs.id" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
  inheritAttrs: false,
}

const emptyState = (): MonsterTemplateFormState =>
  createMockMonsterFormState(createMockMonsterTemplate({ attacks: [] }))

const mountList = (formState: MonsterTemplateFormState = emptyState()) =>
  mount(AttackList, {
    props: {
      formState,
      'onUpdate:formState': (next: MonsterTemplateFormState) => Object.assign(formState, next),
    },
    global: {
      stubs: { Icon: true, Modal: ModalStub, Select: SelectStub, TextArea: TextAreaStub },
      components: {
        CommonAppInput: AppInput,
        CommonAppSelect: AppSelect,
        CommonAppButton: AppButton,
      },
      mocks: { formatModifier, formatDamageDice, parseIntegerInput },
    },
  })

type Wrapper = ReturnType<typeof mountList>

const clickByAria = async (wrapper: Wrapper, label: string) => {
  const button = wrapper.find(`button[aria-label="${label}"]`)
  expect(button.exists()).toBe(true)
  await button.trigger('click')
}

const confirm = async (wrapper: Wrapper) => {
  const button = wrapper
    .findAll('[data-modal-footer] button')
    .find((b) => b.text() === t('ui.action.confirm'))
  expect(button).toBeDefined()
  await button!.trigger('click')
}

/** 開新增窗、填名稱、加 N 個傷害列（不填內容） */
const openDraft = async (wrapper: Wrapper, damageRows: number) => {
  await clickByAria(wrapper, t('monster.addAttack'))
  await wrapper.find('#monster-attack-name').setValue('彎刀')
  for (let i = 0; i < damageRows; i++) {
    await clickByAria(wrapper, t('combat.addDamageRow'))
  }
}

const rowInput = (wrapper: Wrapper, index: number, field: string) =>
  wrapper.find<HTMLInputElement>(
    `input[aria-label="${t('combat.rowOrdinal')} ${index + 1} ${field}"]`,
  )

describe('monster-form AttackList — 傷害列過濾（B4）', () => {
  it('四欄全空的傷害列不入庫', async () => {
    const formState = emptyState()
    const wrapper = mountList(formState)

    await openDraft(wrapper, 1)
    await confirm(wrapper)

    expect(formState.attacks).toHaveLength(1)
    expect(formState.attacks[0]!.damageDice).toEqual([])
  })

  it('只填 count 未選骰面的半填列不入庫', async () => {
    const formState = emptyState()
    const wrapper = mountList(formState)

    await openDraft(wrapper, 1)
    await rowInput(wrapper, 0, t('combat.rowDieCount')).setValue('2')
    await confirm(wrapper)

    expect(formState.attacks[0]!.damageDice).toEqual([])
  })

  it('完整骰式保留，全空列同時被濾掉', async () => {
    const formState = emptyState()
    const wrapper = mountList(formState)

    await openDraft(wrapper, 2)
    await rowInput(wrapper, 0, t('combat.rowDieCount')).setValue('1')
    await wrapper
      .find(`select[aria-label="${t('combat.rowOrdinal')} 1 ${t('combat.rowDieType')}"]`)
      .setValue('6')
    await confirm(wrapper)

    const dice = formState.attacks[0]!.damageDice
    expect(dice).toHaveLength(1)
    expect(dice[0]).toMatchObject({ count: 1, dieType: 6 })
  })

  it('無骰但有非零加值的純定額傷害列保留', async () => {
    const formState = emptyState()
    const wrapper = mountList(formState)

    await openDraft(wrapper, 1)
    await rowInput(wrapper, 0, t('combat.rowBonus')).setValue('3')
    await confirm(wrapper)

    const dice = formState.attacks[0]!.damageDice
    expect(dice).toHaveLength(1)
    expect(dice[0]).toMatchObject({ count: 0, dieType: null, bonus: 3 })
  })

  it('編輯既有攻擊時同樣過濾掉新加的空列', async () => {
    const withAttack = createMockMonsterFormState(createMockMonsterTemplate())
    const wrapper = mountList(withAttack)

    await clickByAria(wrapper, `${t('ui.action.edit')} 彎刀`)
    await clickByAria(wrapper, t('combat.addDamageRow'))
    await confirm(wrapper)

    // 原本那筆 1d6+2 留著，新加的空列被濾掉
    expect(withAttack.attacks[0]!.damageDice).toHaveLength(1)
    expect(withAttack.attacks[0]!.damageDice[0]).toMatchObject({ count: 1, dieType: 6, bonus: 2 })
  })
})
