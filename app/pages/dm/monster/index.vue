<template>
  <div>
    <CommonPageHeader :title="t('monster.listTitle')" :show-back="true" back-to="/" />

    <!-- 空狀態 -->
    <button
      v-if="monsters.length === 0"
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
          <CommonAppButton type="button" variant="danger" @click="onDeleteConfirm">
            {{ t('ui.action.delete') }}
          </CommonAppButton>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { Icon, Modal } from '@ui'
import {
  monsterTemplates,
  monsterTemplatesAtLimit,
  removeMonsterTemplate,
} from '~/mocks/monster-templates'
import type { MonsterTemplateView } from '~/types/business/monster'

definePageMeta({ middleware: 'auth', noindex: true })

const { t } = useI18n()
const toast = useToast()

useHead({ title: t('monster.listTitle') })

// 本階段直接消費 mock reactive 清單；串接階段改 monster-template store。
const monsters = monsterTemplates

// ── 建立 ────────────────────────────────────────────────────────────────────
const onAdd = (): void => {
  if (monsterTemplatesAtLimit.value) {
    toast.error(t('monster.limitReached'))
    return
  }
  void navigateTo('/dm/monster/create')
}

// ── 刪除 ────────────────────────────────────────────────────────────────────
const pendingDelete = ref<MonsterTemplateView | null>(null)
const confirmOpen = ref(false)

const onDeleteRequest = (monster: MonsterTemplateView): void => {
  pendingDelete.value = monster
  confirmOpen.value = true
}

const onDeleteCancel = (): void => {
  confirmOpen.value = false
  pendingDelete.value = null
}

const onDeleteConfirm = (): void => {
  if (!pendingDelete.value) return
  removeMonsterTemplate(pendingDelete.value.id)
  confirmOpen.value = false
  pendingDelete.value = null
}
</script>
