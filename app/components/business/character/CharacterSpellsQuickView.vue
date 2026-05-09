<template>
  <div class="space-y-4 bg-canvas-elevated p-4">
    <p v-if="pending" class="py-12 text-center text-content-muted">法術資料載入中…</p>
    <div v-else-if="error" class="flex flex-col items-center gap-3 py-12 text-center">
      <p class="text-danger">法術資料載入失敗</p>
      <Button size="sm" bg-color="var(--color-warning)" :radius="4" @click="refresh()">
        重試
      </Button>
    </div>
    <div v-else class="flex flex-col gap-4 md:flex-row md:items-start">
      <BusinessCharacterQuickviewLearnedSpellAccordion
        ref="learnedRef"
        :character="character"
        class="min-w-0 md:flex-2"
      />
      <BusinessCharacterQuickviewFavoriteSpellList
        :character="character"
        class="min-w-0 md:sticky md:top-4 md:flex-1"
        @select="onSelectFavorite"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@ui'
import type { CharacterDTO } from '@rolling-dice-app/core'

defineProps<{
  character: CharacterDTO
}>()

const { pending, error, refresh } = useSpells()

const learnedRef = ref<{ focusSpell: (id: string) => Promise<void> } | null>(null)

const onSelectFavorite = (id: string): void => {
  learnedRef.value?.focusSpell(id)
}
</script>
