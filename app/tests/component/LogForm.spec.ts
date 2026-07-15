import { reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppInput from '~/components/common/AppInput.vue'
import AppButton from '~/components/common/AppButton.vue'
import LogForm from '~/components/business/dm-session/LogForm.vue'
import { parseIntegerInput } from '~/utils/parse'
import type { DmSessionMemberDTO, SharedCharacterPreviewDTO } from '@rolling-dice-app/core'
import type { DmSessionLogDraft } from '~/types/business/dm-session'

const SHARE_A = `chs_${'A'.repeat(22)}`
const SHARE_B = `chs_${'B'.repeat(22)}`
const linkOf = (shareId: string) => `https://dice.example/share/${shareId}`

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

const makeDraft = (overrides: Partial<DmSessionLogDraft> = {}): DmSessionLogDraft => ({
  title: '第一場',
  date: '2026-07-15',
  content: '',
  members: [],
  moneyRewards: { pp: 0, gp: 0, sp: 0, cp: 0 },
  expRewards: 0,
  itemRewards: [],
  ...overrides,
})

const mockResolve = vi.fn()
const mockApiErrorHandle = vi.fn()

beforeEach(() => {
  mockResolve.mockReset()
  mockApiErrorHandle.mockReset()
  vi.stubGlobal('share', () => ({ resolveSharedCharacters: mockResolve }))
  vi.stubGlobal('useApiErrorToast', () => ({ handle: mockApiErrorHandle }))
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const PageHeaderStub = {
  name: 'CommonPageHeader',
  props: ['title', 'showBack', 'backTo'],
  template: '<div><slot name="actions" /></div>',
}

const ButtonStub = {
  name: 'Button',
  props: ['radius', 'disabled', 'bgColor', 'loading'],
  // 比照 @ui Button：loading 時自動 disabled
  template:
    '<button type="button" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
}

const IconStub = {
  name: 'Icon',
  props: ['name', 'size'],
  template: '<span aria-hidden="true" />',
}

const DatePickerStub = {
  name: 'DatePicker',
  props: ['modelValue', 'mode', 'size', 'clearable', 'teleport', 'borderColor'],
  template: '<input data-datepicker />',
}

const TextAreaStub = {
  name: 'TextArea',
  props: ['modelValue', 'rows', 'maxlength', 'showCount', 'placeholder', 'border', 'maxHeight'],
  template: '<textarea />',
}

const RewardListStub = {
  name: 'BusinessDmSessionLogRewardItemList',
  props: ['rewards', 'playerOptions'],
  template: '<div />',
}

const mountForm = (
  draft: DmSessionLogDraft = makeDraft(),
  containerMembers: DmSessionMemberDTO[] = [],
) =>
  mount(LogForm, {
    props: { log: draft, containerMembers },
    global: {
      stubs: {
        CommonPageHeader: PageHeaderStub,
        Button: ButtonStub,
        Icon: IconStub,
        DatePicker: DatePickerStub,
        TextArea: TextAreaStub,
        BusinessDmSessionLogRewardItemList: RewardListStub,
      },
      components: { CommonAppInput: AppInput, CommonAppButton: AppButton },
    },
  })

type Wrapper = ReturnType<typeof mountForm>

const adhocInput = (wrapper: Wrapper) => wrapper.find('#dm-session-log-adhoc')

const adhocInputValue = (wrapper: Wrapper) =>
  (adhocInput(wrapper).element as HTMLInputElement).value

const findButtonByText = (wrapper: Wrapper, text: string) =>
  wrapper.findAll('button').find((button) => button.text() === text)!

const addViaInput = async (wrapper: Wrapper, value: string) => {
  await adhocInput(wrapper).setValue(value)
  await findButtonByText(wrapper, '加入').trigger('click')
}

const statusHint = (wrapper: Wrapper) => wrapper.find('[role="status"]')

describe('LogForm 臨時出席（分享連結優先、文字 fallback）', () => {
  describe('純文字路徑', () => {
    it('非連結輸入直接加入純文字臨時成員，不發解析請求', async () => {
      const wrapper = mountForm()

      await addViaInput(wrapper, 'NewGuy')

      expect(mockResolve).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('NewGuy')
      expect(adhocInputValue(wrapper)).toBe('')
      expect(statusHint(wrapper).text()).toBe('')
    })

    it('Enter 與加入鈕等效', async () => {
      const wrapper = mountForm()

      await adhocInput(wrapper).setValue('NewGuy')
      await adhocInput(wrapper).trigger('keydown.enter')

      expect(wrapper.text()).toContain('NewGuy')
    })
  })

  describe('連結解析路徑', () => {
    it('貼有效連結解析成功：加入帶角色卡的成員、玩家名 snapshot PL 暱稱、chip 顯示角色名', async () => {
      mockResolve.mockResolvedValue({ previews: [makePreview(SHARE_A)] })
      const wrapper = mountForm()

      await addViaInput(wrapper, linkOf(SHARE_A))
      await flushPromises()

      expect(mockResolve).toHaveBeenCalledExactlyOnceWith([SHARE_A])
      expect(wrapper.text()).toContain('Roger')
      expect(wrapper.text()).toContain('艾莉絲')
      expect(adhocInputValue(wrapper)).toBe('')

      await findButtonByText(wrapper, '儲存').trigger('click')
      const saved = wrapper.emitted('save')?.at(-1)?.[0] as DmSessionLogDraft
      expect(saved.members).toEqual([
        expect.objectContaining({ playerName: 'Roger', character: makePreview(SHARE_A) }),
      ])
    })

    it('ownerDisplayName 缺漏時玩家名 fallback 角色名（防禦性）', async () => {
      mockResolve.mockResolvedValue({
        previews: [makePreview(SHARE_A, { ownerDisplayName: null })],
      })
      const wrapper = mountForm()

      await addViaInput(wrapper, linkOf(SHARE_A))
      await flushPromises()

      await findButtonByText(wrapper, '儲存').trigger('click')
      const saved = wrapper.emitted('save')?.at(-1)?.[0] as DmSessionLogDraft
      expect(saved.members).toEqual([expect.objectContaining({ playerName: '艾莉絲' })])
    })
  })

  describe('常駐成員連結', () => {
    it('連結對應未出席的常駐成員：自動標記出席、不發請求、不產生臨時 chip', async () => {
      const roster = makeMember({ character: makePreview(SHARE_A) })
      const wrapper = mountForm(makeDraft(), [roster])

      expect(wrapper.find('button[aria-pressed="true"]').exists()).toBe(false)

      await addViaInput(wrapper, linkOf(SHARE_A))

      expect(mockResolve).not.toHaveBeenCalled()
      expect(wrapper.find('button[aria-pressed="true"]').exists()).toBe(true)
      expect(adhocInputValue(wrapper)).toBe('')
      // 只有 roster chip，沒有帶移除鈕的臨時 chip
      expect(wrapper.find('button[aria-label^="移除出席"]').exists()).toBe(false)
    })

    it('連結對應已出席成員：顯示 duplicate 提示、輸入保留', async () => {
      const roster = makeMember({ character: makePreview(SHARE_A) })
      const wrapper = mountForm(makeDraft({ members: [roster] }), [roster])

      await addViaInput(wrapper, linkOf(SHARE_A))

      expect(mockResolve).not.toHaveBeenCalled()
      expect(statusHint(wrapper).text()).toContain('此角色卡已在名單中')
      expect(statusHint(wrapper).classes()).toContain('text-danger')
      expect(adhocInputValue(wrapper)).toBe(linkOf(SHARE_A))
    })

    it('連結對應已在名單的臨時成員：同樣擋下為 duplicate', async () => {
      const adhoc = makeMember({ id: 'adhoc-1', character: makePreview(SHARE_A) })
      const wrapper = mountForm(makeDraft({ members: [adhoc] }))

      await addViaInput(wrapper, linkOf(SHARE_A))

      expect(mockResolve).not.toHaveBeenCalled()
      expect(statusHint(wrapper).text()).toContain('此角色卡已在名單中')
    })
  })

  describe('解析失敗', () => {
    it('previews 為空：resolveFailed 提示、不加入成員、可重試', async () => {
      mockResolve.mockResolvedValue({ previews: [] })
      const wrapper = mountForm()

      await addViaInput(wrapper, linkOf(SHARE_A))
      await flushPromises()

      expect(statusHint(wrapper).text()).toContain('找不到對應的角色卡')
      expect(adhocInputValue(wrapper)).toBe(linkOf(SHARE_A))
      expect(wrapper.find('button[aria-label^="移除出席"]').exists()).toBe(false)

      mockResolve.mockResolvedValue({ previews: [makePreview(SHARE_A)] })
      await wrapper.find('button[aria-label="重試"]').trigger('click')
      await flushPromises()

      expect(mockResolve).toHaveBeenCalledTimes(2)
      expect(wrapper.text()).toContain('Roger')
    })

    it('角色已失效：unavailable 提示、不加入成員', async () => {
      mockResolve.mockResolvedValue({
        previews: [makePreview(SHARE_A, { available: false, name: null })],
      })
      const wrapper = mountForm()

      await addViaInput(wrapper, linkOf(SHARE_A))
      await flushPromises()

      expect(statusHint(wrapper).text()).toContain('角色不存在或連結失效')
      expect(wrapper.find('button[aria-label^="移除出席"]').exists()).toBe(false)
    })

    it('API reject：呼叫 apiErrorToast.handle 並顯示 resolveError 提示', async () => {
      mockResolve.mockRejectedValue(new Error('network'))
      const wrapper = mountForm()

      await addViaInput(wrapper, linkOf(SHARE_A))
      await flushPromises()

      expect(mockApiErrorHandle).toHaveBeenCalledOnce()
      expect(statusHint(wrapper).text()).toContain('解析失敗')
    })

    it('提示顯示中再次輸入即清除', async () => {
      mockResolve.mockResolvedValue({ previews: [] })
      const wrapper = mountForm()

      await addViaInput(wrapper, linkOf(SHARE_A))
      await flushPromises()
      expect(statusHint(wrapper).text()).not.toBe('')

      await adhocInput(wrapper).setValue('edited')
      expect(statusHint(wrapper).text()).toBe('')
    })
  })

  describe('resolving 中的互動', () => {
    it('resolving 中加入鈕與儲存鈕皆 disabled，落地後成員加入且可儲存', async () => {
      const request = deferred<{ previews: SharedCharacterPreviewDTO[] }>()
      mockResolve.mockReturnValue(request.promise)
      const wrapper = mountForm()

      await addViaInput(wrapper, linkOf(SHARE_A))

      expect(wrapper.find('.animate-spin').exists()).toBe(true)
      expect(findButtonByText(wrapper, '加入').attributes('disabled')).toBeDefined()
      const saveButton = findButtonByText(wrapper, '儲存')
      expect(saveButton.attributes('disabled')).toBeDefined()
      await saveButton.trigger('click')
      expect(wrapper.emitted('save')).toBeUndefined()

      request.resolve({ previews: [makePreview(SHARE_A)] })
      await flushPromises()

      await findButtonByText(wrapper, '儲存').trigger('click')
      const saved = wrapper.emitted('save')?.at(-1)?.[0] as DmSessionLogDraft
      expect(saved.members).toHaveLength(1)
    })

    it('in-flight 中改動輸入：過期回應被丟棄、不加入成員', async () => {
      const request = deferred<{ previews: SharedCharacterPreviewDTO[] }>()
      mockResolve.mockReturnValue(request.promise)
      const wrapper = mountForm()

      await addViaInput(wrapper, linkOf(SHARE_A))
      await adhocInput(wrapper).setValue(linkOf(SHARE_B))

      request.resolve({ previews: [makePreview(SHARE_A)] })
      await flushPromises()

      expect(wrapper.find('button[aria-label^="移除出席"]').exists()).toBe(false)
      expect(statusHint(wrapper).text()).toBe('')
    })
  })

  describe('儲存', () => {
    it('移除出席者（roster toggle off / 刪除臨時成員）後仍可儲存（DataCloneError regression）', async () => {
      const roster = makeMember({ character: makePreview(SHARE_A) })
      const adhoc = makeMember({ id: 'adhoc-1', playerName: 'Bob' })
      const stay = makeMember({
        id: 'adhoc-2',
        playerName: 'Carol',
        character: makePreview(SHARE_B),
      })
      const wrapper = mountForm(
        makeDraft({
          members: [roster, adhoc, stay],
          itemRewards: [{ id: 'r1', item: '長劍', player: 'Roger', remark: '' }],
        }),
        [roster],
      )

      await wrapper.find('button[aria-pressed="true"]').trigger('click')
      await wrapper.find('button[aria-label="移除出席 Bob"]').trigger('click')

      await findButtonByText(wrapper, '儲存').trigger('click')
      const saved = wrapper.emitted('save')?.at(-1)?.[0] as DmSessionLogDraft
      expect(saved.members).toEqual([expect.objectContaining({ playerName: 'Carol' })])
      expect(saved.itemRewards).toEqual([
        expect.objectContaining({ item: '長劍', player: 'Roger' }),
      ])
    })

    it('刪除獎勵列後仍可儲存（v-model filter 重建的元素為 reactive proxy）', async () => {
      const wrapper = mountForm(makeDraft())

      // 模擬 RewardItemList 以 filter 重建陣列：元素是讀取自 reactive 陣列的 proxy
      const proxyReward = reactive({ id: 'r1', item: '長劍', player: 'Roger', remark: '' })
      await wrapper.findComponent(RewardListStub).vm.$emit('update:rewards', [proxyReward])

      await findButtonByText(wrapper, '儲存').trigger('click')
      const saved = wrapper.emitted('save')?.at(-1)?.[0] as DmSessionLogDraft
      expect(saved.itemRewards).toEqual([expect.objectContaining({ item: '長劍' })])
    })
  })
})
