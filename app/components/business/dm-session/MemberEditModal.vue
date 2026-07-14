<template>
  <Modal
    :model-value="open"
    :title="t('dmSession.container.editMembers')"
    size="md"
    :close-on-click-outside="false"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
    @update:model-value="(value: boolean) => emit('update:open', value)"
  >
    <div class="space-y-3">
      <p class="text-xs text-content-muted">
        {{ t('dmSession.container.field.members') }}
        <span class="ml-1 tabular-nums">{{ draft.length }}/{{ max }}</span>
      </p>

      <ul v-if="draft.length > 0" role="list" class="space-y-2">
        <li
          v-for="member in draft"
          :key="member.id"
          class="rounded-md border border-border-soft bg-surface p-3"
        >
          <div class="flex items-center gap-2">
            <!-- 已連結成員的玩家名稱以 PL 帳號暱稱 snapshot 為準，唯讀；未連結才可手填 -->
            <CommonAppInput
              :model-value="member.playerName"
              size="sm"
              outline
              :readonly="member.character !== null"
              :title="member.character ? t('dmSession.member.playerNameLinkedHint') : undefined"
              :maxlength="CHARACTER_TEXT_LIMITS.SHORT"
              :placeholder="t('dmSession.member.playerName')"
              :aria-label="t('dmSession.member.playerName')"
              class="w-full flex-1"
              @update:model-value="(value: string) => (member.playerName = value)"
            />
            <CommonAppInput
              :model-value="characterNameOf(member)"
              size="sm"
              outline
              readonly
              :placeholder="t('dmSession.member.characterName')"
              :aria-label="t('dmSession.member.characterName')"
              class="w-full flex-1"
            />
            <button
              type="button"
              :aria-label="`${t('ui.action.delete')} ${member.playerName}`"
              class="flex size-8 shrink-0 items-center justify-center rounded-md text-content-faint transition-colors duration-150 hover:text-danger-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @click="onRemoveRow(member.id)"
            >
              <Icon name="trash" :size="14" />
            </button>
          </div>

          <!-- 連結 input 是綁定狀態的單一來源：清空 commit = 解除連結、貼新連結 commit = 更換角色 -->
          <div class="mt-2">
            <CommonAppInput
              :model-value="linkInputs[member.id] ?? ''"
              size="sm"
              outline
              :placeholder="t('dmSession.member.linkPlaceholder')"
              :aria-label="t('dmSession.member.characterLink')"
              class="w-full"
              @update:model-value="(value: string) => onLinkInput(member, value)"
              @blur="onLinkCommit(member)"
              @keydown.enter.prevent="onLinkCommit(member)"
            >
              <template #suffix>
                <span
                  v-if="linkIndicator(member) === 'resolving'"
                  aria-hidden="true"
                  class="size-3.5 animate-spin motion-reduce:animate-none rounded-full border-2 border-border border-t-primary"
                />
                <Icon
                  v-else-if="linkIndicator(member) === 'error'"
                  name="alert-circle"
                  :size="14"
                  class="text-danger"
                />
                <Icon
                  v-else-if="linkIndicator(member) === 'linked'"
                  name="check-circle"
                  :size="14"
                  class="text-success"
                />
              </template>
            </CommonAppInput>
            <p
              role="status"
              class="mt-1 flex items-center gap-1 text-xs"
              :class="linkHint(member.id)?.tone === 'muted' ? 'text-content-muted' : 'text-danger'"
            >
              {{ linkHint(member.id)?.text }}
              <button
                v-if="linkHint(member.id)?.retry"
                type="button"
                :aria-label="t('ui.state.retry')"
                class="flex size-4 shrink-0 items-center justify-center hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                @click="onLinkCommit(member)"
              >
                <Icon name="restore" :size="12" />
              </button>
            </p>
          </div>
        </li>
      </ul>

      <button
        type="button"
        :disabled="atMax"
        class="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-content-muted transition-colors duration-150 hover:bg-surface hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        @click="onAddRow"
      >
        <Icon name="plus" :size="16" />
        {{ t('dmSession.member.add') }}
      </button>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <CommonAppButton type="button" variant="ghost" @click="emit('update:open', false)">
          {{ t('ui.action.cancel') }}
        </CommonAppButton>
        <CommonAppButton
          type="button"
          variant="primary"
          :disabled="anyResolving"
          @click="onConfirm"
        >
          {{ t('ui.action.confirm') }}
        </CommonAppButton>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { toRaw } from 'vue'
