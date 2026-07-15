<template>
  <div>
    <CommonPageHeader :title="pageTitle" :show-back="true" :back-to="backTo">
      <template #actions>
        <CommonAppButton
          variant="primary"
          :disabled="!canSubmit"
          :loading="submitting"
          class="ml-auto min-w-22 whitespace-nowrap"
          @click="onSave"
        >
          {{ t('ui.action.save') }}
        </CommonAppButton>
      </template>
    </CommonPageHeader>

    <div
      class="divide-y divide-divider rounded-lg border border-border-soft bg-canvas-elevated p-4 sm:p-6"
    >
      <!-- 基本資料 -->
      <div class="py-6 first:pt-0 last:pb-0">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div class="flex-1">
            <label for="dm-session-log-title" class="mb-1 block text-xs text-content">
              {{ t('dmSession.log.field.title') }}
              <span class="text-danger">*</span>
            </label>
            <CommonAppInput
              id="dm-session-log-title"
              :model-value="formState.title"
              size="sm"
              outline
              :maxlength="CHARACTER_TEXT_LIMITS.SHORT"
              class="w-full"
              @update:model-value="(value: string) => (formState.title = value)"
            />
          </div>
          <div>
            <label for="dm-session-log-date" class="mb-1 block text-xs text-content">
              {{ t('dmSession.log.field.date') }}
              <span class="text-danger">*</span>
            </label>
            <div class="dm-date-picker relative z-10 w-63">
              <DatePicker
                id="dm-session-log-date"
                v-model="dateModel"
                mode="single"
                size="sm"
                :clearable="false"
                :teleport="false"
                border-color="var(--color-primary)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 內文 -->
      <div class="py-6 first:pt-0 last:pb-0">
        <label for="dm-session-log-content" class="mb-1 block text-xs text-content">
          {{ t('dmSession.log.field.content') }}
        </label>
        <div class="rounded-md border border-primary bg-canvas-inset">
          <TextArea
            id="dm-session-log-content"
            class="w-full"
            :border="false"
            :model-value="formState.content"
            :rows="8"
            max-height="24rem"
            :maxlength="CHARACTER_TEXT_LIMITS.HUGE"
            show-count
            :placeholder="t('dmSession.log.contentPlaceholder')"
            @update:model-value="(value: string) => (formState.content = value)"
          />
        </div>
      </div>

      <!-- 出席名單 -->
      <div class="py-6 first:pt-0 last:pb-0">
        <p class="text-xs text-content">
          {{ t('dmSession.log.formGroup.attendance') }}
          <span class="ml-1 text-content-muted tabular-nums">
            {{ formState.members.length }}/{{ maxAttendance }}
          </span>
        </p>

        <!-- 常駐名單 toggle chips：預設全員出席，點擊反選缺席者 -->
        <ul
          v-if="containerMembers.length > 0"
          role="list"
          class="mt-2 flex flex-wrap items-center gap-1.5"
        >
          <li v-for="member in containerMembers" :key="member.id">
            <button
              type="button"
              :aria-pressed="isAttending(member.id)"
              :disabled="!isAttending(member.id) && atAttendanceMax"
              class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              :class="
                isAttending(member.id)
                  ? 'border-primary bg-primary-soft text-content'
                  : 'border-border-soft bg-surface text-content-muted hover:text-content'
              "
              @click="onToggleRoster(member)"
            >
              <span class="max-w-32 truncate font-medium">{{ member.playerName }}</span>
              <span
                v-if="member.character?.available && member.character.name"
                class="max-w-24 truncate text-content-muted"
              >
                · {{ member.character.name }}
              </span>
            </button>
          </li>

          <!-- 名單外的臨時出席 chip -->
          <li v-for="member in adhocMembers" :key="member.id">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary-soft px-2.5 py-1 text-xs text-content"
            >
              <span class="max-w-32 truncate font-medium">{{ member.playerName }}</span>
              <span
                v-if="member.character?.available && member.character.name"
                class="max-w-24 truncate text-content-muted"
              >
                · {{ member.character.name }}
              </span>
              <button
                type="button"
                :aria-label="`${t('dmSession.log.attendance.remove')} ${member.playerName}`"
                class="flex size-4 items-center justify-center rounded-full text-content-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                @click="onRemoveMember(member.id)"
              >
                <Icon name="close" :size="10" />
              </button>
            </span>
          </li>
        </ul>

        <template v-else>
          <p class="mt-2 text-xs text-content-faint">
            {{ t('dmSession.log.attendance.rosterEmptyHint') }}
          </p>
          <ul v-if="adhocMembers.length > 0" role="list" class="mt-2 flex flex-wrap gap-1.5">
            <li v-for="member in adhocMembers" :key="member.id">
              <span
                class="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary-soft px-2.5 py-1 text-xs text-content"
              >
                <span class="max-w-32 truncate font-medium">{{ member.playerName }}</span>
                <span
                  v-if="member.character?.available && member.character.name"
                  class="max-w-24 truncate text-content-muted"
                >
                  · {{ member.character.name }}
                </span>
                <button
                  type="button"
                  :aria-label="`${t('dmSession.log.attendance.remove')} ${member.playerName}`"
                  class="flex size-4 items-center justify-center rounded-full text-content-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  @click="onRemoveMember(member.id)"
                >
                  <Icon name="close" :size="10" />
                </button>
              </span>
            </li>
          </ul>
        </template>

        <!-- 臨時出席：分享連結優先（成功即連結角色卡），非連結視為純文字玩家名 -->
        <div class="mt-3 flex items-end gap-2">
          <div class="flex-1">
            <label for="dm-session-log-adhoc" class="mb-1 block text-xs text-content-muted">
              {{ t('dmSession.log.attendance.adhocLabel') }}
            </label>
            <CommonAppInput
              id="dm-session-log-adhoc"
              :model-value="adhocInput"
              size="sm"
              outline
              :maxlength="CHARACTER_TEXT_LIMITS.SHORT"
              :placeholder="t('dmSession.log.attendance.adhocPlaceholder')"
              :disabled="atAttendanceMax"
              class="w-full"
              @update:model-value="onAdhocInput"
              @keydown.enter.prevent="onAddAdhoc"
            >
              <template #suffix>
                <span
                  v-if="adhocState?.status === 'resolving'"
                  aria-hidden="true"
                  class="size-3.5 animate-spin motion-reduce:animate-none rounded-full border-2 border-border border-t-primary"
                />
                <Icon v-else-if="adhocState" name="alert-circle" :size="14" class="text-danger" />
              </template>
            </CommonAppInput>
          </div>
          <!-- !min-h-8 蓋掉元件的觸控目標下限，與 sm 輸入框等高（表單列內按鈕，比照 TeammateInput 允許 32px） -->
          <CommonAppButton
            type="button"
            variant="primary"
            outline
            size="sm"
            class="h-8 min-h-8!"
            :disabled="atAttendanceMax || adhocResolving || !adhocInput.trim()"
            @click="onAddAdhoc"
          >
            {{ t('dmSession.log.attendance.adhocAdd') }}
          </CommonAppButton>
        </div>
        <p
          role="status"
          class="mt-1 flex items-center gap-1 text-xs"
          :class="adhocHint?.tone === 'muted' ? 'text-content-muted' : 'text-danger'"
        >
          {{ adhocHint?.text }}
          <button
            v-if="adhocHint?.retry"
            type="button"
            :aria-label="t('ui.state.retry')"
            class="flex size-4 shrink-0 items-center justify-center hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="onAddAdhoc"
          >
            <Icon name="restore" :size="12" />
          </button>
        </p>
      </div>

      <!-- 本場獎勵 -->
      <div class="py-6 first:pt-0 last:pb-0">
        <p class="mb-3 text-sm text-content">{{ t('dmSession.log.formGroup.rewards') }}</p>
        <div class="space-y-4">
          <div class="grid grid-cols-4 gap-2">
            <div v-for="key in COIN_KEYS" :key="key">
              <label
                :for="`dm-session-log-money-${key}`"
                class="mb-1 block text-xs text-content-muted"
              >
                {{ currencyLabels[key] }}
              </label>
              <CommonAppInput
                :id="`dm-session-log-money-${key}`"
                type="number"
                min="0"
                step="1"
                size="sm"
                outline
                :model-value="String(formState.moneyRewards[key])"
                class="w-full"
                @update:model-value="
                  (value: string) => (formState.moneyRewards[key] = sanitizeNumber(value))
                "
              />
            </div>
          </div>

          <div class="w-32">
            <label for="dm-session-log-exp" class="mb-1 block text-xs text-content-muted">
              {{ t('dmSession.log.field.exp') }}
            </label>
            <CommonAppInput
              id="dm-session-log-exp"
              type="number"
              min="0"
              step="1"
              size="sm"
              outline
              :model-value="String(formState.expRewards)"
              class="w-full"
              @update:model-value="
                (value: string) => (formState.expRewards = sanitizeNumber(value))
              "
            />
          </div>

          <BusinessDmSessionLogRewardItemList
            v-model:rewards="formState.itemRewards"
            :player-options="attendancePlayerNames"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRaw } from 'vue'
