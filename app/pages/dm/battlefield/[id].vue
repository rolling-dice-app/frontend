<template>
  <!-- lg 以上進入 dm.vue 提供的固定高度 flex 鏈，欄內各自捲動；行動裝置退回整頁文流 -->
  <div class="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
    <!-- Loading -->
    <div
      v-if="status === 'idle' || status === 'pending'"
      role="status"
      aria-live="polite"
      aria-busy="true"
      class="flex min-h-[50dvh] items-center justify-center"
    >
      <span class="sr-only">{{ t('ui.state.loading') }}</span>
      <div
        class="w-full max-w-3xl animate-pulse space-y-3 motion-reduce:animate-none"
        aria-hidden="true"
      >
        <div class="h-9 w-2/3 rounded bg-surface" />
        <div class="h-40 rounded-xl bg-surface" />
        <div class="h-40 rounded-xl bg-surface" />
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="status === 'error'"
      class="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center text-content-muted"
      role="alert"
    >
      <p class="font-display text-2xl text-content">{{ t('battlefield.loadFailed') }}</p>
      <CommonAppButton variant="warning" class="mt-2" @click="refresh()">
        {{ t('ui.state.retry') }}
      </CommonAppButton>
    </div>

    <!-- 不存在（已刪除或壞連結） -->
    <CommonNotFound v-else-if="!battlefield" back-to="/dm/battlefield" />

    <!-- 工作區 -->
    <template v-else>
      <!-- 頂部工具帶 -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 pb-3 lg:shrink-0">
        <NuxtLink
          to="/dm/battlefield"
          class="flex size-8 shrink-0 items-center justify-center rounded-md text-content-muted hover:bg-surface hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :aria-label="t('battlefield.listTitle')"
        >
          <Icon name="chevron-left" :size="18" />
        </NuxtLink>
        <div class="flex min-w-0 flex-col">
          <span class="truncate font-display text-base font-bold leading-tight">
            {{ sessionOption?.containerTitle ?? t('battlefield.listTitle') }}
          </span>
          <span class="truncate text-xs text-content-muted">
            {{ sessionOption?.sessionTitle }}
          </span>
        </div>
        <div class="ml-auto flex flex-wrap items-center gap-1.5">
          <CommonAppButton type="button" variant="neutral" size="sm" @click="setupOpen = true">
            ＋ {{ t('battlefield.reinforce') }}
          </CommonAppButton>
          <CommonAppButton
            v-if="battlefield.inProgress"
            type="button"
            variant="neutral"
            size="sm"
            @click="endBattleOpen = true"
          >
            {{ t('battlefield.endBattle') }}
          </CommonAppButton>
          <CommonAppButton
            v-else
            type="button"
            variant="primary"
            size="sm"
            @click="onStartNextBattle"
          >
            {{ t('battlefield.startNextBattle', { seq: battlefield.battleSequence + 1 }) }}
          </CommonAppButton>
          <CommonAppButton
            type="button"
            variant="danger"
            outline
            size="sm"
            @click="deleteOpen = true"
          >
            {{ t('battlefield.deleteBattlefield') }}
          </CommonAppButton>
        </div>
      </div>

      <!-- 戰鬥已結束 banner -->
      <div
        v-if="!battlefield.inProgress"
        class="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-ring-soft bg-primary-soft px-4 py-2.5 text-[13px] lg:shrink-0"
      >
        <b class="text-primary-hover">
          {{ t('battlefield.endedBannerTitle', { seq: battlefield.battleSequence }) }}
        </b>
        <span class="text-content-soft">{{ t('battlefield.endedBannerBody') }}</span>
        <CommonAppButton
          type="button"
          variant="primary"
          size="sm"
          class="ml-auto"
          @click="onStartNextBattle"
        >
          {{ t('battlefield.startNextBattle', { seq: battlefield.battleSequence + 1 }) }}
        </CommonAppButton>
      </div>

      <!-- 三欄工作區 -->
      <div
        class="flex flex-col gap-3 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[240px_minmax(320px,1.6fr)_minmax(300px,1.2fr)]"
      >
        <!-- 左欄：戰場單位（可用庫） -->
        <section
          :aria-label="t('battlefield.rosterTitle')"
          class="flex flex-col rounded-xl border border-panel-border bg-panel shadow-elev-1 lg:min-h-0"
        >
          <div class="flex shrink-0 items-center border-b border-panel-border px-3 py-2">
            <h2 class="font-display text-[13px] font-bold tracking-wide text-content-muted">
              {{ t('battlefield.rosterTitle') }}
            </h2>
          </div>
          <div class="scrollbar-hidden lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <BusinessBattlefieldRosterPanel
              :roster-units="rosterUnits"
              :templates="battlefieldStore.templates"
              @enter="onEnterCombat"
              @add-template="onAddTemplate"
              @remove-unit="onRemoveUnit"
            />
          </div>
        </section>

        <!-- 中欄：參戰列表＋回合工具列 -->
        <section
          :aria-label="t('battlefield.combatTitle', { count: combatants.length })"
          class="flex flex-col rounded-xl border border-border-soft bg-surface shadow-elev-1 lg:min-h-0"
        >
          <div class="flex shrink-0 items-center border-b border-border-soft px-3 py-2">
            <h2 class="font-display text-[13px] font-bold tracking-wide text-content-muted">
              {{ t('battlefield.combatTitle', { count: combatants.length }) }}
            </h2>
            <button
              type="button"
              class="ml-auto rounded-md px-2 py-1 text-xs text-danger-hover hover:bg-danger-soft"
              :title="t('battlefield.resetBattleTitle')"
              @click="onResetBattle"
            >
              {{ t('battlefield.resetBattle') }}
            </button>
          </div>
          <div class="shrink-0 border-b border-border-soft px-3 py-2">
            <BusinessBattlefieldCombatToolbar
              :battle-sequence="battlefield.battleSequence"
              :round="battlefield.round"
              :disabled="combatants.length === 0"
              @prev-turn="onStepTurn(-1)"
              @next-turn="onStepTurn(1)"
              @roll-enemies="onRollEnemies"
              @sort-initiative="onSortInitiative"
            />
          </div>
          <div class="scrollbar-hidden lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <BusinessBattlefieldCombatList
              :combatants="combatants"
              :active-unit-id="battlefield.activeUnitId"
              :selected-id="selectedUnit?.id ?? null"
              @select="(unitId) => (selectedId = unitId)"
              @set-initiative="onSetInitiative"
              @move-up="(unitId) => battlefieldStore.moveUnit(battlefieldId, unitId, -1)"
              @move-down="(unitId) => battlefieldStore.moveUnit(battlefieldId, unitId, 1)"
              @reorder="(orderedIds) => battlefieldStore.reorderUnits(battlefieldId, orderedIds)"
            />
          </div>
        </section>

        <!-- 右欄：單位操作面板 -->
        <section
          :aria-label="t('battlefield.detailTitle')"
          class="scrollbar-hidden rounded-xl border border-panel-border bg-panel p-3 shadow-elev-1 lg:min-h-0 lg:overflow-y-auto"
        >
          <BusinessBattlefieldUnitDetailPanel
            v-if="selectedUnit"
            :unit="selectedUnit"
            :is-active="selectedUnit.id === battlefield.activeUnitId"
            @rename="(name) => battlefieldStore.renameUnit(battlefieldId, selectedUnit!.id, name)"
            @set-faction="
              (faction) => battlefieldStore.setFaction(battlefieldId, selectedUnit!.id, faction)
            "
            @set-active="onSetActive(selectedUnit.id)"
            @enter-combat="onEnterCombat(selectedUnit.id)"
            @leave-combat="battlefieldStore.leaveCombat(battlefieldId, selectedUnit.id)"
            @damage="(amount) => onDamage(selectedUnit!.id, amount)"
            @heal="(amount) => battlefieldStore.applyHeal(battlefieldId, selectedUnit!.id, amount)"
            @adjust-temp="
              (delta) => battlefieldStore.adjustTempHp(battlefieldId, selectedUnit!.id, delta)
            "
            @adjust-max="
              (delta) => battlefieldStore.adjustMaxHp(battlefieldId, selectedUnit!.id, delta)
            "
            @adjust-ac="
              (delta) => battlefieldStore.adjustAc(battlefieldId, selectedUnit!.id, delta)
            "
            @adjust-speed="
              (delta) => battlefieldStore.adjustSpeed(battlefieldId, selectedUnit!.id, delta)
            "
            @set-initiative="
              (value) => battlefieldStore.setInitiative(battlefieldId, selectedUnit!.id, value)
            "
            @adjust-initiative="
              (delta) => battlefieldStore.adjustInitiative(battlefieldId, selectedUnit!.id, delta)
            "
            @roll-initiative="onRollInitiative(selectedUnit.id)"
            @add-condition="
              (key, note) =>
                battlefieldStore.addCondition(battlefieldId, selectedUnit!.id, key, note)
            "
            @remove-condition="
              (conditionId) =>
                battlefieldStore.removeCondition(battlefieldId, selectedUnit!.id, conditionId)
            "
          />
          <p v-else class="px-4 py-7 text-center text-[13px] text-content-muted">
            {{ t('battlefield.detailEmpty') }}
          </p>
        </section>
      </div>

      <!-- 增援 drawer -->
      <BusinessBattlefieldSetupDrawer
        v-model:open="setupOpen"
        :members="memberSources"
        :templates="battlefieldStore.templates"
        :units="battlefield.units"
        @import-member="onImportMember"
        @add-template="onAddTemplate"
        @create-adhoc="onCreateAdhoc"
        @enter="onEnterCombat"
        @remove-unit="onRemoveUnit"
      />

      <!-- 結束戰鬥彈窗：逐項保留確認 -->
      <BusinessBattlefieldEndBattleModal
        v-model:open="endBattleOpen"
        :battle-sequence="battlefield.battleSequence"
        @confirm="onEndBattleConfirm"
      />

      <!-- 刪除戰場確認 -->
      <Modal
        v-model="deleteOpen"
        :title="t('battlefield.deleteTitle')"
        bg-color="var(--color-canvas-elevated)"
        text-color="var(--color-content)"
        border-color="var(--color-border)"
      >
        <p class="text-content">{{ t('battlefield.deleteBody') }}</p>
        <template #footer>
          <div class="flex justify-end gap-2">
            <CommonAppButton type="button" variant="ghost" @click="deleteOpen = false">
              {{ t('ui.action.cancel') }}
            </CommonAppButton>
            <CommonAppButton
              type="button"
              variant="danger"
              :disabled="deleting"
              @click="onDeleteConfirm"
            >
              {{ t('battlefield.deleteBattlefield') }}
            </CommonAppButton>
          </div>
        </template>
      </Modal>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Icon, Modal } from '@ui'
