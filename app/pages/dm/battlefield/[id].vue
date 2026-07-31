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
          <CommonAppButton
            type="button"
            variant="neutral"
            size="sm"
            data-testid="battlefield-reinforce"
            @click="setupOpen = true"
          >
            ＋ {{ t('battlefield.reinforce') }}
          </CommonAppButton>
          <CommonAppButton
            type="button"
            variant="neutral"
            size="sm"
            data-testid="battlefield-end-battle"
            @click="endBattleOpen = true"
          >
            {{ t('battlefield.endBattle') }}
          </CommonAppButton>
          <CommonAppButton
            type="button"
            variant="danger"
            outline
            size="sm"
            data-testid="battlefield-delete"
            @click="deleteOpen = true"
          >
            {{ t('battlefield.deleteBattlefield') }}
          </CommonAppButton>
        </div>
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
              class="ml-auto rounded-md px-2 py-1 text-xs text-danger-hover hover:bg-danger-soft disabled:opacity-50"
              :title="t('battlefield.resetBattleTitle')"
              :disabled="resetting"
              data-testid="battlefield-reset-battle"
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
          <!-- 戰鬥紀錄：固定高度、內部捲動（D 方案定案） -->
          <div class="h-52 shrink-0 border-t border-border-soft p-2">
            <BusinessDiceRollOutputList
              :entries="rollLogEntries"
              :title="t('battlefield.battleLogTitle')"
              @clear="diceRolls.clearLog()"
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
            @set-death-save-successes="
              (value) =>
                battlefieldStore.setDeathSaveSuccesses(battlefieldId, selectedUnit!.id, value)
            "
            @set-death-save-failures="
              (value) =>
                battlefieldStore.setDeathSaveFailures(battlefieldId, selectedUnit!.id, value)
            "
            @roll-death-save="diceRolls.rollDeathSave(selectedUnit)"
            @roll-attack-hit="
              (attack, mode) => diceRolls.rollAttackHit(selectedUnit!, attack, mode)
            "
            @roll-attack-damage="
              (attack, isCritical) => diceRolls.rollAttackDamage(selectedUnit!, attack, isCritical)
            "
            @roll-skill="(key, mode) => diceRolls.rollSkill(selectedUnit!, key, mode)"
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
        @remove-member="onRemoveMember"
        @relink-member="onRelinkMember"
      />

      <!-- 結束戰鬥彈窗：單純確認 -->
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
              data-testid="battlefield-delete-confirm"
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
import { onBeforeRouteLeave } from 'vue-router'
import { Icon, Modal } from '@ui'
import type { BattlefieldUnit } from '@rolling-dice-app/core'
import type { AdhocUnitInput } from '~/types/business/battlefield'

definePageMeta({
  middleware: 'auth',
  noindex: true,
  key: (route) => String(route.params.id),
})

const { t } = useI18n()
const toast = useToast()
const apiErrorToast = useApiErrorToast()
const route = useRoute()

useHead({ title: t('battlefield.listTitle') })

const battlefieldStore = useBattlefieldStore()
const monsterTemplateStore = useMonsterTemplateStore()
const battlefieldId = getRouteParam(route.params.id)