import { Icon, Modal } from '@ui'
import { CHARACTER_TEXT_LIMITS, VALIDATION_LIMITS } from '@rolling-dice-app/core'
import type { DmSessionMemberDTO } from '@rolling-dice-app/core'
import { parseShareIdFromLink } from '~/helpers/share'

const { t } = useI18n()
const apiErrorToast = useApiErrorToast()

const props = defineProps<{
  open: boolean
  members: DmSessionMemberDTO[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [members: DmSessionMemberDTO[]]
}>()

const max = VALIDATION_LIMITS.maxMembersPerDmSessionContainer

/** 單列連結解析狀態；resolving 時的 shareId 兼作 request token，過期回應直接丟棄 */
type LinkRowState =
  | { status: 'resolving'; shareId: string }
  | { status: 'invalid' }
  | { status: 'duplicate' }
  | { status: 'error'; kind: 'notFound' | 'unavailable' | 'request' }

const draft = ref<DmSessionMemberDTO[]>([])
/** 各列的分享連結輸入值，key 為成員列 id；此欄位是綁定狀態的單一來源 */
const linkInputs = ref<Record<string, string>>({})
/** 各列的解析狀態，key 為成員列 id；無 entry 表示 idle */
const linkStates = ref<Record<string, LinkRowState>>({})

// baseURL 結尾帶 '/'，故 share 段不另加前導 '/'
const baseURL = useRuntimeConfig().app.baseURL
const shareLinkOf = (shareId: string): string =>
  `${window.location.origin}${baseURL}share/${shareId}`

watch(
  () => props.open,
  (next) => {
    if (!next) return
    draft.value = structuredClone(toRaw(props.members))
    // 開窗時以最新 hydrate 值刷新已連結成員的玩家名稱（snapshot 自癒）；
    // 失效連結（available: false）hydrate 全 null，保留舊 snapshot 不覆寫
    for (const member of draft.value) {
      if (member.character?.available && member.character.ownerDisplayName) {
        member.playerName = member.character.ownerDisplayName
      }
    }
    linkInputs.value = Object.fromEntries(
      draft.value.flatMap((m) => (m.character ? [[m.id, shareLinkOf(m.character.shareId)]] : [])),
    )
    linkStates.value = {}
  },
  { immediate: true },
)

const atMax = computed(() => draft.value.length >= max)

const onAddRow = (): void => {
  if (atMax.value) return
  draft.value.push({ id: crypto.randomUUID(), playerName: '', character: null })
}

const onRemoveRow = (id: string): void => {
  draft.value = draft.value.filter((m) => m.id !== id)
}

const anyResolving = computed(() =>
  Object.values(linkStates.value).some((state) => state.status === 'resolving'),
)

const clearLinkState = (id: string): void => {
  const { [id]: _removed, ...rest } = linkStates.value
  linkStates.value = rest
}

/** 該列是否仍在等這個 shareId 的回應（token 檢查） */
const isCurrentRequest = (id: string, shareId: string): boolean => {
  const state = linkStates.value[id]
  return state?.status === 'resolving' && state.shareId === shareId
}

/** 輸入變動只更新值並清掉該列狀態；in-flight 回應會因 token 不符被丟棄 */
const onLinkInput = (member: DmSessionMemberDTO, value: string): void => {
  linkInputs.value[member.id] = value
  clearLinkState(member.id)
}

/** blur / Enter 才觸發；空輸入解除連結、同 shareId no-op、新 shareId 解析（成功即更換） */
const onLinkCommit = (member: DmSessionMemberDTO): void => {
  const input = (linkInputs.value[member.id] ?? '').trim()
  if (input === '') {
    if (member.character) {
      member.character = null
      clearLinkState(member.id)
    }
    return
  }
  const shareId = parseShareIdFromLink(input)
  if (!shareId) {
    linkStates.value[member.id] = { status: 'invalid' }
    return
  }
  if (shareId === member.character?.shareId) {
    clearLinkState(member.id)
    return
  }
  if (isCurrentRequest(member.id, shareId)) return
  if (draft.value.some((m) => m.id !== member.id && m.character?.shareId === shareId)) {
    linkStates.value[member.id] = { status: 'duplicate' }
    return
  }
  // 解析啟動即清空原綁定（角色名稱欄同步清空），成功才寫入新角色
  member.character = null
  void resolveRow(member.id, shareId)
}

const resolveRow = async (id: string, shareId: string): Promise<void> => {
  linkStates.value[id] = { status: 'resolving', shareId }
  try {
    const { previews } = await share().resolveSharedCharacters([shareId])
    if (!isCurrentRequest(id, shareId)) return
    const member = draft.value.find((m) => m.id === id)
    if (!member) {
      clearLinkState(id)
      return
    }
    if (draft.value.some((m) => m.id !== id && m.character?.shareId === shareId)) {
      linkStates.value[id] = { status: 'duplicate' }
      return
    }
    const preview = previews[0]
    if (!preview) {
      linkStates.value[id] = { status: 'error', kind: 'notFound' }
      return
    }
    if (!preview.available) {
      linkStates.value[id] = { status: 'error', kind: 'unavailable' }
      return
    }
    member.character = preview
    // 連結成功即 snapshot PL 暱稱為玩家名稱（唯讀）；暱稱缺漏時保留原值
    if (preview.ownerDisplayName) member.playerName = preview.ownerDisplayName
    clearLinkState(id)
  } catch (err) {
    if (!isCurrentRequest(id, shareId)) return
    linkStates.value[id] = { status: 'error', kind: 'request' }
    apiErrorToast.handle(err)
  }
}

/** 連結 input 尾端狀態指示：解析中 / 錯誤 / 已連結；已綁定但失效的角色視為錯誤 */
const linkIndicator = (member: DmSessionMemberDTO): 'resolving' | 'error' | 'linked' | null => {
  const state = linkStates.value[member.id]
  if (state) return state.status === 'resolving' ? 'resolving' : 'error'
  if (!member.character) return null
  return member.character.available ? 'linked' : 'error'
}

/** 角色名稱唯讀欄顯示值；未連結為空字串 */
const characterNameOf = (member: DmSessionMemberDTO): string => {
  if (!member.character) return ''
  if (!member.character.available) return t('dmSession.member.unavailable')
  return member.character.name ?? member.character.shareId
}

const ERROR_HINT_KEY = {
  notFound: 'dmSession.member.resolveFailed',
  unavailable: 'dmSession.member.unavailable',
  request: 'dmSession.member.resolveError',
} as const

/** 依該列狀態產生 inline 提示；null 表示無提示 */
const linkHint = (
  id: string,
): { text: string; tone: 'muted' | 'danger'; retry: boolean } | null => {
  const state = linkStates.value[id]
  if (!state) return null
  switch (state.status) {
    case 'resolving':
      return { text: t('dmSession.member.resolving'), tone: 'muted', retry: false }
    case 'invalid':
      return { text: t('dmSession.member.invalidLink'), tone: 'danger', retry: false }
    case 'duplicate':
      return { text: t('dmSession.member.duplicate'), tone: 'danger', retry: false }
    case 'error':
      return { text: t(ERROR_HINT_KEY[state.kind]), tone: 'danger', retry: true }
  }
}

/** 名字修剪後為空且未連結角色的列視為未填，確認時丟棄 */
const onConfirm = (): void => {
  if (anyResolving.value) return
  const cleaned = draft.value
    .map((m) => ({ ...m, playerName: m.playerName.trim() }))
    .filter((m) => m.playerName !== '' || m.character !== null)
  emit('confirm', cleaned)
  emit('update:open', false)
}
</script>
