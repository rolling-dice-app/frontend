<template>
  <Drawer
    v-model="open"
    placement="right"
    size="lg"
    :title="t('battlefield.setupTitle')"
    bg-color="var(--color-panel)"
    text-color="var(--color-content)"
    border-color="var(--color-panel-border)"
  >
    <div class="flex h-full min-h-0 flex-col gap-3">
      <div
        class="inline-flex w-fit shrink-0 gap-0.5 rounded-lg border border-panel-border bg-canvas-inset p-0.5"
        role="tablist"
        :aria-label="t('battlefield.setupTitle')"
      >
        <!-- roving tabindex：整組頁籤只佔一個 Tab 停留點，左右鍵在頁籤間移動（WAI-ARIA tabs pattern） -->
        <button
          v-for="tab in TABS"
          :id="tabId(tab)"
          :key="tab"
          :ref="(el) => setTabEl(tab, el)"
          type="button"
          role="tab"
          :data-tab="tab"
          :aria-controls="panelId(tab)"
          :aria-selected="activeTab === tab"
          :tabindex="activeTab === tab ? 0 : -1"
          class="rounded-md px-3 py-1 text-[13px]"
          :class="
            activeTab === tab
              ? 'bg-surface-3 font-semibold text-content'
              : 'text-content-muted hover:text-content'
          "
          @click="activeTab = tab"
          @keydown.left.prevent="moveTabFocus(-1)"
          @keydown.right.prevent="moveTabFocus(1)"
          @keydown.home.prevent="focusTab(TABS[0]!)"
          @keydown.end.prevent="focusTab(TABS[TABS.length - 1]!)"
        >
          {{ t(`battlefield.${TAB_LABEL_KEY[tab]}`) }}
        </button>
      </div>

      <div
        :id="panelId(activeTab)"
        role="tabpanel"
        :aria-labelledby="tabId(activeTab)"
        tabindex="0"
        class="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1"
      >
        <!-- 出席角色：經 shareId 快照帶入（滿 HP）；快照失敗顯示錯誤卡 -->
        <template v-if="activeTab === 'members'">
          <!-- hydrate 失敗：名單可能是空的或舊的，兩者都要給重試入口 -->
          <div
            v-if="membersError"
            role="alert"
            class="flex items-center justify-between gap-2 rounded-lg border border-danger bg-danger-soft px-3 py-2"
          >
            <span class="text-sm text-danger-hover">{{ t('battlefield.membersLoadFailed') }}</span>
            <CommonAppButton
              type="button"
              variant="warning"
              size="sm"
              @click="emit('retryMembers')"
            >
              {{ t('ui.state.retry') }}
            </CommonAppButton>
          </div>
          <!-- 名單為空時才分辨載入中／真的沒有；已有名單時重抓不閃爍 -->
          <template v-if="members.length === 0">
            <p
              v-if="membersLoading"
              role="status"
              aria-live="polite"
              class="py-6 text-center text-sm text-content-muted"
            >
              {{ t('ui.state.loading') }}
            </p>
            <p v-else-if="!membersError" class="py-6 text-center text-sm text-content-muted">
              {{ t('battlefield.membersEmpty') }}
              <NuxtLink
                :to="sessionLogTo"
                class="ml-1 text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {{ t('battlefield.membersEmptyLink') }}
              </NuxtLink>
            </p>
          </template>
          <div
            v-for="member in members"
            :key="member.shareId"
            class="flex items-center gap-2.5 rounded-lg border px-3 py-2"
            :class="
              member.available ? 'border-panel-border bg-panel-2' : 'border-danger bg-danger-soft'
            "
          >
            <template v-if="member.available">
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="truncate text-sm font-semibold">
                  {{ member.name }}
                  <span class="text-xs font-normal text-content-muted">{{
                    formatCharacterTitle(member.race, member.classes, classLabelOf)
                  }}</span>
                </span>
                <span class="text-xs text-content-muted tabular-nums">
                  {{
                    t('battlefield.statMember', {
                      ac: member.ac,
                      hp: member.maxHp,
                      speed: member.speed,
                      bonus: formatModifier(member.totalInitiative),
                    })
                  }}
                </span>
              </span>
              <span
                v-if="memberUnitOf(member.shareId)"
                class="whitespace-nowrap rounded-full border border-border-soft bg-canvas-inset px-2 py-px text-[11px] text-content-muted"
              >
                {{
                  memberUnitOf(member.shareId)?.inCombat
                    ? t('battlefield.alreadyJoined')
                    : t('battlefield.alreadyImported')
                }}
              </span>
              <CommonAppButton
                v-else
                type="button"
                variant="primary"
                size="sm"
                data-testid="battlefield-import-member"
                :aria-label="`${t('battlefield.importMember')} ${member.name}`"
                @click="emit('importMember', member.shareId)"
              >
                {{ t('battlefield.importMember') }}
              </CommonAppButton>
            </template>
            <template v-else>
              <span class="flex min-w-0 flex-1 flex-col gap-1">
                <span class="truncate text-sm font-semibold text-danger-hover">
                  {{ member.playerName }}
                  <span class="text-xs font-normal text-content-muted">
                    {{ t('battlefield.memberRole') }}
                  </span>
                </span>
                <span class="text-xs text-content-muted">
                  {{ t('battlefield.memberUnavailable') }}
                </span>
                <span class="flex flex-wrap gap-1.5">
                  <CommonAppButton
                    type="button"
                    variant="neutral"
                    size="sm"
                    @click="toggleRelink(member.memberId)"
                  >
                    {{ t('battlefield.relinkMember') }}
                  </CommonAppButton>
                </span>
                <span
                  v-if="relinkTargetId === member.memberId"
                  class="flex flex-wrap items-center gap-1.5"
                >
                  <CommonAppInput
                    :model-value="relinkLink"
                    class="min-w-0 flex-1"
                    :placeholder="t('battlefield.relinkPlaceholder')"
                    :aria-label="t('battlefield.relinkPlaceholder')"
                    @update:model-value="(value: string) => (relinkLink = value)"
                    @keydown.enter="onConfirmRelink(member.memberId)"
                  />
                  <CommonAppButton
                    type="button"
                    variant="primary"
                    size="sm"
                    :disabled="relinkLink.trim() === ''"
                    @click="onConfirmRelink(member.memberId)"
                  >
                    {{ t('battlefield.relinkConfirm') }}
                  </CommonAppButton>
                </span>
              </span>
            </template>
          </div>
        </template>

        <!-- 怪物模板：一鍵建實例並參戰 -->
        <template v-else-if="activeTab === 'templates'">
          <div
            v-for="template in templates"
            :key="template.id"
            class="flex items-center gap-2.5 rounded-lg border border-panel-border bg-panel-2 px-3 py-2"
          >
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-sm font-semibold">
                {{ template.name }}
                <span
                  v-if="template.challengeRating != null"
                  class="text-xs font-normal text-content-muted tabular-nums"
                >
                  CR {{ template.challengeRating }}
                </span>
              </span>
              <span class="text-xs text-content-muted tabular-nums">
                {{ t('battlefield.statTemplate', { ac: template.ac, hp: template.hp }) }}
              </span>
            </span>
            <CommonAppButton
              type="button"
              variant="primary"
              size="sm"
              data-testid="battlefield-add-template"
              :aria-label="`${t('battlefield.join')} ${template.name}`"
              :title="t('battlefield.joinTemplateTitle')"
              @click="emit('addTemplate', template.id)"
            >
              {{ t('battlefield.join') }}
            </CommonAppButton>
          </div>
        </template>

        <!-- 其他單位：手動臨時單位（名稱／最大 HP 必填） -->
        <template v-else>
          <div class="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
            <label class="col-span-full flex flex-col gap-1 text-[11px] text-content-muted">
              {{ t('battlefield.adhocName') }} <span class="sr-only">*</span>
              <CommonAppInput
                id="battlefield-adhoc-name"
                :model-value="adhocName"
                :maxlength="CHARACTER_TEXT_LIMITS.SHORT"
                class="w-full"
                @update:model-value="(value: string) => (adhocName = value)"
              />
            </label>
            <label class="flex flex-col gap-1 text-[11px] text-content-muted">
              {{ t('battlefield.adhocMaxHp') }}
              <CommonAppInput
                id="battlefield-adhoc-max-hp"
                :model-value="adhocMaxHp"
                type="number"
                class="w-full"
                @update:model-value="(value: string) => (adhocMaxHp = value)"
              />
            </label>
            <label class="flex flex-col gap-1 text-[11px] text-content-muted">
              {{ t('battlefield.adhocAc') }}
              <CommonAppInput
                id="battlefield-adhoc-ac"
                :model-value="adhocAc"
                type="number"
                class="w-full"
                @update:model-value="(value: string) => (adhocAc = value)"
              />
            </label>
            <label class="flex flex-col gap-1 text-[11px] text-content-muted">
              {{ t('battlefield.adhocSpeed') }}
              <CommonAppInput
                id="battlefield-adhoc-speed"
                :model-value="adhocSpeed"
                type="number"
                class="w-full"
                @update:model-value="(value: string) => (adhocSpeed = value)"
              />
            </label>
            <label class="flex flex-col gap-1 text-[11px] text-content-muted">
              {{ t('battlefield.adhocInitBonus') }}
              <CommonAppInput
                id="battlefield-adhoc-init-bonus"
                :model-value="adhocInitBonus"
                type="number"
                class="w-full"
                @update:model-value="(value: string) => (adhocInitBonus = value)"
              />
            </label>
          </div>
          <div class="flex justify-end gap-2">
            <CommonAppButton
              type="button"
              variant="neutral"
              size="sm"
              :disabled="!canCreateAdhoc"
              @click="onCreateAdhoc(false)"
            >
              {{ t('battlefield.createUnit') }}
            </CommonAppButton>
            <CommonAppButton
              type="button"
              variant="primary"
              size="sm"
              data-testid="battlefield-create-adhoc-join"
              :disabled="!canCreateAdhoc"
              @click="onCreateAdhoc(true)"
            >
              {{ t('battlefield.createAndJoin') }}
            </CommonAppButton>
          </div>
        </template>
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { Drawer } from '@ui'
import { CHARACTER_TEXT_LIMITS } from '@rolling-dice-app/core'
import type { BattlefieldUnit, ClassKey } from '@rolling-dice-app/core'
import type {
  AdhocUnitInput,
  BattlefieldMemberSource,
  BattlefieldTemplateSource,
} from '~/types/business/battlefield'

