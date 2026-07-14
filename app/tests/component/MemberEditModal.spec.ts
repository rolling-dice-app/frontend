import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppInput from '~/components/common/AppInput.vue'
import AppButton from '~/components/common/AppButton.vue'
import MemberEditModal from '~/components/business/dm-session/MemberEditModal.vue'
import type { DmSessionMemberDTO, SharedCharacterPreviewDTO } from '@rolling-dice-app/core'

const SHARE_A = `chs_${'A'.repeat(22)}`
const SHARE_B = `chs_${'B'.repeat(22)}`
const linkOf = (shareId: string) => `https://dice.example/share/${shareId}`
const canonicalLinkOf = (shareId: string) => `${window.location.origin}/share/${shareId}`

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const makePreview = (
  shareId: string,
  overrides: Partial<SharedCharacterPreviewDTO> = {},
): SharedCharacterPreviewDTO => ({
  shareId,
  available: true,
  name: '艾莉絲',
  avatar: null,
  ownerDisplayName: 'Roger',
  ...overrides,
})

const makeMember = (overrides: Partial<DmSessionMemberDTO> = {}): DmSessionMemberDTO => ({
  id: 'row-1',
  playerName: 'Anna',
  character: null,
  ...overrides,
})

const mockResolve = vi.fn()
const mockApiErrorHandle = vi.fn()