import type {
  AdhocUnitInput,
  BattlefieldUnit,
  EndBattleKeepFlags,
} from '~/types/business/battlefield'

definePageMeta({
  middleware: 'auth',
  noindex: true,
  key: (route) => String(route.params.id),
})

const { t } = useI18n()
const toast = useToast()
const route = useRoute()

useHead({ title: t('battlefield.listTitle') })

const battlefieldStore = useBattlefieldStore()
const battlefieldId = getRouteParam(route.params.id)

// server: false：私有資料不進 SSR/edge cache（與 dm 詳情頁同步）。
const { status, refresh } = useAsyncData(
  () => `battlefield-${battlefieldId}`,
  () => battlefieldStore.loadBattlefield(battlefieldId),
  { server: false, lazy: true },
)
// 團務選項供頂部標題顯示（劇本／團務名）
useAsyncData('battlefield-session-options', () => battlefieldStore.loadSessionOptions(), {
  server: false,
  lazy: true,
})

// 工作區直讀 store 反應式狀態（store 刻意不 clone，所有變更必經 action）
const battlefield = computed(() => battlefieldStore.getBattlefieldById(battlefieldId))
const sessionOption = computed(() =>
  battlefieldStore.sessionOptions.find((o) => o.sessionId === battlefield.value?.sessionId),
)
const memberSources = computed(() => battlefieldStore.getMemberSources(battlefieldId))

