<template>
  <div>
    <CommonPageHeader :title="log?.title || ''" :show-back="true" :back-to="`/dm/session/${id}`">
      <template v-if="log" #actions>
        <div class="ml-auto flex gap-2">
          <NuxtLink
            :to="`/dm/session/${id}/log/${logId}/update`"
            class="rounded-sm border border-border bg-surface px-4 py-2 text-center text-content transition-colors hover:bg-canvas-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {{ t('ui.action.edit') }}
          </NuxtLink>
          <CommonAppButton variant="danger" @click="confirmOpen = true">
            {{ t('ui.action.delete') }}
          </CommonAppButton>
        </div>
      </template>
    </CommonPageHeader>

    <!-- Loading -->
    <div
      v-if="status === 'idle' || status === 'pending'"
      class="flex min-h-[50dvh] items-center justify-center text-content-muted"
      role="status"
      aria-live="polite"
    >
      {{ t('ui.state.loading') }}
    </div>

    <!-- 真 404：團務不存在（或不屬於此劇本） -->
    <CommonNotFound
      v-else-if="isNotFound"
      :message="t('dmSession.log.notFound')"
      :back-to="`/dm/session/${id}`"
      :back-label="t('dmSession.log.backToContainer')"
    />

    <!-- 暫時性錯誤：可重試 -->
    <div
      v-else-if="isTransientError"
      class="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center"
      role="alert"
    >
      <p class="text-danger">{{ t('dmSession.loadFailed') }}</p>
      <CommonAppButton variant="warning" @click="refresh()">
        {{ t('ui.state.retry') }}
      </CommonAppButton>
    </div>

    <div
      v-else-if="log"
      class="divide-y divide-divider rounded-lg border border-border-soft bg-canvas-elevated p-4 sm:p-6"
    >
      <!-- Meta：日期 + 出席名單 -->
      <div class="space-y-3 pb-4">
        <CommonAppBadge variant="status" bg-color="var(--color-surface-3)">
          <span class="tabular-nums">{{ log.date }}</span>
        </CommonAppBadge>
        <div>
          <p class="mb-2 text-xs text-content-muted">
            {{ t('dmSession.log.formGroup.attendance') }}
          </p>
          <BusinessDmSessionMemberChipList v-if="log.members.length > 0" :members="log.members" />
          <p v-else class="text-xs text-content-faint">{{ t('dmSession.log.noAttendance') }}</p>
        </div>
      </div>

      <!-- 內文 -->
      <div class="py-4">
        <p v-if="log.content" class="text-sm leading-relaxed whitespace-pre-line text-content">
          {{ log.content }}
        </p>
        <p v-else class="text-xs text-content-faint">{{ t('dmSession.log.noContent') }}</p>
      </div>

      <!-- 本場獎勵 -->
      <section :aria-label="t('dmSession.log.formGroup.rewards')" class="pt-4">
        <h3 class="mb-2 font-display text-base font-bold text-content">
          {{ t('dmSession.log.formGroup.rewards') }}
        </h3>

        <p v-if="!hasRewards" class="text-xs text-content-faint">
          {{ t('dmSession.log.rewards.empty') }}
        </p>
        <template v-else>
          <!-- 金錢 / 經驗 pills -->
          <div v-if="moneyParts.length > 0 || log.expRewards !== 0" class="flex flex-wrap gap-1.5">
            <span
              v-for="part in moneyParts"
              :key="part.key"
              class="inline-flex items-center gap-1 rounded-full border border-border-soft bg-surface-2 px-2 py-0.5 text-xs text-content tabular-nums"
            >
              {{ part.value }} {{ part.label }}
            </span>
            <span
              v-if="log.expRewards !== 0"
              class="inline-flex items-center gap-1 rounded-full border border-border-soft bg-surface-2 px-2 py-0.5 text-xs text-content tabular-nums"
            >
              {{ t('dmSession.log.field.exp') }} {{ expDisplay }}
            </span>
          </div>

          <!-- 物品獎勵 -->
          <ul v-if="log.itemRewards.length > 0" role="list" class="mt-3 space-y-2">
            <li
              v-for="reward in log.itemRewards"
              :key="reward.id"
              class="rounded-md border border-border-soft bg-surface px-3 py-2"
            >
              <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p class="min-w-0 flex-1 text-sm whitespace-pre-line text-content">
                  {{ reward.item }}
                </p>
                <CommonAppBadge v-if="reward.player" variant="default">
                  {{ reward.player }}
                </CommonAppBadge>
              </div>
              <p v-if="reward.remark" class="mt-1 text-xs text-content-muted">
                {{ reward.remark }}
              </p>
            </li>
          </ul>
        </template>
      </section>
    </div>

    <!-- 刪除確認 -->
    <Modal
      v-model="confirmOpen"
      :title="t('dmSession.log.deleteLabel')"
      bg-color="var(--color-canvas-elevated)"
      text-color="var(--color-content)"
      border-color="var(--color-border)"
    >
      <p class="text-content">{{ t('dmSession.log.deleteConfirm') }}</p>
      <p v-if="log" class="mt-2 font-bold text-content">{{ log.title }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <CommonAppButton type="button" variant="ghost" @click="confirmOpen = false">
            {{ t('ui.action.cancel') }}
          </CommonAppButton>
          <CommonAppButton
            type="button"
            variant="danger"
            :disabled="deleting"
            @click="onDeleteConfirm"
          >
            {{ t('ui.action.delete') }}
          </CommonAppButton>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from '@ui'

definePageMeta({
  middleware: 'auth',
  noindex: true,
  key: (route) => `${route.params.id}-${route.params.logId}`,
})

const { t } = useI18n()
const route = useRoute()
const id = getRouteParam(route.params.id)
const logId = getRouteParam(route.params.logId)
const apiErrorToast = useApiErrorToast()
const dmSessionStore = useDmSessionStore()

useHead({ title: t('dmSession.log.detailTitle') })

const { status, error, refresh } = useAsyncData(
  () => `dm-session-log-${logId}`,
  () => dmSessionStore.loadLog(id, logId),
  { server: false, lazy: true },
)

const log = computed(() => {
  const cached = dmSessionStore.getLogById(logId)
  return cached && cached.containerId === id ? cached : undefined
})

// 真 404（紀錄不存在 / 不屬於該劇本 / 非擁有者）走 NotFound；其餘暫時性錯誤走可重試三態。
const isNotFound = computed(
  () =>
    (status.value === 'error' && isFetchError(error.value) && error.value.statusCode === 404) ||
    (status.value === 'success' && !log.value),
)
const isTransientError = computed(() => status.value === 'error' && !isNotFound.value)

const buildMoneyParts = useMoneyEarningParts()
const moneyParts = computed(() => (log.value ? buildMoneyParts(log.value.moneyRewards) : []))

// 契約允許負值（他端寫入），前綴依正負決定，避免渲染成 +-500
const expDisplay = computed(() => {
  const exp = log.value?.expRewards ?? 0
  return exp > 0 ? `+${exp}` : `${exp}`
})

const hasRewards = computed(() => {
  const current = log.value
  if (!current) return false
  return moneyParts.value.length > 0 || current.expRewards !== 0 || current.itemRewards.length > 0
})

// ── 刪除 ────────────────────────────────────────────────────────────────────
const confirmOpen = ref(false)
const deleting = ref(false)

const onDeleteConfirm = async (): Promise<void> => {
  if (deleting.value) return
  deleting.value = true
  try {
    await dmSessionStore.removeLog(id, logId)
    confirmOpen.value = false
    await navigateTo(`/dm/session/${id}`)
  } catch (err) {
    apiErrorToast.handle(err)
  } finally {
    deleting.value = false
  }
}
</script>
