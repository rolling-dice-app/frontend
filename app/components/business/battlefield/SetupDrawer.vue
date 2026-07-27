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
        <button
          v-for="tab in TABS"
          :key="tab"
          type="button"
          role="tab"
          class="rounded-md px-3 py-1 text-[13px]"
          :class="
            activeTab === tab
              ? 'bg-surface-3 font-semibold text-content'
              : 'text-content-muted hover:text-content'
          "
          :aria-selected="activeTab === tab"
          @click="activeTab = tab"
        >
          {{ t(`battlefield.${TAB_LABEL_KEY[tab]}`) }}
        </button>
      </div>

      <div class="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        <!-- 出席角色：經 shareId 快照帶入（滿 HP）；快照失敗顯示錯誤卡 -->
        <template v-if="activeTab === 'members'">
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
                    @click="emit('removeMember', member.memberId)"
                  >
                    {{ t('battlefield.removeMember') }}
                  </CommonAppButton>
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
                :model-value="adhocName"
                :maxlength="CHARACTER_TEXT_LIMITS.SHORT"
                class="w-full"
                @update:model-value="(value: string) => (adhocName = value)"
              />
            </label>
            <label class="flex flex-col gap-1 text-[11px] text-content-muted">
              {{ t('battlefield.adhocMaxHp') }}
              <CommonAppInput
                :model-value="adhocMaxHp"
                type="number"
                class="w-full"
                @update:model-value="(value: string) => (adhocMaxHp = value)"
              />
            </label>
            <label class="flex flex-col gap-1 text-[11px] text-content-muted">
              {{ t('battlefield.adhocAc') }}
              <CommonAppInput
                :model-value="adhocAc"
                type="number"
                class="w-full"
                @update:model-value="(value: string) => (adhocAc = value)"
              />
            </label>
            <label class="flex flex-col gap-1 text-[11px] text-content-muted">
              {{ t('battlefield.adhocSpeed') }}
              <CommonAppInput
                :model-value="adhocSpeed"
                type="number"
                class="w-full"
                @update:model-value="(value: string) => (adhocSpeed = value)"
              />
            </label>
            <label class="flex flex-col gap-1 text-[11px] text-content-muted">
              {{ t('battlefield.adhocInitBonus') }}
              <CommonAppInput
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
              :disabled="!canCreateAdhoc"
              @click="onCreateAdhoc(true)"
            >
              {{ t('battlefield.createAndJoin') }}
            </CommonAppButton>
          </div>
        </template>

        <!-- 未參戰單位 strip（跨 tab 常駐） -->
        <div v-if="benchUnits.length > 0" class="border-t border-panel-border pt-2.5">
          <h3 class="mb-1.5 text-xs text-content-faint">
            {{ t('battlefield.benchTitle', { count: benchUnits.length }) }}
          </h3>
          <div
            v-for="unit in benchUnits"
            :key="unit.id"
            class="flex items-center gap-2.5 px-1 py-1.5"
          >
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-[13px] font-semibold">{{ unit.name }}</span>
              <span class="text-xs text-content-muted tabular-nums">
                {{
                  t('battlefield.statHpAc', {
                    current: unit.hp.current,
                    max: effectiveMaxHp(unit),
                    ac: effectiveAc(unit),
                  })
                }}
              </span>
            </span>
            <CommonAppButton
              type="button"
              variant="primary"
              size="sm"
              @click="emit('enter', unit.id)"
            >
              {{ t('battlefield.join') }}
            </CommonAppButton>
            <CommonAppButton
              type="button"
              variant="ghost"
              size="sm"
              class="text-danger-hover"
              @click="emit('removeUnit', unit.id)"
            >
              {{ t('battlefield.removeUnit') }}
            </CommonAppButton>
          </div>
        </div>
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
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

const props = defineProps<{
  members: BattlefieldMemberSource[]
  templates: BattlefieldTemplateSource[]
  /** 全部戰場單位：計算成員帶入狀態與未參戰 strip */
  units: BattlefieldUnit[]
}>()

const emit = defineEmits<{
  importMember: [shareId: string]
  addTemplate: [templateId: string]
  createAdhoc: [input: AdhocUnitInput, joinCombat: boolean]
  enter: [unitId: string]
  removeUnit: [unitId: string]
  removeMember: [memberId: string]
  relinkMember: [memberId: string, shareId: string]
}>()

const activeTab = ref<SetupTab>('members')

const memberUnitOf = (shareId: string): BattlefieldUnit | undefined =>
  props.units.find((u) => u.kind === 'character' && u.shareId === shareId)

const benchUnits = computed(() => props.units.filter((u) => !u.inCombat))

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