// server: false：私有資料不進 SSR/edge cache（與 dm 詳情頁同步）。
// 載入成功後並行補子資源（成員快照 hydrate／模板列表）；兩者非致命，失敗只降級抽屜內容。
const { status, refresh } = useAsyncData(
  () => `battlefield-${battlefieldId}`,
  async () => {
    const bf = await battlefieldStore.loadBattlefield(battlefieldId)
    if (bf) {
      void battlefieldStore.loadMemberSources(battlefieldId).catch(() => {})
      void monsterTemplateStore.ensureListLoaded().catch(() => {})
    }
    return bf
  },
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

// ── 擲骰編排（含戰鬥紀錄；log 為 per-call state，換戰場 remount 即重置） ─────
const diceRolls = useBattlefieldDiceRolls(battlefieldId)
const rollLogEntries = diceRolls.entries

// ── 持久化：離頁前 flush pending PATCH；重試後仍失敗（或 409 stale 覆蓋）由此 toast ──
/** 離頁 flush 的等待上限；apiFetch 本身無 timeout，網路卡住時導航會無聲卡死 */
const LEAVE_FLUSH_TIMEOUT_MS = 3000

onBeforeRouteLeave(async () => {
  // 逾時不取消 flush：它會在背景跑完，只是不再擋著導航
  await withTimeout(battlefieldStore.flushPersist(battlefieldId), LEAVE_FLUSH_TIMEOUT_MS)
})

// 分頁隱藏／關閉／重新整理不會跑離頁 hook，於此盡力刷出未存變更（best-effort：
// 頁面被瞬殺時仍可能來不及，要真正保證需 API 層支援 keepalive）。
const onVisibilityChange = (): void => {
  if (document.visibilityState === 'hidden') void battlefieldStore.flushPersist(battlefieldId)
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

watch(
  () => battlefieldStore.persistErrorOf(battlefieldId),
  (err) => {
    if (err == null) return
    // 帶重試入口且不自動關閉
    apiErrorToast.handle(err, {
      duration: 0,
      action: {
        label: t('battlefield.persistRetry'),
        onClick: () => {
          void battlefieldStore.retryPersist(battlefieldId)
        },
      },
    })
  },
)

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
  const results = diceRolls.rollEnemiesInitiative()
  if (results.length === 0) toast.info(t('battlefield.toastNoEnemies'))
  else toast.info(t('battlefield.toastEnemiesRolled', { count: results.length }))
}

const onSortInitiative = (): void => {
  battlefieldStore.sortByInitiative(battlefieldId)
  toast.info(t('battlefield.toastSorted'))
}

const resetting = ref(false)

const onResetBattle = async (): Promise<void> => {
  if (resetting.value) return
  resetting.value = true
  try {
    await battlefieldStore.resetBattle(battlefieldId)
    selectedId.value = null
    toast.info(t('battlefield.toastBattleReset'))
  } catch (err) {
    apiErrorToast.handle(err)
  } finally {
    resetting.value = false
  }
}

const onSetInitiative = (unitId: string, value: number | null): void => {
  battlefieldStore.setInitiative(battlefieldId, unitId, value)
}

const onRollInitiative = (unitId: string): void => {
  const unit = battlefield.value?.units.find((u) => u.id === unitId)
  if (!unit) return
  const result = diceRolls.rollUnitInitiative(unit)
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
  const result = battlefieldStore.importMember(battlefieldId, shareId)
  if (result.ok) {
    toast.info(t('battlefield.toastJoined', { name: result.unit.name }))
    return
  }
  if (result.reason === 'cap') toast.error(t('battlefield.unitCapReached'))
  else toast.error(t('battlefield.memberImportUnavailable'))
}

const onAddTemplate = async (templateId: string): Promise<void> => {
  const result = await battlefieldStore.addMonsterInstance(battlefieldId, templateId)
  if (result.ok) {
    toast.info(t('battlefield.toastJoined', { name: result.unit.name }))
    return
  }
  if (result.reason === 'cap') toast.error(t('battlefield.unitCapReached'))
  else apiErrorToast.handle(result.error)
}

const onCreateAdhoc = (input: AdhocUnitInput, joinCombat: boolean): void => {
  const created = battlefieldStore.createAdhocUnit(battlefieldId, input, joinCombat)
  if (!created) {
    toast.error(t('battlefield.unitCapReached'))
    return
  }
  toast.info(
    t(joinCombat ? 'battlefield.toastJoined' : 'battlefield.toastCreated', {
      name: created.name,
    }),
  )
}

// ── 成員名單修復（走 m7.2 團務 log PATCH；成功後 store 會重跑 hydrate） ──────
const onRemoveMember = async (memberId: string): Promise<void> => {
  try {
    await battlefieldStore.removeSessionMember(battlefieldId, memberId)
    toast.info(t('battlefield.toastMemberRemoved'))
  } catch (err) {
    apiErrorToast.handle(err)
  }
}

const onRelinkMember = async (memberId: string, shareId: string): Promise<void> => {
  try {
    await battlefieldStore.relinkSessionMember(battlefieldId, memberId, shareId)
    toast.info(t('battlefield.toastMemberRelinked'))
  } catch (err) {
    apiErrorToast.handle(err)
  }
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

const onEndBattleConfirm = (): void => {
  const ended = battlefield.value?.battleSequence ?? 1
  const next = battlefieldStore.endBattle(battlefieldId)
  endBattleOpen.value = false
  selectedId.value = null
  toast.info(t('battlefield.toastBattleEnded', { ended, next }))
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
  } catch (err) {
    apiErrorToast.handle(err)
  } finally {
    deleting.value = false
  }
}
</script>
