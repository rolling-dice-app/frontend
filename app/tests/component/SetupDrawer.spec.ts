import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '~/i18n'
import AppInput from '~/components/common/AppInput.vue'
import AppButton from '~/components/common/AppButton.vue'
import SetupDrawer from '~/components/business/battlefield/SetupDrawer.vue'
import { formatModifier } from '~/helpers/ability'
import { formatCharacterTitle } from '~/helpers/battlefield'
import { parseShareIdFromLink } from '~/helpers/share'
import { parseIntegerInput } from '~/utils/parse'
import { createMockMemberSource } from '~/tests/fixtures/battlefield'
import type { BattlefieldMemberSource } from '~/types/business/battlefield'

const SHARE_A = `chs_${'A'.repeat(22)}`
const SHARE_B = `chs_${'B'.repeat(22)}`
const linkOf = (shareId: string) => `https://dice.example/share/${shareId}`

const mockToastError = vi.fn()

beforeEach(() => {
  mockToastError.mockReset()
  vi.stubGlobal('formatModifier', formatModifier)
  vi.stubGlobal('formatCharacterTitle', formatCharacterTitle)
  vi.stubGlobal('parseShareIdFromLink', parseShareIdFromLink)
  vi.stubGlobal('parseIntegerInput', parseIntegerInput)
  vi.stubGlobal('useToast', () => ({
    error: mockToastError,
    success: vi.fn(),
    info: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    items: [],
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const DrawerStub = {
  name: 'Drawer',
  props: ['modelValue', 'placement', 'size', 'title', 'bgColor', 'textColor', 'borderColor'],
  emits: ['update:modelValue'],
  template: '<div v-if="modelValue"><slot /></div>',
}

const IconStub = { name: 'Icon', props: ['name', 'size'], template: '<span aria-hidden="true" />' }

const ButtonStub = {
  name: 'Button',
  props: ['radius', 'disabled', 'bgColor', 'loading'],
  template:
    '<button type="button" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
}

/** 失效成員（available: false）才會出現「重新連結」入口 */
const unavailableMember = (
  memberId: string,
  shareId: string,
  playerName: string,
): BattlefieldMemberSource => ({ memberId, shareId, playerName, available: false })

const SESSION_LOG_TO = '/dm/session/container-1/log/session-1'

const NuxtLinkStub = { name: 'NuxtLink', props: ['to'], template: '<a :href="to"><slot /></a>' }

const mountDrawer = (
  members: BattlefieldMemberSource[],
  state: { membersLoading?: boolean; membersError?: boolean } = {},
) =>
  mount(SetupDrawer, {
    props: {
      open: true,
      members,
      templates: [],
      units: [],
      sessionLogTo: SESSION_LOG_TO,
      ...state,
    },
    global: {
      stubs: { Drawer: DrawerStub, Icon: IconStub, Button: ButtonStub, NuxtLink: NuxtLinkStub },
      components: { CommonAppInput: AppInput, CommonAppButton: AppButton },
      mocks: { formatModifier, formatCharacterTitle, parseIntegerInput },
    },
  })

type Wrapper = ReturnType<typeof mountDrawer>

const findButtonByText = (wrapper: Wrapper, text: string) =>
  wrapper.findAll('button').filter((b) => b.text() === text)

/** 展開某列的重新連結輸入並送出指定連結 */
const relink = async (wrapper: Wrapper, rowIndex: number, link: string) => {
  await findButtonByText(wrapper, t('battlefield.relinkMember'))[rowIndex]!.trigger('click')
  await wrapper.find(`input[aria-label="${t('battlefield.relinkPlaceholder')}"]`).setValue(link)
  await findButtonByText(wrapper, t('battlefield.relinkConfirm'))[0]!.trigger('click')
}

describe('SetupDrawer — 重新連結（B8 重複 shareId）', () => {
  it('連結解析失敗：toast 提示且不 emit', async () => {
    const wrapper = mountDrawer([unavailableMember('m-1', SHARE_A, 'Anna')])

    await relink(wrapper, 0, '不是連結')

    expect(mockToastError).toHaveBeenCalledWith(t('battlefield.relinkInvalidLink'))
    expect(wrapper.emitted('relinkMember')).toBeUndefined()
  })

  it('連結到名單中其他成員已使用的角色卡：擋下並提示，不 emit', async () => {
    const wrapper = mountDrawer([
      unavailableMember('m-1', SHARE_A, 'Anna'),
      createMockMemberSource({ memberId: 'm-2', shareId: SHARE_B, playerName: 'Bob' }),
    ])

    await relink(wrapper, 0, linkOf(SHARE_B))

    expect(mockToastError).toHaveBeenCalledWith(t('battlefield.relinkDuplicate'))
    expect(wrapper.emitted('relinkMember')).toBeUndefined()
  })

  it('連回自己原本那張：視為 no-op，不提示也不 emit', async () => {
    const wrapper = mountDrawer([unavailableMember('m-1', SHARE_A, 'Anna')])

    await relink(wrapper, 0, linkOf(SHARE_A))

    expect(mockToastError).not.toHaveBeenCalled()
    expect(wrapper.emitted('relinkMember')).toBeUndefined()
  })

  it('連結到未被使用的角色卡：正常 emit', async () => {
    const wrapper = mountDrawer([unavailableMember('m-1', SHARE_A, 'Anna')])

    await relink(wrapper, 0, linkOf(SHARE_B))

    expect(mockToastError).not.toHaveBeenCalled()
    expect(wrapper.emitted('relinkMember')?.at(-1)).toEqual(['m-1', SHARE_B])
  })
})

describe('SetupDrawer — 出席成員三態（F1）', () => {
  it('名單為空且載入中：顯示載入狀態，不顯示空狀態', () => {
    const wrapper = mountDrawer([], { membersLoading: true })

    expect(wrapper.find('[role="status"]').text()).toBe(t('ui.state.loading'))
    expect(wrapper.text()).not.toContain(t('battlefield.membersEmpty'))
  })

  it('載入失敗：顯示錯誤與重試鈕，點擊 emit retryMembers；不誤報為空名單', async () => {
    const wrapper = mountDrawer([], { membersError: true })

    expect(wrapper.find('[role="alert"]').text()).toContain(t('battlefield.membersLoadFailed'))
    expect(wrapper.text()).not.toContain(t('battlefield.membersEmpty'))

    await findButtonByText(wrapper, t('ui.state.retry'))[0]!.trigger('click')
    expect(wrapper.emitted('retryMembers')).toHaveLength(1)
  })

  it('名單為空且非載入、無錯誤：顯示空狀態與前往團務紀錄的連結', () => {
    const wrapper = mountDrawer([])

    expect(wrapper.text()).toContain(t('battlefield.membersEmpty'))
    expect(wrapper.find('a').attributes('href')).toBe(SESSION_LOG_TO)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('已有名單時重抓：照常顯示名單，不切成載入狀態', () => {
    const wrapper = mountDrawer([unavailableMember('m-1', SHARE_A, 'Anna')], {
      membersLoading: true,
    })

    expect(wrapper.text()).toContain('Anna')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})
