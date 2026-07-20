import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '~/i18n'
import AppInput from '~/components/common/AppInput.vue'
import HpQuickControls from '~/components/business/battlefield/HpQuickControls.vue'
import { parseIntegerInput } from '~/utils/parse'

beforeEach(() => {
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const mountControls = () =>
  mount(HpQuickControls, {
    props: { name: '艾莉亞' },
    global: {
      stubs: { Icon: true },
      components: { CommonAppInput: AppInput },
      mocks: { parseIntegerInput },
    },
  })

type Wrapper = ReturnType<typeof mountControls>

const damageButton = (wrapper: Wrapper) =>
  wrapper.find(`button[aria-label="${t('battlefield.damageAria', { name: '艾莉亞' })}"]`)
const healButton = (wrapper: Wrapper) =>
  wrapper.find(`button[aria-label="${t('battlefield.healAria', { name: '艾莉亞' })}"]`)

describe('HpQuickControls', () => {
  it('量為 0 時傷害／治療鈕停用', () => {
    const wrapper = mountControls()
    expect(damageButton(wrapper).attributes('disabled')).toBeDefined()
    expect(healButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('輸入量後按傷害：emit damage 並清空輸入', async () => {
    const wrapper = mountControls()
    await wrapper.find('input').setValue('7')
    await damageButton(wrapper).trigger('click')
    expect(wrapper.emitted('damage')).toEqual([[7]])
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('0')
  })

  it('輸入量後按治療：emit heal 並清空輸入', async () => {
    const wrapper = mountControls()
    await wrapper.find('input').setValue('3')
    await healButton(wrapper).trigger('click')
    expect(wrapper.emitted('heal')).toEqual([[3]])
  })
})