type SetupTab = 'members' | 'templates' | 'adhoc'

const TABS: readonly SetupTab[] = ['members', 'templates', 'adhoc']
const TAB_LABEL_KEY = {
  members: 'groupCharacters',
  templates: 'groupTemplates',
  adhoc: 'groupOthers',
} as const

const { t } = useI18n()
const toast = useToast()

const classLabelOf = (key: ClassKey) => t(`class.label.${key}`)

const open = defineModel<boolean>('open', { required: true })

const props = withDefaults(
  defineProps<{
    members: BattlefieldMemberSource[]
    templates: BattlefieldTemplateSource[]
    /** 全部戰場單位：計算成員帶入狀態 */
    units: BattlefieldUnit[]
    /** 出席成員 hydrate 進行中 */
    membersLoading?: boolean
    /** 出席成員 hydrate 失敗（例如團務紀錄 GET 掛掉） */
    membersError?: boolean
    /** 這場團務紀錄的頁面路徑：名單為空時引導 DM 去加人 */
    sessionLogTo: string
  }>(),
  { membersLoading: false, membersError: false },
)

const emit = defineEmits<{
  importMember: [shareId: string]
  addTemplate: [templateId: string]
  createAdhoc: [input: AdhocUnitInput, joinCombat: boolean]
  relinkMember: [memberId: string, shareId: string]
  recheckMember: [memberId: string]
  retryMembers: []
}>()