const combatants = computed<BattlefieldUnit[]>(() =>
  battlefield.value ? combatantsOf(battlefield.value.units) : [],
)
const rosterUnits = computed<BattlefieldUnit[]>(() =>
  battlefield.value ? rosterOf(battlefield.value.units) : [],
)

// ── 右欄選取：手動選取優先；回合推進時清除 → 面板跟隨行動中單位（demo 決議） ──
const selectedId = ref<string | null>(null)

const selectedUnit = computed<BattlefieldUnit | null>(() => {
  const bf = battlefield.value
  if (!bf) return null
  const manual = selectedId.value
    ? combatants.value.find((u) => u.id === selectedId.value)
    : undefined
  if (manual) return manual
  const active = bf.activeUnitId ? bf.units.find((u) => u.id === bf.activeUnitId) : undefined
  return active ?? combatants.value[0] ?? null
})

const unitName = (unitId: string): string =>
  battlefield.value?.units.find((u) => u.id === unitId)?.name ?? ''

// ── 回合 ─────────────────────────────────────────────────────────────────────
const onStepTurn = (dir: 1 | -1): void => {
  const newRound = battlefieldStore.stepTurn(battlefieldId, dir)
  selectedId.value = null
  if (newRound != null) toast.info(t('battlefield.toastRoundStart', { round: newRound }))
}

