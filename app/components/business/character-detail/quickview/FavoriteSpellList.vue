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
import type { SpellDTO } from '@rolling-dice-app/core'

const { t } = useI18n()

defineEmits<{
  select: [id: string]
}>()

const spellsStore = useCharacterSpellsStore()
const { getSpell } = useSpells()

const headingId = useId()

const groupedSpells = computed(() => {
  const spellList: SpellDTO[] = []
  for (const entry of spellsStore.entries) {
    if (!entry.isFavorite) continue
    const spell = getSpell(entry.spellId)
    // 查無對應 catalog 條目（spellId 已從 catalog 移除/未載入）時靜默略過：
    // favorite 僅為 quickview 的便捷檢視，缺漏不阻斷其餘收藏，毋須額外 UI 警示
    if (spell) spellList.push(spell)
  }
  return groupSpellsByLevel(spellList)
})

const totalCount = computed(() => groupedSpells.value.reduce((sum, g) => sum + g.spells.length, 0))
</script>