beforeEach(() => {
  mockResolve.mockReset()
  mockApiErrorHandle.mockReset()
  vi.stubGlobal('share', () => ({ resolveSharedCharacters: mockResolve }))
  vi.stubGlobal('useApiErrorToast', () => ({ handle: mockApiErrorHandle }))
  vi.stubGlobal('useRuntimeConfig', () => ({ app: { baseURL: '/' }, public: {} }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

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

const IconStub = {
  name: 'Icon',
  props: ['name', 'size'],
  template: '<span aria-hidden="true" />',
}

const mountModal = (members: DmSessionMemberDTO[] = [makeMember()]) =>
  mount(MemberEditModal, {
    props: { open: true, members },
    global: {
      stubs: { Modal: ModalStub, Button: ButtonStub, Icon: IconStub },
      components: { CommonAppInput: AppInput, CommonAppButton: AppButton },
    },
  })

type Wrapper = ReturnType<typeof mountModal>

const linkInput = (wrapper: Wrapper, index = 0) =>
  wrapper.findAll('input[aria-label="角色卡連結"]')[index]!

const playerNameInput = (wrapper: Wrapper, index = 0) =>
  wrapper.findAll('input[aria-label="玩家名稱"]')[index]!

const playerNameValue = (wrapper: Wrapper, index = 0) =>
  (playerNameInput(wrapper, index).element as HTMLInputElement).value

const charNameValue = (wrapper: Wrapper, index = 0) =>
  (wrapper.findAll('input[aria-label="角色名稱"]')[index]!.element as HTMLInputElement).value

const iconNames = (wrapper: Wrapper) =>
  wrapper.findAllComponents(IconStub).map((icon) => icon.props('name'))

const findButtonByText = (wrapper: Wrapper, text: string) =>
  wrapper.findAll('button').find((button) => button.text() === text)

describe('MemberEditModal（連結角色卡自動解析）', () => {
  describe('blur / Enter 觸發', () => {
    it('貼上合法連結後 blur 觸發解析，成功後唯讀欄顯示角色名、連結保留、出現成功 icon', async () => {
      mockResolve.mockResolvedValue({ previews: [makePreview(SHARE_A)] })
      const wrapper = mountModal()

      await linkInput(wrapper).setValue(linkOf(SHARE_A))
      expect(mockResolve).not.toHaveBeenCalled()

      await linkInput(wrapper).trigger('blur')
      await flushPromises()

      expect(mockResolve).toHaveBeenCalledExactlyOnceWith([SHARE_A])
      expect(charNameValue(wrapper)).toBe('艾莉絲')
      expect((linkInput(wrapper).element as HTMLInputElement).value).toBe(linkOf(SHARE_A))
      expect(iconNames(wrapper)).toContain('check-circle')
    })

    it('Enter 觸發解析，不需 blur', async () => {
      mockResolve.mockResolvedValue({ previews: [makePreview(SHARE_A)] })
      const wrapper = mountModal()

      await linkInput(wrapper).setValue(linkOf(SHARE_A))
      await linkInput(wrapper).trigger('keydown.enter')
      await flushPromises()

      expect(mockResolve).toHaveBeenCalledExactlyOnceWith([SHARE_A])
      expect(charNameValue(wrapper)).toBe('艾莉絲')
    })

    it('輸入期間（未 blur / Enter）不發請求、無提示、無 icon', async () => {
      const wrapper = mountModal()

      await linkInput(wrapper).setValue(linkOf(SHARE_A))

      expect(mockResolve).not.toHaveBeenCalled()
      expect(wrapper.find('[role="status"]').text()).toBe('')
      expect(iconNames(wrapper)).not.toContain('check-circle')
      expect(iconNames(wrapper)).not.toContain('alert-circle')
      expect(wrapper.find('.animate-spin').exists()).toBe(false)
    })

    it('同 shareId in-flight 時反覆 blur 只發一次請求，且 suffix 顯示 spinner', async () => {
      mockResolve.mockReturnValue(deferred().promise)
      const wrapper = mountModal()

      await linkInput(wrapper).setValue(linkOf(SHARE_A))
      await linkInput(wrapper).trigger('blur')
      await linkInput(wrapper).trigger('blur')

      expect(mockResolve).toHaveBeenCalledTimes(1)
      expect(wrapper.find('.animate-spin').exists()).toBe(true)
    })
  })

  describe('連結 input 為綁定單一來源', () => {
    it('已連結列開窗時預填 canonical 連結並顯示成功 icon，玩家名稱以最新暱稱自癒且唯讀', () => {
      const wrapper = mountModal([makeMember({ character: makePreview(SHARE_A) })])

      expect((linkInput(wrapper).element as HTMLInputElement).value).toBe(canonicalLinkOf(SHARE_A))
      expect(charNameValue(wrapper)).toBe('艾莉絲')
      expect(iconNames(wrapper)).toContain('check-circle')
      expect(playerNameValue(wrapper)).toBe('Roger')
      expect(playerNameInput(wrapper).attributes('readonly')).toBeDefined()
    })

    it('預填連結原樣 blur 為 no-op：不發請求、不報 duplicate', async () => {
      const wrapper = mountModal([makeMember({ character: makePreview(SHARE_A) })])

      await linkInput(wrapper).trigger('blur')

      expect(mockResolve).not.toHaveBeenCalled()
      expect(wrapper.find('[role="status"]').text()).toBe('')
      expect(iconNames(wrapper)).toContain('check-circle')
    })

    it('清空連結 input 後 blur 解除連結；玩家名稱恢復可編輯並保留 snapshot，confirm emit 的該列 character 為 null', async () => {
      const wrapper = mountModal([makeMember({ character: makePreview(SHARE_A) })])

      await linkInput(wrapper).setValue('')
      await linkInput(wrapper).trigger('blur')

      expect(charNameValue(wrapper)).toBe('')
      expect(iconNames(wrapper)).not.toContain('check-circle')
      // 開窗自癒已把玩家名稱刷成 'Roger'；解除連結後值保留、恢復可編輯
      expect(playerNameValue(wrapper)).toBe('Roger')
      expect(playerNameInput(wrapper).attributes('readonly')).toBeUndefined()

      await findButtonByText(wrapper, '確認')!.trigger('click')
      expect(wrapper.emitted('confirm')?.at(-1)).toEqual([
        [expect.objectContaining({ playerName: 'Roger', character: null })],
      ])
    })

    it('已連結列貼另一合法連結 blur 即更換角色', async () => {
      mockResolve.mockResolvedValue({ previews: [makePreview(SHARE_B, { name: '新角色' })] })
      const wrapper = mountModal([makeMember({ character: makePreview(SHARE_A) })])

      await linkInput(wrapper).setValue(linkOf(SHARE_B))
      await linkInput(wrapper).trigger('blur')
      await flushPromises()

      expect(mockResolve).toHaveBeenCalledExactlyOnceWith([SHARE_B])
      expect(charNameValue(wrapper)).toBe('新角色')
    })

    it('角色已失效的連結列：唯讀欄顯示失效文案、suffix 為失敗 icon 而非成功', () => {
      const wrapper = mountModal([
        makeMember({ character: makePreview(SHARE_A, { available: false, name: null }) }),
      ])
      expect(charNameValue(wrapper)).toBe('角色不存在或連結失效')
      expect(iconNames(wrapper)).toContain('alert-circle')
      expect(iconNames(wrapper)).not.toContain('check-circle')
    })

    it('貼上失效角色的連結：不建立綁定、顯示紅色 unavailable 提示與失敗 icon', async () => {
      mockResolve.mockResolvedValue({
        previews: [makePreview(SHARE_A, { available: false, name: null })],
      })
      const wrapper = mountModal()

      await linkInput(wrapper).setValue(linkOf(SHARE_A))
      await linkInput(wrapper).trigger('blur')
      await flushPromises()

      expect(charNameValue(wrapper)).toBe('')
      const hint = wrapper.find('[role="status"]')
      expect(hint.text()).toContain('角色不存在或連結失效')
      expect(hint.classes()).toContain('text-danger')
      expect(iconNames(wrapper)).toContain('alert-circle')
      expect(iconNames(wrapper)).not.toContain('check-circle')
    })

    it('已連結列貼新連結：解析啟動即清空原綁定，失效時列維持未綁定並顯示提示', async () => {
      const request = deferred<{ previews: SharedCharacterPreviewDTO[] }>()
      mockResolve.mockReturnValue(request.promise)
      const wrapper = mountModal([makeMember({ character: makePreview(SHARE_A) })])

      await linkInput(wrapper).setValue(linkOf(SHARE_B))
      await linkInput(wrapper).trigger('blur')

      expect(charNameValue(wrapper)).toBe('')
      expect(wrapper.find('.animate-spin').exists()).toBe(true)

      request.resolve({ previews: [makePreview(SHARE_B, { available: false, name: null })] })
      await flushPromises()

      expect(charNameValue(wrapper)).toBe('')
      expect(wrapper.find('[role="status"]').text()).toContain('角色不存在或連結失效')
    })
  })

  describe('玩家名稱 snapshot（PL 暱稱優先）', () => {
    it('未連結列玩家名稱可編輯；解析成功後自動帶入 ownerDisplayName 並轉唯讀', async () => {
      mockResolve.mockResolvedValue({ previews: [makePreview(SHARE_A)] })
      const wrapper = mountModal()

      expect(playerNameInput(wrapper).attributes('readonly')).toBeUndefined()

      await linkInput(wrapper).setValue(linkOf(SHARE_A))
      await linkInput(wrapper).trigger('blur')
      await flushPromises()

      expect(playerNameValue(wrapper)).toBe('Roger')
      expect(playerNameInput(wrapper).attributes('readonly')).toBeDefined()
    })

    it('解析成功但 ownerDisplayName 為 null：玩家名稱保留原值、仍轉唯讀', async () => {
      mockResolve.mockResolvedValue({
        previews: [makePreview(SHARE_A, { ownerDisplayName: null })],
      })
      const wrapper = mountModal()

      await linkInput(wrapper).setValue(linkOf(SHARE_A))
      await linkInput(wrapper).trigger('blur')
      await flushPromises()

      expect(playerNameValue(wrapper)).toBe('Anna')
      expect(playerNameInput(wrapper).attributes('readonly')).toBeDefined()
    })

    it('失效連結（available: false）成員開窗：玩家名稱保留舊 snapshot 不覆寫、維持唯讀', () => {
      const wrapper = mountModal([
        makeMember({
          character: makePreview(SHARE_A, {
            available: false,
            name: null,
            ownerDisplayName: null,
          }),
        }),
      ])

      expect(playerNameValue(wrapper)).toBe('Anna')
      expect(playerNameInput(wrapper).attributes('readonly')).toBeDefined()
    })
  })

  describe('不發請求的提示', () => {
    it('無效輸入 commit 顯示紅色 invalid 提示與失敗 icon，再次輸入即清除', async () => {
      const wrapper = mountModal()

      await linkInput(wrapper).setValue('not-a-link')
      await linkInput(wrapper).trigger('blur')

      expect(mockResolve).not.toHaveBeenCalled()
      const hint = wrapper.find('[role="status"]')
      expect(hint.text()).toContain('無法辨識的分享連結')
      expect(hint.classes()).toContain('text-danger')
      expect(iconNames(wrapper)).toContain('alert-circle')

      await linkInput(wrapper).setValue('not-a-link-2')
      expect(wrapper.find('[role="status"]').text()).toBe('')
      expect(iconNames(wrapper)).not.toContain('alert-circle')
    })

    it('commit 他列已連結的 shareId 顯示紅色 duplicate 提示且不發請求', async () => {
      const wrapper = mountModal([
        makeMember({ id: 'row-1', character: makePreview(SHARE_A) }),
        makeMember({ id: 'row-2', playerName: 'Bob' }),
      ])

      await linkInput(wrapper, 1).setValue(linkOf(SHARE_A))
      await linkInput(wrapper, 1).trigger('blur')

      expect(mockResolve).not.toHaveBeenCalled()
      const hint = wrapper.findAll('[role="status"]')[1]!
      expect(hint.text()).toContain('此角色卡已在名單中')
      expect(hint.classes()).toContain('text-danger')
    })
  })

  describe('競態與過期回應', () => {
    it('in-flight 中改輸入為另一連結並 commit：舊回應被丟棄、新回應套用', async () => {
      const requestA = deferred<{ previews: SharedCharacterPreviewDTO[] }>()
      const requestB = deferred<{ previews: SharedCharacterPreviewDTO[] }>()
      mockResolve.mockReturnValueOnce(requestA.promise).mockReturnValueOnce(requestB.promise)
      const wrapper = mountModal()

      await linkInput(wrapper).setValue(linkOf(SHARE_A))
      await linkInput(wrapper).trigger('blur')
      await linkInput(wrapper).setValue(linkOf(SHARE_B))
      await linkInput(wrapper).trigger('blur')
      expect(mockResolve).toHaveBeenCalledTimes(2)

      requestA.resolve({ previews: [makePreview(SHARE_A, { name: '舊角色' })] })
      await flushPromises()
      expect(charNameValue(wrapper)).toBe('')

      requestB.resolve({ previews: [makePreview(SHARE_B, { name: '新角色' })] })
      await flushPromises()
      expect(charNameValue(wrapper)).toBe('新角色')
    })

    it('in-flight 中刪除該列：回應落地不寫入、無殘留提示', async () => {
      const request = deferred<{ previews: SharedCharacterPreviewDTO[] }>()
      mockResolve.mockReturnValue(request.promise)
      const wrapper = mountModal()

      await linkInput(wrapper).setValue(linkOf(SHARE_A))
      await linkInput(wrapper).trigger('blur')
      await wrapper.find('button[aria-label="刪除 Anna"]').trigger('click')

      request.resolve({ previews: [makePreview(SHARE_A)] })
      await flushPromises()

      expect(wrapper.findAll('input[aria-label="角色名稱"]')).toHaveLength(0)
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
    })

    it('in-flight 中改動輸入：回應落地被丟棄且不殘留狀態', async () => {
      const request = deferred<{ previews: SharedCharacterPreviewDTO[] }>()
      mockResolve.mockReturnValue(request.promise)
      const wrapper = mountModal()

      await linkInput(wrapper).setValue(linkOf(SHARE_A))
      await linkInput(wrapper).trigger('blur')
      await linkInput(wrapper).setValue('edited')

      request.resolve({ previews: [makePreview(SHARE_A)] })
      await flushPromises()

      expect(charNameValue(wrapper)).toBe('')
      expect(wrapper.find('[role="status"]').text()).toBe('')
    })
  })

  describe('解析失敗與重試', () => {
    it('previews 為空：紅色 resolveFailed 提示、輸入保留、點重試再發一次', async () => {
      mockResolve.mockResolvedValue({ previews: [] })
      const wrapper = mountModal()

      await linkInput(wrapper).setValue(linkOf(SHARE_A))
      await linkInput(wrapper).trigger('blur')
      await flushPromises()

      expect(wrapper.find('[role="status"]').text()).toContain('找不到對應的角色卡')
      expect((linkInput(wrapper).element as HTMLInputElement).value).toBe(linkOf(SHARE_A))
      expect(iconNames(wrapper)).toContain('alert-circle')

      mockResolve.mockResolvedValue({ previews: [makePreview(SHARE_A)] })
      await wrapper.find('button[aria-label="重試"]').trigger('click')
      await flushPromises()

      expect(mockResolve).toHaveBeenCalledTimes(2)
      expect(charNameValue(wrapper)).toBe('艾莉絲')
    })

    it('API reject：呼叫 apiErrorToast.handle 並顯示紅色提示與重試', async () => {
      mockResolve.mockRejectedValue(new Error('network'))
      const wrapper = mountModal()

      await linkInput(wrapper).setValue(linkOf(SHARE_A))
      await linkInput(wrapper).trigger('blur')
      await flushPromises()

      expect(mockApiErrorHandle).toHaveBeenCalledOnce()
      const hint = wrapper.find('[role="status"]')
      expect(hint.text()).toContain('解析失敗')
      expect(hint.classes()).toContain('text-danger')
      const retryButton = wrapper.find('button[aria-label="重試"]')
      expect(retryButton.exists()).toBe(true)
      expect(retryButton.findComponent(IconStub).props('name')).toBe('restore')
    })
  })

  describe('confirm 與解析中互動', () => {
    it('resolving 中 confirm 被 guard 擋下，落地後可正常送出', async () => {
      const request = deferred<{ previews: SharedCharacterPreviewDTO[] }>()
      mockResolve.mockReturnValue(request.promise)
      const wrapper = mountModal()

      await linkInput(wrapper).setValue(linkOf(SHARE_A))
      await linkInput(wrapper).trigger('blur')

      const confirmButton = findButtonByText(wrapper, '確認')!
      expect(confirmButton.attributes('disabled')).toBeDefined()
      await confirmButton.trigger('click')
      expect(wrapper.emitted('confirm')).toBeUndefined()

      request.resolve({ previews: [makePreview(SHARE_A)] })
      await flushPromises()

      await confirmButton.trigger('click')
      // 解析成功即 snapshot PL 暱稱，emit 的玩家名稱為 ownerDisplayName
      expect(wrapper.emitted('confirm')?.at(-1)).toEqual([
        [expect.objectContaining({ playerName: 'Roger', character: makePreview(SHARE_A) })],
      ])
      expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    })

    it('他列輸入不受某列 resolving 影響（per-row 隔離）', async () => {
      mockResolve.mockReturnValue(deferred().promise)
      const wrapper = mountModal([
        makeMember({ id: 'row-1' }),
        makeMember({ id: 'row-2', playerName: 'Bob' }),
      ])

      await linkInput(wrapper, 0).setValue(linkOf(SHARE_A))
      await linkInput(wrapper, 0).trigger('blur')

      expect(linkInput(wrapper, 1).attributes('disabled')).toBeUndefined()
      expect(wrapper.findAll('[role="status"]')[1]!.text()).toBe('')
    })
  })
})
