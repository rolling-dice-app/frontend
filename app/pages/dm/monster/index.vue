<template>
  <div>
    <CommonPageHeader :title="t('monster.listTitle')" :show-back="true" back-to="/" />

    <!-- Loading -->
    <div
      v-if="status === 'idle' || status === 'pending'"
      class="flex min-h-[50dvh] items-center justify-center text-content-muted"
      role="status"
      aria-live="polite"
    >
      {{ t('ui.state.loading') }}
    </div>

    <!-- Error -->
    <div
      v-else-if="status === 'error'"
      class="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center text-content-muted"
      role="alert"
    >
      <p class="font-display text-2xl text-content">{{ t('monster.loadFailed') }}</p>
      <CommonAppButton variant="warning" class="mt-2" @click="refresh()">
        {{ t('ui.state.retry') }}
      </CommonAppButton>
    </div>

    <!-- 空狀態 -->
    <button
      v-else-if="monsters.length === 0"
      type="button"
      class="group relative flex min-h-[50dvh] w-full cursor-pointer select-none flex-col items-center justify-center overflow-hidden rounded-lg border border-border text-center transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      :aria-label="t('monster.addMonster')"
      @click="onAdd"
    >
      <div
        class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,134,14,0.07),transparent_70%)]"
        aria-hidden="true"
      />
      <div class="relative z-10 flex flex-col items-center px-6 py-12">
        <Icon name="dice" :size="64" class="text-content-faint" />
        <h2 class="mt-6 font-display text-4xl font-bold text-content sm:text-5xl">
          {{ t('monster.empty') }}
        </h2>
        <p class="mt-3 font-display text-lg text-content-muted">{{ t('monster.emptyHint') }}</p>
        <span class="mt-6 inline-block text-primary" aria-hidden="true">
          <Icon name="plus" :size="36" />
        </span>
      </div>
    </button>

    <!-- 列表 grid -->
    <div v-else class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      <div
        v-for="monster in monsters"
        :key="monster.id"
        class="group relative flex flex-col rounded-lg border border-border-soft bg-canvas-elevated shadow-elev-1 transition-colors duration-150 hover:bg-surface"
      >
        <NuxtLink
          :to="`/dm/monster/${monster.id}`"
          class="flex flex-1 flex-col gap-2 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p class="truncate font-display text-lg font-bold text-content">{{ monster.name }}</p>
          <div class="flex flex-wrap items-center gap-1.5">
            <CommonAppBadge v-if="monster.size" variant="default">
              {{ t(`character.size.${monster.size}`) }}
            </CommonAppBadge>
            <CommonAppBadge
              v-if="monster.challengeRating"
              variant="status"
              bg-color="var(--color-surface-3)"
            >
              CR {{ monster.challengeRating }}
            </CommonAppBadge>
          </div>
          <div class="mt-1 flex gap-4 text-xs text-content-muted">
            <span
              >{{ t('monster.field.ac') }}
              <span class="font-bold text-content tabular-nums">{{ monster.ac }}</span></span
            >
            <span
              >{{ t('monster.field.hp') }}
              <span class="font-bold text-content tabular-nums">{{ monster.hp }}</span></span
            >
          </div>
        </NuxtLink>
        <button
          type="button"
          :aria-label="`${t('ui.action.delete')} ${monster.name}`"
          class="absolute right-2 top-2 flex size-8 items-center justify-center rounded-md text-content-faint opacity-100 transition-colors duration-150 hover:text-danger-hover focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          @click="onDeleteRequest(monster)"
        >
          <Icon name="trash" :size="16" />
        </button>
      </div>

      <!-- 新增 tile -->
      <button
        type="button"
        class="flex min-h-32 cursor-pointer items-center justify-center rounded-lg border border-border bg-canvas-elevated text-content-muted transition-colors duration-200 hover:bg-surface hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        :aria-label="t('monster.addMonster')"
        @click="onAdd"
      >
        <Icon name="plus" :size="40" />
      </button>
    </div>

    <!-- 刪除確認 -->
    <Modal
      v-model="confirmOpen"
      :title="t('monster.deleteLabel')"
      bg-color="var(--color-canvas-elevated)"
      text-color="var(--color-content)"
      border-color="var(--color-border)"
    >
      <p class="text-content">{{ t('monster.deleteConfirm') }}</p>
      <p v-if="pendingDelete" class="mt-2 font-bold text-content">{{ pendingDelete.name }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <CommonAppButton type="button" variant="ghost" @click="onDeleteCancel">
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
import { Icon, Modal } from '@ui'
import type { MonsterTemplateSummaryDTO } from '@rolling-dice-app/core'

definePageMeta({ middleware: 'auth', noindex: true })

const { t } = useI18n()
const toast = useToast()
const apiErrorToast = useApiErrorToast()

useHead({ title: t('monster.listTitle') })

const monsterTemplateStore = useMonsterTemplateStore()

// server: false：SSR 階段不拉使用者資料，避免 Vercel edge cache 把
// 某使用者的怪物列表共享給其他人（與 character 列表同步）。
const { status, refresh } = useAsyncData(
  'monster-templates',
  () => monsterTemplateStore.loadList(),
  { server: false, lazy: true },
)

const monsters = computed<MonsterTemplateSummaryDTO[]>(() => monsterTemplateStore.list)

// ── 建立 ────────────────────────────────────────────────────────────────────
// 達上限時列表入口前置攔截；create 頁另有 monster-template-limit guard，判斷統一由 store 提供。
const onAdd = (): void => {
  if (monsterTemplateStore.isAtMonsterTemplateLimit) {
    toast.error(t('monster.limitReached'))
    return
  }
  void navigateTo('/dm/monster/create')
}

// ── 刪除 ────────────────────────────────────────────────────────────────────
const pendingDelete = ref<MonsterTemplateSummaryDTO | null>(null)
const confirmOpen = ref(false)
const deleting = ref(false)

const onDeleteRequest = (monster: MonsterTemplateSummaryDTO): void => {
  pendingDelete.value = monster
  confirmOpen.value = true
}

const onDeleteCancel = (): void => {
  confirmOpen.value = false
  pendingDelete.value = null
}

const onDeleteConfirm = async (): Promise<void> => {
  if (!pendingDelete.value || deleting.value) return
  deleting.value = true
  try {
    await monsterTemplateStore.removeMonsterTemplate(pendingDelete.value.id)
    confirmOpen.value = false
    pendingDelete.value = null
  } catch (err) {
    apiErrorToast.handle(err)
  } finally {
    deleting.value = false
  }
}
</script>
