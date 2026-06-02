import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useId } from 'vue'
import TeammateInput from '~/components/business/character-detail/campaigns/TeammateInput.vue'
import type { SharedCharacterPreviewDTO } from '@rolling-dice-app/core'

const VALID_LINK = 'https://app.test/character/share/chs_abcdefghijklmnopqrstuv'

const errorToast = vi.fn()
const infoToast = vi.fn()
const handleApiError = vi.fn()
const resolveSharedCharacters = vi.fn()

beforeEach(() => {
  errorToast.mockClear()
  infoToast.mockClear()
  handleApiError.mockClear()
  resolveSharedCharacters.mockReset()
  vi.stubGlobal('useId', useId)
  vi.stubGlobal('useToast', () => ({ error: errorToast, info: infoToast }))
  vi.stubGlobal('useApiErrorToast', () => ({ handle: handleApiError }))
  vi.stubGlobal('share', () => ({ resolveSharedCharacters }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const InputStub = {
  name: 'CommonAppInput',
  inheritAttrs: false,
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
}

const ButtonStub = {
  name: 'Button',
  emits: ['click'],
  template: `<button type="button" @click="$emit('click')"><slot /></button>`,
}

const mountInput = (modelValue: SharedCharacterPreviewDTO[] = [], max = 3) =>
  mount(TeammateInput, {
    props: { modelValue, max },
    global: {
      stubs: { CommonAppInput: InputStub, Button: ButtonStub, Icon: true },
    },
  })

const addLink = async (wrapper: ReturnType<typeof mountInput>, link: string) => {
  await wrapper.find('input').setValue(link)
  await wrapper.find('button').trigger('click')
  await flushPromises()
}

describe('TeammateInput', () => {
  it('resolve 回空結果時顯示 notFound toast，且不 emit 更新', async () => {
    resolveSharedCharacters.mockResolvedValue({ previews: [] })
    const wrapper = mountInput()
    await addLink(wrapper, VALID_LINK)
    expect(errorToast).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('resolve 回 preview 時 emit 更新且不報錯', async () => {
    const preview = { shareId: 'chs_abcdefghijklmnopqrstuv', available: true, name: '夥伴' }
    resolveSharedCharacters.mockResolvedValue({ previews: [preview] })
    const wrapper = mountInput()
    await addLink(wrapper, VALID_LINK)
    expect(errorToast).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[preview]])
  })
})
