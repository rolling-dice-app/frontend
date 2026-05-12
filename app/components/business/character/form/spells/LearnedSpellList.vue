<template>
  <section :aria-labelledby="headingId">
    <header class="mb-4 flex items-center justify-between">
      <h2 :id="headingId" class="font-display text-lg font-bold text-content">
        {{ t('spell.learnedSection') }}
      </h2>
      <span class="text-xs text-content-muted">
        {{ t('spell.totalPrefix') }}
        <span class="font-bold text-content">{{ spells.length }}</span>
        {{ t('spell.itemCount') }}
      </span>
    </header>

    <p
      v-if="missingNames.length > 0"
      class="mb-3 rounded-md border border-warning bg-warning-soft px-3 py-2 text-xs text-warning"
    >
      {{ t('spell.missingHint') }}：{{ missingNames.join('、') }}
    </p>

    <p v-if="groupedSpells.length === 0" class="py-6 text-center text-sm text-content-muted">
      {{ t('spell.emptyLearned') }}
    </p>
    <div v-else class="space-y-4 max-h-[50vh] overflow-y-auto md:pr-1 scrollbar-hidden">
      <div v-for="group in groupedSpells" :key="group.level">
        <div class="mb-2 flex items-center gap-2">
          <h3 class="font-display text-sm font-bold text-content">
            {{ formatSpellLevel(group.level) }}
          </h3>
          <span class="text-xs text-content-muted">
            {{ group.spells.length }} {{ t('spell.itemCount') }}
          </span>
        </div>
        <ul class="flex flex-col gap-1">
          <li v-for="spell in group.spells" :key="spell.id">
            <button
              type="button"
              class="w-full truncate rounded-md border border-border-soft bg-surface px-3 py-1.5 text-left text-sm text-content transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              @click="emit('select', spell.id)"
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
import type { SpellDTO } from '@rolling-dice-app/core'
import type { SpellFormEntry } from '~/types/business/character-form'

const { t } = useI18n()

const props = defineProps<{
  spells: SpellFormEntry[]
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

const { getSpell } = useSpells()

const headingId = useId()

const learnedSpellDetails = computed(() => {
  const found: SpellDTO[] = []
  const missing: string[] = []
  for (const entry of props.spells) {
    const spell = getSpell(entry.spellId)
    if (spell) found.push(spell)
    else missing.push(entry.spellId)
  }
  return { found, missing }
})

const groupedSpells = computed(() => groupSpellsByLevel(learnedSpellDetails.value.found))
const missingNames = computed(() => learnedSpellDetails.value.missing)
</script>