import { DatePicker, Icon, TextArea } from '@ui'
import {
  CHARACTER_INT_LIMITS,
  CHARACTER_TEXT_LIMITS,
  VALIDATION_LIMITS,
} from '@rolling-dice-app/core'
import type { CurrencyKey, DmSessionMemberDTO } from '@rolling-dice-app/core'
import type { DmSessionLogDraft } from '~/types/business/dm-session'
import { parseShareIdFromLink } from '~/helpers/share'

const props = withDefaults(
  defineProps<{
    log: DmSessionLogDraft
    /** 劇本常駐名單，供出席 toggle chips */
    containerMembers: DmSessionMemberDTO[]
    mode?: 'create' | 'edit'
    backTo?: string
    /** 父頁送出中：儲存鈕轉 loading */
    submitting?: boolean
  }>(),
  { mode: 'edit', backTo: undefined, submitting: false },
)

const emit = defineEmits<{ save: [value: DmSessionLogDraft] }>()

const { t } = useI18n()
const apiErrorToast = useApiErrorToast()

const COIN_KEYS: readonly CurrencyKey[] = ['pp', 'gp', 'sp', 'cp']
const maxAttendance = VALIDATION_LIMITS.maxMembersPerDmSessionLog

// 從草稿深拷一份本地 form state；提交時回拋給頁面，由頁面呼叫 store。
const formState = reactive<DmSessionLogDraft>(structuredClone(toRaw(props.log)))

