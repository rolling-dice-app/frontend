import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { t } from '~/i18n'
import AppButton from '~/components/common/AppButton.vue'
import MonsterForm from '~/components/business/monster/Form.vue'
import { createMockMonsterFormState, createMockMonsterTemplate } from '~/tests/fixtures/monster'
import type { MonsterTemplateFormState } from '~/types/business/monster'

/**
 * 迴歸（monster C2）：子面板以 defineModel 綁 v-model:form-state。父層若把 state 建在
 * reactive 上，編譯出的 onUpdate:formState 會是 no-op —— 整包賦值靜默消失、型別檢查照過。
 */
const ModelPanelStub = {
  name: 'ModelPanel',
  props: { formState: { type: Object, required: true } },
  emits: ['update:formState'],
  template: '<button type="button" data-replace @click="replace">replace</button>',
  methods: {
    replace(this: { formState: MonsterTemplateFormState; $emit: (e: string, v: unknown) => void }) {
      // defineModel 最自然的整包替換寫法
      this.$emit('update:formState', { ...this.formState, name: '整包換掉的名字' })
    },
  },
}

const PassThroughStub = { template: '<div />' }

const mountForm = () =>
  mount(MonsterForm, {
    props: {
      monster: createMockMonsterFormState(createMockMonsterTemplate(), { name: '哥布林' }),
      mode: 'edit' as const,
    },
    global: {
      stubs: {
        BusinessMonsterFormBasicTab: ModelPanelStub,
        BusinessMonsterFormAbilitiesPanel: PassThroughStub,
        BusinessMonsterFormSkillsPanel: PassThroughStub,
        BusinessMonsterFormTraitsTextPanel: PassThroughStub,
        BusinessMonsterFormAttackList: PassThroughStub,
        BusinessMonsterFormFeatureList: PassThroughStub,
        CommonPageHeader: {
          props: ['title', 'showBack'],
          template: '<div><h1>{{ title }}</h1><slot name="actions" /></div>',
        },
        Button: {
          name: 'Button',
          props: ['radius', 'disabled', 'bgColor', 'loading'],
          template:
            '<button type="button" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
          emits: ['click'],
        },
      },
      components: { CommonAppButton: AppButton },
    },
  })

type Wrapper = ReturnType<typeof mountForm>

const saveButton = (wrapper: Wrapper) =>
  wrapper.findAll('button').find((b) => b.text() === t('ui.action.save'))!

describe('monster Form — v-model:form-state 資料流', () => {
  it('子面板整包替換 form state 會生效（emit 不是 no-op）', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-replace]').trigger('click')
    await saveButton(wrapper).trigger('click')

    expect(wrapper.emitted('save')?.at(-1)?.[0]).toMatchObject({ name: '整包換掉的名字' })
  })

  it('整包替換後標題與送出條件跟著更新', async () => {
    const wrapper = mountForm()
    expect(wrapper.text()).toContain('哥布林')
    await wrapper.find('[data-replace]').trigger('click')
    expect(wrapper.text()).toContain('整包換掉的名字')
  })

  it('save 送出的是脫勾副本，之後改本地 state 不影響已送出的值', async () => {
    const wrapper = mountForm()
    await saveButton(wrapper).trigger('click')
    const payload = wrapper.emitted('save')?.at(-1)?.[0] as MonsterTemplateFormState
    await wrapper.find('[data-replace]').trigger('click')
    expect(payload.name).toBe('哥布林')
  })
})