const onSetActive = (unitId: string): void => {
  battlefieldStore.setActiveUnit(battlefieldId, unitId)
  selectedId.value = null
}

const onRollEnemies = (): void => {
  const count = battlefieldStore.rollAllEnemyInitiatives(battlefieldId)
  if (count === 0) toast.info(t('battlefield.toastNoEnemies'))
  else toast.info(t('battlefield.toastEnemiesRolled', { count }))
}

const onSortInitiative = (): void => {
  battlefieldStore.sortByInitiative(battlefieldId)
  toast.info(t('battlefield.toastSorted'))
}

const onResetBattle = (): void => {
  battlefieldStore.resetBattle(battlefieldId)
  selectedId.value = null
  toast.info(t('battlefield.toastBattleReset'))
}

const onSetInitiative = (unitId: string, value: number | null): void => {
  battlefieldStore.setInitiative(battlefieldId, unitId, value)
}

const onRollInitiative = (unitId: string): void => {
  const unit = battlefield.value?.units.find((u) => u.id === unitId)
  if (!unit) return
  const result = battlefieldStore.rollInitiative(battlefieldId, unitId)
  toast.info(
    t('battlefield.toastInitiativeRolled', {
      name: unit.name,
      total: result.total,
      roll: result.roll,
      bonus: formatModifier(unit.initiativeBonus),
    }),
  )
}

// ── 數值 ─────────────────────────────────────────────────────────────────────
const onDamage = (unitId: string, amount: number): void => {
  const downed = battlefieldStore.applyDamage(battlefieldId, unitId, amount)
  if (downed) toast.info(t('battlefield.toastDown', { name: unitName(unitId) }))
}

// ── 單位進出 ─────────────────────────────────────────────────────────────────
const onEnterCombat = (unitId: string): void => {
  battlefieldStore.enterCombat(battlefieldId, unitId)
  toast.info(t('battlefield.toastJoined', { name: unitName(unitId) }))
}

const onImportMember = (shareId: string): void => {
  const created = battlefieldStore.importMember(battlefieldId, shareId)
  if (created) toast.info(t('battlefield.toastJoined', { name: created.name }))
}

const onAddTemplate = (templateId: string): void => {
  const created = battlefieldStore.addMonsterInstance(battlefieldId, templateId)
  if (created) toast.info(t('battlefield.toastJoined', { name: created.name }))
}

const onCreateAdhoc = (input: AdhocUnitInput, joinCombat: boolean): void => {
  const created = battlefieldStore.createAdhocUnit(battlefieldId, input, joinCombat)
  toast.info(
    t(joinCombat ? 'battlefield.toastJoined' : 'battlefield.toastCreated', {
      name: created.name,
    }),
  )
}

const onRemoveUnit = (unitId: string): void => {
  const name = unitName(unitId)
  battlefieldStore.removeUnit(battlefieldId, unitId)
  if (selectedId.value === unitId) selectedId.value = null
  toast.info(t('battlefield.toastRemoved', { name }))
}

// ── 戰鬥段落 ─────────────────────────────────────────────────────────────────
const setupOpen = ref(false)
const endBattleOpen = ref(false)

const onEndBattleConfirm = (flags: EndBattleKeepFlags): void => {
  const seq = battlefield.value?.battleSequence ?? 1
  battlefieldStore.endBattle(battlefieldId, flags)
  endBattleOpen.value = false
  selectedId.value = null
  toast.info(t('battlefield.toastBattleEnded', { seq }))
}

const onStartNextBattle = (): void => {
  const seq = battlefieldStore.startNextBattle(battlefieldId)
  toast.info(t('battlefield.toastBattleStarted', { seq }))
}

// ── 刪除戰場（hard-delete＝團務結束） ────────────────────────────────────────
const deleteOpen = ref(false)
const deleting = ref(false)

const onDeleteConfirm = async (): Promise<void> => {
  if (deleting.value) return
  deleting.value = true
  try {
    await battlefieldStore.deleteBattlefield(battlefieldId)
    deleteOpen.value = false
    toast.info(t('battlefield.toastDeleted'))
    await navigateTo('/dm/battlefield')
  } finally {
    deleting.value = false
  }
}
</script>
