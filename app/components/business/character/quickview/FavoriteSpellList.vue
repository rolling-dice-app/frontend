<template>
  <section :aria-labelledby="headingId">
    <header class="mb-4 flex items-center justify-between">
      <h3 :id="headingId" class="font-display text-lg font-bold text-content">
        {{ t('spell.favoriteSection') }}
      </h3>
      <span class="text-xs text-content-muted">
        {{ t('spell.totalPrefix') }}
        <span class="font-bold text-content">{{ totalCount }}</span> {{ t('spell.itemCount') }}
      </span>
    </header>

    <p v-if="totalCount === 0" class="py-6 text-center text-sm text-content-muted">
      {{ t('spell.emptyFavoriteHint') }}
      <Icon name="star" :size="14" class="inline align-text-bottom" />
      {{ t('spell.emptyFavoriteHintSuffix') }}
    </p>

    <div v-else class="space-y-4">
      <div v-for="group in groupedSpells" :key="group.level">
        <div class="mb-2 flex items-center gap-2">
          <h4 class="font-display text-sm font-bold text-content">
            {{ formatSpellLevel(group.level) }}
          </h4>
          <span class="text-xs text-content-muted">
            {{ group.spells.length }} {{ t('spell.itemCount') }}
          </span>
        </div>
        <ul class="flex flex-col gap-1">
          <li v-for="spell in group.spells" :key="spell.id">
            <button
              type="button"
              class="w-full truncate rounded-md border border-border-soft bg-surface px-3 py-1.5 text-left text-sm text-content transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              @click="$emit('select', spell.id)"
            >
              {{ spell.name }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import type { CharacterDTO, SpellDTO } from '@rolling-dice-app/core'

const { t } = useI18n()

const props = defineProps<{
  character: CharacterDTO
}>()

defineEmits<{
  select: [id: string]
}>()

const { getSpell } = useSpells()

const headingId = useId()

const groupedSpells = computed(() => {
  const spells: SpellDTO[] = []
  for (const entry of props.character.spells) {
    if (!entry.isFavorite) continue
    const spell = getSpell(entry.id)
    if (spell) spells.push(spell)
  }
  return groupSpellsByLevel(spells)
})

const totalCount = computed(() => groupedSpells.value.reduce((sum, g) => sum + g.spells.length, 0))
</script>
