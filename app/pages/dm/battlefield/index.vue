<template>
  <div>
    <CommonPageHeader :title="t('battlefield.listTitle')" :show-back="true" back-to="/" />

    <!-- Loading：鏡像團務卡的骨架 -->
    <div
      v-if="status === 'idle' || status === 'pending'"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span class="sr-only">{{ t('ui.state.loading') }}</span>
      <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="i in 4"
          :key="i"
          class="animate-pulse rounded-lg border border-border-soft bg-canvas-elevated p-4 motion-reduce:animate-none"
          aria-hidden="true"
        >
          <div class="h-4 w-1/3 rounded bg-surface" />
          <div class="mt-2 h-6 w-2/3 rounded bg-surface" />
          <div class="mt-3 border-t border-divider pt-2.5">
            <div class="h-8 w-24 rounded bg-surface" />
          </div>
        </div>
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

    <!-- 空狀態：戰場依附團務，先去團務紀錄建資料 -->
    <div
      v-else-if="options.length === 0"
      class="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center"
    >
      <h2 class="font-display text-4xl font-bold text-content sm:text-6xl">
        {{ t('battlefield.empty') }}
      </h2>
      <p class="font-display text-lg text-content-muted">{{ t('battlefield.emptyHint') }}</p>
      <NuxtLink
        to="/dm/session"
        class="mt-3 text-sm text-primary-hover underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {{ t('dm.nav.campaignRecord') }}
      </NuxtLink>
    </div>

    <!-- 團務選擇列表 -->
    <div v-else>
      <p class="mb-4 text-sm text-content-muted">{{ t('battlefield.listHint') }}</p>
      <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="option in options"
          :key="option.sessionId"
          class="flex flex-col rounded-lg border border-l-4 border-border-soft border-l-panel-3 bg-canvas-elevated p-4 shadow-elev-1 transition-colors duration-150 hover:bg-surface"
        >
          <p class="truncate text-xs text-content-muted">{{ option.containerTitle }}</p>
          <p class="mt-1 truncate font-display text-lg font-bold text-content">
            {{ option.sessionTitle }}
          </p>
          <p class="mt-1 flex items-center gap-2 text-xs text-content-muted tabular-nums">
            {{ option.date }}
            <span>{{ t('battlefield.memberCount', { count: option.memberCount }) }}</span>
          </p>
          <div class="mt-3 flex items-center gap-2 border-t border-divider pt-2.5">
            <template v-if="option.battlefieldId">
              <span
                class="whitespace-nowrap rounded-full border border-ring-soft px-2 py-px text-[11px] font-semibold text-primary-hover"
              >
                {{ t('battlefield.hasBattlefield') }}
              </span>
              <CommonAppButton
                type="button"
                variant="primary"
                size="sm"
                class="ml-auto"
                @click="navigateTo(`/dm/battlefield/${option.battlefieldId}`)"
              >
                {{ t('battlefield.enterBattlefield') }}
              </CommonAppButton>
            </template>
            <template v-else>
              <span v-if="containerHasBattlefield(option)" class="text-[11px] text-content-muted">{{
                t('battlefield.createDisabledHint')
              }}</span>
              <CommonAppButton
                type="button"
                variant="secondary"
                size="sm"
                class="ml-auto"
                :disabled="creating || containerHasBattlefield(option)"
                @click="onCreate(option)"
              >
                {{ t('battlefield.createBattlefield') }}
              </CommonAppButton>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BattlefieldSessionOption } from '@rolling-dice-app/core'

definePageMeta({ middleware: 'auth', noindex: true })

const { t } = useI18n()
const apiErrorToast = useApiErrorToast()

useHead({ title: t('battlefield.listTitle') })

const battlefieldStore = useBattlefieldStore()

// server: false：SSR 階段不拉使用者資料，避免 edge cache 共享私有列表（與 dm 各列表同步）。
const { status, refresh } = useAsyncData(
  'battlefield-session-options',
  () => battlefieldStore.loadSessionOptions(),
  { server: false, lazy: true },
)

const options = computed<BattlefieldSessionOption[]>(() => battlefieldStore.sessionOptions)

// 一劇本（container）同時至多一戰場：同 containerId 已有戰場者停用建立（前端預擋雙 UNIQUE）
const containerHasBattlefield = (option: BattlefieldSessionOption): boolean =>
  options.value.some((o) => o.containerId === option.containerId && o.battlefieldId != null)

const creating = ref(false)

const onCreate = async (option: BattlefieldSessionOption): Promise<void> => {
  if (creating.value) return
  creating.value = true
  try {
    const created = await battlefieldStore.createBattlefield(option.sessionId)
    await navigateTo(`/dm/battlefield/${created.id}`)
  } catch (err) {
    apiErrorToast.handle(err)
    // 競態兜底（他端剛建立）：重抓選項讓卡片切到「進入戰場」
    if (apiErrorCodeOf(err) === 'BATTLEFIELD_ALREADY_EXISTS') void refresh()
  } finally {
    creating.value = false
  }
}
</script>