const currencyLabels = computed<Record<CurrencyKey, string>>(() => ({
  cp: t('inventory.cpName'),
  sp: t('inventory.spName'),
  gp: t('inventory.gpName'),
  pp: t('inventory.ppName'),
}))

const pageTitle = computed(
  () =>
    formState.title.trim() ||
    (props.mode === 'create' ? t('dmSession.log.createTitle') : t('dmSession.log.editTitle')),
)

const canSubmit = computed(
  () => formState.title.trim().length > 0 && formState.date !== '' && !adhocResolving.value,
)

// ── 日期（契約為 YYYY-MM-DD 字串，DatePicker 吃 Date；以本地時區互轉避免日期偏移） ──
const parseDateString = (value: string): Date | null => {
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

const formatDateString = (value: Date): string => {
  const yyyy = value.getFullYear()
  const mm = String(value.getMonth() + 1).padStart(2, '0')
  const dd = String(value.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const dateModel = computed<Date | null>({
  get: () => parseDateString(formState.date),
  set: (next) => {
    formState.date = next instanceof Date ? formatDateString(next) : ''
  },
})

const sanitizeNumber = (value: string): number =>
  Math.max(0, parseIntegerInput(value, 0, CHARACTER_INT_LIMITS.LARGE_INT_MAX))

// ── 出席名單 ────────────────────────────────────────────────────────────────
const atAttendanceMax = computed(() => formState.members.length >= maxAttendance)

const isAttending = (memberId: string): boolean => formState.members.some((m) => m.id === memberId)

/** 不在常駐名單內的出席者（臨時出席、或編輯舊紀錄時名單已變動的成員） */
const adhocMembers = computed(() =>
  formState.members.filter((m) => !props.containerMembers.some((r) => r.id === m.id)),
)

const onToggleRoster = (member: DmSessionMemberDTO): void => {
  if (isAttending(member.id)) {
    onRemoveMember(member.id)
    return
  }
  if (atAttendanceMax.value) return
  formState.members.push(structuredClone(toRaw(member)))
}

const onRemoveMember = (memberId: string): void => {
  formState.members = formState.members.filter((m) => m.id !== memberId)
}

const attendancePlayerNames = computed(() => formState.members.map((m) => m.playerName))

// ── 臨時出席：分享連結優先，非連結視為純文字玩家名 ──────────────────────────
/** 連結解析狀態；resolving 時的 shareId 兼作 request token，過期回應直接丟棄。null 表示 idle */
type AdhocResolveState =
  | { status: 'resolving'; shareId: string }
  | { status: 'duplicate' }
  | { status: 'error'; kind: 'notFound' | 'unavailable' | 'request' }

const adhocInput = ref('')
const adhocState = ref<AdhocResolveState | null>(null)

const adhocResolving = computed(() => adhocState.value?.status === 'resolving')

/** 輸入變動只更新值並清掉狀態；in-flight 回應會因 token 不符被丟棄 */
const onAdhocInput = (value: string): void => {
  adhocInput.value = value
  adhocState.value = null
}

const isCurrentAdhocRequest = (shareId: string): boolean =>
  adhocState.value?.status === 'resolving' && adhocState.value.shareId === shareId

const hasAttendingShareId = (shareId: string): boolean =>
  formState.members.some((m) => m.character?.shareId === shareId)

const onAddAdhoc = (): void => {
  const input = adhocInput.value.trim()
  if (!input || atAttendanceMax.value || adhocResolving.value) return
  const shareId = parseShareIdFromLink(input)
  if (!shareId) {
    formState.members.push({ id: crypto.randomUUID(), playerName: input, character: null })
    adhocInput.value = ''
    adhocState.value = null
    return
  }
  if (hasAttendingShareId(shareId)) {
    adhocState.value = { status: 'duplicate' }
    return
  }
  // 連結對應常駐成員 → 直接標記出席，不產生重複的臨時 chip
  const rosterMember = props.containerMembers.find((m) => m.character?.shareId === shareId)
  if (rosterMember) {
    onToggleRoster(rosterMember)
    adhocInput.value = ''
    adhocState.value = null
    return
  }
  void resolveAdhoc(shareId)
}

const resolveAdhoc = async (shareId: string): Promise<void> => {
  adhocState.value = { status: 'resolving', shareId }
  try {
    const { previews } = await share().resolveSharedCharacters([shareId])
    if (!isCurrentAdhocRequest(shareId)) return
    // 等待期間名單可能已變動，重驗重複與上限
    if (hasAttendingShareId(shareId)) {
      adhocState.value = { status: 'duplicate' }
      return
    }
    if (atAttendanceMax.value) {
      adhocState.value = null
      return
    }
    const preview = previews[0]
    if (!preview) {
      adhocState.value = { status: 'error', kind: 'notFound' }
      return
    }
    if (!preview.available) {
      adhocState.value = { status: 'error', kind: 'unavailable' }
      return
    }
    formState.members.push({
      id: crypto.randomUUID(),
      // 連結成功即 snapshot PL 暱稱為玩家名稱；available 時實務必非空，後備鏈僅防禦
      playerName: preview.ownerDisplayName ?? preview.name ?? shareId,
      character: preview,
    })
    adhocInput.value = ''
    adhocState.value = null
  } catch (err) {
    if (!isCurrentAdhocRequest(shareId)) return
    adhocState.value = { status: 'error', kind: 'request' }
    apiErrorToast.handle(err)
  }
}

const ADHOC_ERROR_HINT_KEY = {
  notFound: 'dmSession.member.resolveFailed',
  unavailable: 'dmSession.member.unavailable',
  request: 'dmSession.member.resolveError',
} as const

/** 依解析狀態產生 inline 提示；null 表示無提示 */
const adhocHint = computed(
  (): { text: string; tone: 'muted' | 'danger'; retry: boolean } | null => {
    const state = adhocState.value
    if (!state) return null
    switch (state.status) {
      case 'resolving':
        return { text: t('dmSession.member.resolving'), tone: 'muted', retry: false }
      case 'duplicate':
        return { text: t('dmSession.member.duplicate'), tone: 'danger', retry: false }
      case 'error':
        return { text: t(ADHOC_ERROR_HINT_KEY[state.kind]), tone: 'danger', retry: true }
    }
  },
)

// ── 提交 ────────────────────────────────────────────────────────────────────
/** 物品內容為空的獎勵列視為未填，儲存時丟棄 */
const onSave = (): void => {
  if (!canSubmit.value || props.submitting) return
  // members / itemRewards 會被 filter 整列重建，重建後元素是 reactive proxy，
  // 整包 structuredClone(toRaw(formState)) 會 DataCloneError；須逐元素 toRaw 再 clone
  const next: DmSessionLogDraft = {
    title: formState.title.trim(),
    date: formState.date,
    content: formState.content,
    members: formState.members.map((m) => structuredClone(toRaw(m))),
    moneyRewards: { ...formState.moneyRewards },
    expRewards: formState.expRewards,
    itemRewards: formState.itemRewards
      .filter((r) => r.item.trim() !== '')
      .map((r) => structuredClone(toRaw(r))),
  }
  emit('save', next)
}
</script>

<style scoped>
/* @ui DatePicker 內部吃 --rui-* token（預設亮色），區域覆寫成專案暗色金主題
   （比照 AppSelect / character index 的區域覆寫慣例） */
.dm-date-picker {
  --rui-color-surface-raised: var(--color-canvas-elevated);
  --rui-color-surface: var(--color-surface);
  --rui-color-surface-hover: var(--color-surface-2);
  --rui-color-text-primary: var(--color-content);
  --rui-color-text-secondary: var(--color-content-soft);
  --rui-color-text-muted: var(--color-content-muted);
  --rui-color-border: var(--color-border);
  --rui-color-default: var(--color-primary);
  --rui-color-default-foreground: var(--color-content-inverse);
}
/* trigger 本身無背景，補上與其他輸入框一致的內凹底色 */
.dm-date-picker :deep([role='combobox']) {
  background: var(--color-canvas-inset);
}
/* teleport 關閉時 popover 為 absolute 無寬度，shrink-to-fit 以包裝層為上限；
   包裝層 w-63 已等於日曆天然寬度，此處保底讓日曆寬度永不受箝制擠壓 */
.dm-date-picker :deep([role='dialog']) {
  width: max-content;
}
</style>
