<template>
  <section :aria-labelledby="headingId">
    <header class="mb-4 flex items-center justify-between">
      <h3 :id="headingId" class="font-display text-lg font-bold text-content">常用法術</h3>
      <span class="text-xs text-content-muted">
        共 <span class="font-bold text-content">{{ totalCount }}</span> 個
      </span>
    </header>

    <p v-if="totalCount === 0" class="py-6 text-center text-sm text-content-muted">
      尚未標記常用法術，於左側已知法術點
      <Icon name="star" :size="14" class="inline align-text-bottom" />
      即可加入
    </p>

    <div v-else class="space-y-4">
      <div v-for="group in groupedSpells" :key="group.level">
        <div class="mb-2 flex items-center gap-2">
          <h4 class="font-display text-sm font-bold text-content">
            {{ formatSpellLevel(group.level) }}
          </h4>
          <span class="text-xs text-content-muted">{{ group.spells.length }} 個</span>
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
import type { Character, Spell } from '@rolling-dice-app/core'

const props = defineProps<{
  character: Character
}>()

defineEmits<{
  select: [id: string]
}>()

const { getSpell } = useSpells()

const headingId = useId()

const groupedSpells = computed(() => {
  const spells: Spell[] = []
  for (const entry of props.character.spells) {
    if (!entry.isFavorite) continue
    const spell = getSpell(entry.id)
    if (spell) spells.push(spell)
  }
  return groupSpellsByLevel(spells)
})

const totalCount = computed(() => groupedSpells.value.reduce((sum, g) => sum + g.spells.length, 0))
</script>
