import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import AppInput from '~/components/common/AppInput.vue'
import AppSelect from '~/components/common/AppSelect.vue'
import AttackList from '~/components/business/character/form/combat/AttackList.vue'
import { useCharacterAttacksForm } from '~/composables/domain/useCharacterAttacksForm'
import { formatModifier, getAbilityModifier } from '~/helpers/ability'
import { formatDamageSummary, getAttackHit, getHitBonusColorClass } from '~/helpers/combat'
import { parseIntegerInput } from '~/utils/parse'
import type { AttackEntry } from '@rolling-dice-app/core'
import type { CharacterUpdateFormState, TotalAbilityScores } from '~/types/business/character-form'

beforeEach(() => {
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('getAbilityModifier', getAbilityModifier)
  vi.stubGlobal('getAttackHit', getAttackHit)
  vi.stubGlobal('getHitBonusColorClass', getHitBonusColorClass)
  vi.stubGlobal('formatDamageSummary', formatDamageSummary)
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
  vi.stubGlobal('useCharacterAttacksForm', useCharacterAttacksForm)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ABILITY_SCORES: TotalAbilityScores = {
  strength: 16, // mod +3
  dexterity: 14,
  constitution: 12,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
}

const ModalStub = {
  name: 'Modal',
  props: ['modelValue', 'title', 'size', 'bgColor', 'textColor', 'borderColor'],
  emits: ['update:modelValue'],
  template: `
    <div v-if="modelValue" data-modal>
      <h2>{{ title }}</h2>
      <slot />
      <div data-modal-footer><slot name="footer" /></div>
    </div>`,
}

const ButtonStub = {
  name: 'Button',
  props: ['radius', 'disabled', 'bgColor'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
}

const ToggleStub = {
  name: 'Toggle',
  props: ['modelValue', 'size', 'color'],
  emits: ['update:modelValue'],
  template: `
    <input
      type="checkbox"
      role="switch"
      :checked="modelValue"
      :aria-label="$attrs['aria-label']"
      @change="$emit('update:modelValue', $event.target.checked)"
    />`,
  inheritAttrs: false,
}

const TextAreaStub = {
  name: 'TextArea',
  props: ['modelValue', 'border', 'rows', 'maxlength', 'showCount'],
  emits: ['update:modelValue'],
  template: `
    <textarea
      :id="$attrs.id"
      :value="modelValue"
      :placeholder="$attrs.placeholder"
      @input="$emit('update:modelValue', $event.target.value)"
    />`,
  inheritAttrs: false,
}

const makeAttack = (overrides: Partial<AttackEntry> = {}): AttackEntry => ({
  id: overrides.id ?? `a-${Math.random()}`,
  name: '長劍',
  abilityKey: 'strength',
  damageDice: [{ id: 'd-1', dieType: 'd8', count: 1, bonus: null, damageType: 'slashing' }],
  extraHitBonus: null,
  applyAbilityToDamage: true,
  comment: null,
  ...overrides,
})

const baseFormState = (attacks: AttackEntry[] = []): CharacterUpdateFormState =>
  ({
    attacks,
  }) as unknown as CharacterUpdateFormState

const mountList = (
  params: { formState?: CharacterUpdateFormState; proficiencyBonus?: number } = {},
) => {
  const formState = params.formState ?? baseFormState()
  return mount(AttackList, {
    props: {
      formState,
      'onUpdate:formState': (next: CharacterUpdateFormState) => Object.assign(formState, next),
      abilityScores: ABILITY_SCORES,
      proficiencyBonus: params.proficiencyBonus ?? 2,
    },
    global: {
      stubs: {
        Icon: true,
        Modal: ModalStub,
        Button: ButtonStub,
        Toggle: ToggleStub,
        TextArea: TextAreaStub,
      },
      components: { CommonAppInput: AppInput, CommonAppSelect: AppSelect },
      mocks: {
        formatModifier,
        getAbilityModifier,
        getAttackHit,
        getHitBonusColorClass,
        formatDamageSummary,
        parseIntegerInput,
        useCharacterAttacksForm,
      },
    },
  })
}

const addBtn = (wrapper: ReturnType<typeof mountList>) =>
  wrapper.find('button[aria-label="新增攻擊"]')

describe('AttackList (form)', () => {
  describe('列表渲染', () => {
    it('attacks = [] 只渲染新增按鈕', () => {
      const wrapper = mountList()
      expect(wrapper.find('button[aria-label="新增攻擊"]').exists()).toBe(true)
      // 第 1 個 li 是新增按鈕本身
      expect(wrapper.findAll('section ul > li')).toHaveLength(1)
    })

    it('多攻擊各自一行（含新增 li 共 N+1 個）', () => {
      const wrapper = mountList({
        formState: baseFormState([
          makeAttack({ id: 'a', name: '長劍' }),
          makeAttack({ id: 'b', name: '匕首' }),
        ]),
      })
      expect(wrapper.findAll('section ul > li')).toHaveLength(3)
      expect(wrapper.text()).toContain('長劍')
      expect(wrapper.text()).toContain('匕首')
    })

    it('顯示計算後命中與 formatDamageSummary 結果', () => {
      const wrapper = mountList({
        formState: baseFormState([makeAttack({ name: '長劍' })]),
      })
      // str mod +3 + prof 2 = +5；damage 1d8 + str mod +3 → 1d8+3 劈砍
      expect(wrapper.text()).toContain('+5')
      expect(wrapper.text()).toContain('1d8+3')
      expect(wrapper.text()).toContain('劈砍')
    })

    it('comment 條件渲染', () => {
      const withComment = mountList({
        formState: baseFormState([makeAttack({ comment: '附加效果' })]),
      })
      expect(withComment.text()).toContain('附加效果')

      const withoutComment = mountList({
        formState: baseFormState([makeAttack({ comment: null })]),
      })
      expect(withoutComment.text()).not.toContain('附加效果')
    })
  })

  describe('刪除互動', () => {
    it('點刪除按鈕從 formState.attacks 移除該攻擊', async () => {
      const formState = baseFormState([
        makeAttack({ id: 'a', name: '長劍' }),
        makeAttack({ id: 'b', name: '匕首' }),
      ])
      const wrapper = mountList({ formState })
      const trashBtn = wrapper
        .findAll('button')
        .find((b) => b.attributes('aria-label') === '刪除 長劍')!
      await trashBtn.trigger('click')
      expect(formState.attacks.map((a) => a.name)).toEqual(['匕首'])
    })
  })

  describe('Modal 開合', () => {
    it('預設 modal 關閉', () => {
      const wrapper = mountList()
      expect(wrapper.find('[data-modal]').exists()).toBe(false)
    })

    it('點新增按鈕開 modal、標題為「新增攻擊模組」', async () => {
      const wrapper = mountList()
      await addBtn(wrapper).trigger('click')
      const modal = wrapper.find('[data-modal]')
      expect(modal.exists()).toBe(true)
      expect(modal.text()).toContain('新增攻擊模組')
    })

    it('點編輯按鈕開 modal、標題為「編輯攻擊模組」、帶入既有 name', async () => {
      const wrapper = mountList({
        formState: baseFormState([makeAttack({ id: 'a', name: '長劍' })]),
      })
      const editBtn = wrapper
        .findAll('button')
        .find((b) => b.attributes('aria-label') === '編輯 長劍')!
      await editBtn.trigger('click')
      const modal = wrapper.find('[data-modal]')
      expect(modal.exists()).toBe(true)
      expect(modal.text()).toContain('編輯攻擊模組')
      const nameInput = modal.find('input#attack-modal-name').element as HTMLInputElement
      expect(nameInput.value).toBe('長劍')
    })
  })

  describe('Modal 內互動', () => {
    it('name 空白時確認按鈕 disabled', async () => {
      const wrapper = mountList()
      await addBtn(wrapper).trigger('click')
      const confirmBtn = wrapper.find('[data-modal-footer] button')
      expect(confirmBtn.attributes('disabled')).toBeDefined()
    })

    it('輸入 name 後確認按鈕啟用、點擊後新增 attack', async () => {
      const formState = baseFormState()
      const wrapper = mountList({ formState })
      await addBtn(wrapper).trigger('click')
      const nameInput = wrapper.find('input#attack-modal-name')
      await nameInput.setValue('短劍')
      await nextTick()
      const confirmBtn = wrapper.find('[data-modal-footer] button')
      expect(confirmBtn.attributes('disabled')).toBeUndefined()
      await confirmBtn.trigger('click')
      expect(formState.attacks).toHaveLength(1)
      expect(formState.attacks[0]!.name).toBe('短劍')
    })

    it('編輯後存檔更新既有 attack 而非新增', async () => {
      const formState = baseFormState([makeAttack({ id: 'a', name: '長劍' })])
      const wrapper = mountList({ formState })
      const editBtn = wrapper
        .findAll('button')
        .find((b) => b.attributes('aria-label') === '編輯 長劍')!
      await editBtn.trigger('click')
      const nameInput = wrapper.find('input#attack-modal-name')
      await nameInput.setValue('巨劍')
      const confirmBtn = wrapper.find('[data-modal-footer] button')
      await confirmBtn.trigger('click')
      expect(formState.attacks).toHaveLength(1)
      expect(formState.attacks[0]!.id).toBe('a')
      expect(formState.attacks[0]!.name).toBe('巨劍')
    })

    it('新增傷害行：點「新增傷害骰」會多一 row', async () => {
      const wrapper = mountList()
      await addBtn(wrapper).trigger('click')
      const damageRowCount = () =>
        wrapper.findAll('button').filter((b) => b.attributes('aria-label')?.startsWith('移除第'))
          .length
      const before = damageRowCount()
      await wrapper.find('button[aria-label="新增傷害行"]').trigger('click')
      expect(damageRowCount()).toBe(before + 1)
    })

    it('刪除傷害行：點移除按鈕將該行從 draft 移除', async () => {
      const wrapper = mountList({
        formState: baseFormState([makeAttack({ id: 'a', name: '長劍' })]),
      })
      const editBtn = wrapper
        .findAll('button')
        .find((b) => b.attributes('aria-label') === '編輯 長劍')!
      await editBtn.trigger('click')
      const damageRowCount = () =>
        wrapper.findAll('button').filter((b) => b.attributes('aria-label')?.startsWith('移除第'))
          .length
      const before = damageRowCount()
      expect(before).toBe(1) // 編輯模式帶入 1 行 damage
      const removeBtn = wrapper
        .findAll('button')
        .find((b) => b.attributes('aria-label') === '移除第 1 行')!
      await removeBtn.trigger('click')
      expect(damageRowCount()).toBe(before - 1)
    })
  })
})
