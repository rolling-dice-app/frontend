<template>
  <section aria-labelledby="campaigns-tab-label" class="p-4 space-y-4 bg-canvas-elevated">
    <div
      v-if="isLoading && !isReady"
      class="flex min-h-[40dvh] items-center justify-center text-content-muted"
      role="status"
      aria-live="polite"
    >
      {{ t('ui.state.loading') }}
    </div>

    <div
      v-else-if="loadError && !isReady"
      class="flex flex-col items-center gap-3 py-12 text-center"
    >
      <p class="text-danger">{{ t('ui.state.loadFailed') }}</p>
      <CommonAppButton variant="warning" @click="$emit('retry')">
        {{ t('ui.state.retry') }}
      </CommonAppButton>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg py-3">
        <div class="flex items-center gap-3">
          <h2 id="campaigns-tab-label" class="font-display text-lg font-bold text-content">
            {{ t('character.campaignRecord') }}
          </h2>
          <span class="text-xs text-content-muted">
            {{ entries.length }} {{ t('character.campaignCount') }}
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <div class="text-xs text-content-muted">
            {{ t('character.expEarnedTotal') }}
            <span class="ml-1 font-medium text-content">{{ totalExpEarned }}</span>
          </div>
          <label class="flex items-center gap-2 text-xs text-content">
            <Toggle
              :model-value="applyMoneyToCurrency"
              :aria-label="t('character.syncMoneyAria')"
              color="var(--color-primary)"
              @update:model-value="onToggleApplyMoney"
            />
            <span>{{ t('character.syncMoneyToggle') }}</span>
          </label>
        </div>
      </div>

      <button
        type="button"
        :aria-label="t('character.addCampaignRecord')"
        class="flex w-full items-center justify-center rounded-lg border border-dashed border-border-soft bg-canvas-elevated py-3 text-content-muted transition-colors duration-150 hover:bg-surface hover:text-content"
        @click="openCreate"
      >
        <span class="text-lg leading-none">+</span>
      </button>

      <p
        v-if="entries.length === 0"
        class="rounded-lg border border-dashed border-border-soft bg-surface-2 px-3 py-8 text-center text-xs text-content-muted"
      >
        {{ t('character.emptyCampaignMessage') }}
      </p>

      <Accordion v-else class="campaigns-accordion flex flex-col gap-2">
        <BusinessCharacterDetailCampaignsCampaignItem
          v-for="entry in entries"
          :key="entry.id"
          :entry="entry"
          @edit="openEdit"
          @remove="$emit('remove', $event)"
        />
      </Accordion>

      <BusinessCharacterDetailCampaignsCampaignFormModal
        v-model="modalOpen"
        :editing="editing"
        :submitting="submitting"
        @save="onSave"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import { Accordion, Toggle } from '@ui'
import { VALIDATION_LIMITS } from '@rolling-dice-app/core'
import type { CampaignDraft, CampaignEntry } from '~/types/business/campaign'

const { t } = useI18n()
const toast = useToast()
const apiErrorToast = useApiErrorToast()
const authStore = useAuthStore()

const props = defineProps<{
  entries: CampaignEntry[]
  totalExpEarned: number
  isLoading: boolean
  loadError: unknown
  isReady: boolean
  conflictSignal: number
  addCampaign: (draft: CampaignDraft) => Promise<boolean>
  updateCampaign: (id: string, draft: CampaignDraft) => Promise<boolean>
}>()

defineEmits<{
  remove: [id: string]
  retry: []
}>()

const applyMoneyToCurrency = computed(() => authStore.user?.preference.applyMoneyToCurrency ?? true)

// plan-aware：以 backend /auth/me 回的 limits 為主；
// 未登入或 limits 尚未就緒時 fallback 到 VALIDATION_LIMITS（DB-blast ceiling）。
const campaignRecordLimit = computed(
  () =>
    authStore.limits?.maxCampaignRecordsPerCharacter ??
    VALIDATION_LIMITS.maxCampaignRecordsPerCharacter,
)

const onToggleApplyMoney = async (next: boolean): Promise<void> => {
  try {
    await authStore.updatePreference({ applyMoneyToCurrency: next })
  } catch (err) {
    // store 未更新 → Toggle 自然 rerender 回原值，視覺自動 rollback
    apiErrorToast.handle(err)
  }
}

const modalOpen = ref(false)
const editing = ref<CampaignEntry | null>(null)
const submitting = ref(false)

const openCreate = (): void => {
  if (props.entries.length >= campaignRecordLimit.value) {
    toast.info(t('character.campaignRecordLimitReached'), { kind: 'hint' })
    return
  }
  editing.value = null
  modalOpen.value = true
}

const openEdit = (entry: CampaignEntry): void => {
  editing.value = entry
  modalOpen.value = true
}

const onSave = async (draft: CampaignDraft, editingId: string | null): Promise<void> => {
  if (submitting.value) return
  submitting.value = true
  try {
    const ok = editingId
      ? await props.updateCampaign(editingId, draft)
      : await props.addCampaign(draft)
    if (ok) {
      modalOpen.value = false
      editing.value = null
    }
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.conflictSignal,
  () => {
    modalOpen.value = false
    editing.value = null
  },
)
</script>

<style scoped>
.campaigns-accordion :deep(button:hover:not(:disabled)) {
  background-color: var(--color-info-soft);
}
</style>
