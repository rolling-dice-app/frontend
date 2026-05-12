<template>
  <div class="space-y-4 bg-canvas-elevated p-4">
    <p v-if="pending" class="py-12 text-center text-content-muted">
      {{ t('spell.loadingMessage') }}
    </p>
    <div v-else-if="error" class="flex flex-col items-center gap-3 py-12 text-center">
      <p class="text-danger">{{ t('spell.loadFailed') }}</p>
      <Button size="sm" bg-color="var(--color-warning)" :radius="4" @click="refresh()">
        {{ t('ui.state.retry') }}
      </Button>
    </div>
    <div v-else class="flex flex-col gap-4 md:flex-row md:items-start">
      <BusinessCharacterQuickviewLearnedSpellAccordion ref="learnedRef" class="min-w-0 md:flex-2" />
      <BusinessCharacterQuickviewFavoriteSpellList
        class="min-w-0 md:sticky md:top-4 md:flex-1"
        @select="onSelectFavorite"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@ui'

const { t } = useI18n()

const { pending: catalogPending, error: catalogError, refresh: refreshCatalog } = useSpells()
const spellsStore = useCharacterSpellsStore()

const pending = computed(() => catalogPending.value || spellsStore.loading)
const error = computed(() => catalogError.value ?? spellsStore.error)

const refresh = async (): Promise<void> => {
  await Promise.allSettled([refreshCatalog(), spellsStore.refetch()])
}

const learnedRef = ref<{ focusSpell: (id: string) => Promise<void> } | null>(null)

const onSelectFavorite = (id: string): void => {
  learnedRef.value?.focusSpell(id)
}
</script>
