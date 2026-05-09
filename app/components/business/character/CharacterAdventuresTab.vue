<template>
  <section aria-labelledby="adventures-tab-label" class="p-4 space-y-4 bg-canvas-elevated">
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg py-3">
      <div class="flex items-center gap-3">
        <h2 id="adventures-tab-label" class="font-display text-lg font-bold text-content">
          {{ t('character.adventureRecord') }}
        </h2>
        <span class="text-xs text-content-muted">
          {{ entries.length }} {{ t('character.adventureCount') }}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-4">
        <div class="text-xs text-content-muted">
          {{ t('character.expEarnedTotal') }}
          <span class="ml-1 font-medium text-content">{{ totalExpEarned }}</span>
        </div>
        <label class="flex items-center gap-2 text-xs text-content">
          <Toggle
            :model-value="syncMoneyToCurrency"
            :aria-label="t('character.syncMoneyAria')"
            color="var(--color-primary)"
            @update:model-value="$emit('update:syncMoneyToCurrency', $event)"
          />
          <span>{{ t('character.syncMoneyToggle') }}</span>
        </label>
      </div>
    </div>

    <button
      type="button"
      :aria-label="t('character.addAdventureRecord')"
      class="flex w-full items-center justify-center rounded-lg border border-dashed border-border-soft bg-canvas-elevated py-3 text-content-muted transition-colors duration-150 hover:bg-surface hover:text-content"
      @click="openCreate"
    >
      <span class="text-lg leading-none">+</span>
    </button>

    <p
      v-if="entries.length === 0"
      class="rounded-lg border border-dashed border-border-soft bg-surface-2 px-3 py-8 text-center text-xs text-content-muted"
    >
      {{ t('character.emptyAdventureMessage') }}
    </p>

    <Accordion v-else class="adventures-accordion flex flex-col gap-2">
      <BusinessCharacterAdventuresAdventureItem
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        @edit="openEdit"
        @remove="$emit('remove', $event)"
      />
    </Accordion>

    <BusinessCharacterAdventuresAdventureFormModal
      v-model="modalOpen"
      :editing="editing"
      @save="onSave"
    />
  </section>
</template>

<script setup lang="ts">
import { Accordion, Toggle } from '@ui'
import type { AdventureEntry, AdventureEntryDraft } from '~/types/business/adventure'

const { t } = useI18n()

defineProps<{
  entries: AdventureEntry[]
  totalExpEarned: number
  syncMoneyToCurrency: boolean
}>()

const emit = defineEmits<{
  add: [draft: AdventureEntryDraft]
  update: [id: string, draft: AdventureEntryDraft]
  remove: [id: string]
  'update:syncMoneyToCurrency': [value: boolean]
}>()

const modalOpen = ref(false)
const editing = ref<AdventureEntry | null>(null)

const openCreate = (): void => {
  editing.value = null
  modalOpen.value = true
}

const openEdit = (entry: AdventureEntry): void => {
  editing.value = entry
  modalOpen.value = true
}

const onSave = (draft: AdventureEntryDraft, editingId: string | null): void => {
  if (editingId) {
    emit('update', editingId, draft)
  } else {
    emit('add', draft)
  }
}
</script>

<style scoped>
.adventures-accordion :deep(> div) {
  border-bottom-width: 0;
}

.adventures-accordion :deep(button:hover:not(:disabled)) {
  background-color: var(--color-info-soft);
}
</style>