const activeTab = ref<SetupTab>('members')

// tab ↔ tabpanel 的 id 對應（aria-controls / aria-labelledby 兩邊互指）
const tabId = (tab: SetupTab): string => `battlefield-setup-tab-${tab}`
const panelId = (tab: SetupTab): string => `battlefield-setup-panel-${tab}`

const tabEls = new Map<SetupTab, HTMLElement>()
const setTabEl = (tab: SetupTab, el: Element | ComponentPublicInstance | null): void => {
  if (el instanceof HTMLElement) tabEls.set(tab, el)
  else tabEls.delete(tab)
}

const focusTab = (tab: SetupTab): void => {
  activeTab.value = tab
  tabEls.get(tab)?.focus()
}

/** 左右鍵在頁籤間循環移動，並同步切換面板（tabs pattern 的 automatic activation） */
const moveTabFocus = (dir: 1 | -1): void => {
  const index = TABS.indexOf(activeTab.value)
  const next = TABS[(index + dir + TABS.length) % TABS.length]
  if (next) focusTab(next)
}

const memberUnitOf = (shareId: string): BattlefieldUnit | undefined =>
  props.units.find((u) => u.kind === 'character' && u.shareId === shareId)

// ── 重新連結（貼分享連結 → 解析 shareId 後交頁面送 log PATCH） ───────────────
const relinkTargetId = ref<string | null>(null)
const relinkLink = ref('')

const toggleRelink = (memberId: string): void => {
  relinkTargetId.value = relinkTargetId.value === memberId ? null : memberId
  relinkLink.value = ''
}

const onConfirmRelink = (memberId: string): void => {
  const shareId = parseShareIdFromLink(relinkLink.value)
  if (!shareId) {
    toast.error(t('battlefield.relinkInvalidLink'))
    return
  }
  const target = props.members.find((m) => m.memberId === memberId)
  // 連回原本那張：log 上的 shareId 不變，不打 PATCH；改交頁面重抓，確認擁有者是否已恢復分享
  if (target?.shareId === shareId) {
    emit('recheckMember', memberId)
    relinkTargetId.value = null
    relinkLink.value = ''
    return
  }
  // 後端只驗 member id 唯一，shareId 重複會被接受；名單以 shareId 作 v-for key，重複即撞 key
  if (props.members.some((m) => m.memberId !== memberId && m.shareId === shareId)) {
    toast.error(t('battlefield.relinkDuplicate'))
    return
  }
  emit('relinkMember', memberId, shareId)
  relinkTargetId.value = null
  relinkLink.value = ''
}

// ── 手動臨時單位表單 ─────────────────────────────────────────────────────────
const adhocName = ref('')
const adhocMaxHp = ref('10')
const adhocAc = ref('10')
const adhocSpeed = ref('30')
const adhocInitBonus = ref('0')

const canCreateAdhoc = computed(
  () => adhocName.value.trim() !== '' && parseIntegerInput(adhocMaxHp.value, 0) > 0,
)

const onCreateAdhoc = (joinCombat: boolean): void => {
  if (!canCreateAdhoc.value) return
  emit(
    'createAdhoc',
    {
      name: adhocName.value,
      maxHp: parseIntegerInput(adhocMaxHp.value, 10),
      ac: parseIntegerInput(adhocAc.value, 10),
      speed: parseIntegerInput(adhocSpeed.value, 30),
      initiativeBonus: parseIntegerInput(adhocInitBonus.value, 0),
    },
    joinCombat,
  )
  adhocName.value = ''
  adhocMaxHp.value = '10'
  adhocAc.value = '10'
  adhocSpeed.value = '30'
  adhocInitBonus.value = '0'
}
</script>
