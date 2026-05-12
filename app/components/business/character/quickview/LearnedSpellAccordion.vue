<template>
  <section :aria-labelledby="headingId">
    <header class="mb-3 flex items-center justify-between">
      <h2 :id="headingId" class="font-display text-lg font-bold text-content">
        {{ t('spell.learnedSection') }}
      </h2>
      <!-- TODO: 待職業對應的準備數量規則確定後，加回「已準備 N / M」計數 -->
    </header>

    <p
      v-if="missingNames.length > 0"
      class="mb-3 rounded-md border border-warning bg-warning-soft px-3 py-2 text-xs text-warning"
    >
      {{ t('spell.missingHint') }}：{{ missingNames.join('、') }}
    </p>

    <p v-if="groupedSpells.length === 0" class="py-8 text-center text-content-muted">
      {{ t('spell.emptyLearned') }}
    </p>
    <div v-else class="space-y-5">
      <div v-for="group in groupedSpells" :key="group.level">
        <div class="mb-2 flex items-center gap-2">
          <h4 class="font-display text-sm font-bold text-content">
            {{ formatSpellLevel(group.level) }}
          </h4>
          <span class="text-xs text-content-muted">
            {{ group.spells.length }} {{ t('spell.itemCount') }}
          </span>
        </div>
        <Accordion v-model="expandedSpellIds" multiple class="spell-accordion">
          <AccordionItem
            v-for="spell in group.spells"
            :key="spell.id"
            :ref="(el) => registerItemEl(spell.id, el)"
            :value="spell.id"
          >
            <template #title>
              <div class="flex flex-1 items-center gap-3">
                <Checkbox
                  class="shrink-0"
                  :model-value="spell.level === 0 || isPrepared(spell.id)"
                  :disabled="spell.level === 0"
                  size="sm"
                  color="var(--color-primary)"
                  :aria-label="`${t('spell.prepare')} ${spell.name}`"
                  @click.stop
                  @update:model-value="onTogglePrepared(spell)"
                />
                <div class="min-w-0 flex-1 text-left">
                  <div class="flex items-center gap-2">
                    <p class="truncate text-sm font-semibold text-content">{{ spell.name }}</p>
                    <div
                      v-if="spell.ritual || spell.concentration || spell.material"
                      class="flex shrink-0 gap-1"
                    >
                      <Badge
                        v-if="spell.ritual"
                        size="sm"
                        bg-color="var(--color-info)"
                        text-color="var(--color-info-soft)"
                      >
                        {{ t('spell.ritual') }}
                      </Badge>
                      <Badge
                        v-if="spell.concentration"
                        size="sm"
                        bg-color="var(--color-warning)"
                        text-color="var(--color-warning-soft)"
                      >
                        {{ t('spell.concentration') }}
                      </Badge>
                      <Badge v-if="spell.material" size="sm" bg-color="var(--color-surface-3)">
                        {{ t('spell.consumed') }}
                      </Badge>
                    </div>
                  </div>
                  <p class="mt-0.5 truncate text-xs text-content-muted">
                    {{ t(`spell.school.${spell.school}`) }}
                    <span class="mx-1">·</span>
                    {{ spell.castingTime }}
                    <span class="mx-1">·</span>
                    {{ spell.range }}
                  </p>
                </div>
                <button
                  type="button"
                  class="favorite-btn shrink-0"
                  :class="{ 'is-active': isFavorite(spell.id) }"
                  :aria-pressed="isFavorite(spell.id)"
                  :aria-label="`${
                    isFavorite(spell.id) ? t('spell.unfavoriteAction') : t('spell.favoriteAction')
                  } ${spell.name}`"
                  @click.stop="onToggleFavorite(spell)"
                >
                  <Icon name="star" :size="18" />
                </button>
              </div>
            </template>

            <dl class="space-y-1 text-sm text-content">
              <div class="flex gap-2">
                <dt class="w-16 shrink-0 text-content-muted">
                  {{ t('spell.attribute.components') }}
                </dt>
                <dd>{{ formatSpellComponents(spell) }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="w-16 shrink-0 text-content-muted">
                  {{ t('spell.attribute.duration') }}
                </dt>
                <dd>{{ spell.duration }}</dd>
              </div>
              <div v-if="spell.material" class="flex gap-2">
                <dt class="w-16 shrink-0 text-content-muted">
                  {{ t('spell.attribute.materials') }}
                </dt>
                <dd>{{ spell.material }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="w-16 shrink-0 text-content-muted">
                  {{ t('spell.attribute.description') }}
                </dt>
                <dd class="whitespace-pre-wrap">{{ spell.desc }}</dd>
              </div>
            </dl>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Accordion, AccordionItem, Badge, Checkbox, Icon } from '@ui'
import type { SpellDTO } from '@rolling-dice-app/core'

const { t } = useI18n()

const spellsStore = useCharacterSpellsStore()
const { getSpell, refresh: refreshCatalog } = useSpells()
const apiErrorToast = useApiErrorToast()

const headingId = useId()

const learnedSpellDetails = computed(() => {
  const found: SpellDTO[] = []
  const missing: string[] = []
  for (const entry of spellsStore.entries) {
    const spell = getSpell(entry.spellId)
    if (spell) found.push(spell)
    else missing.push(entry.spellId)
  }
  return { found, missing }
})

const groupedSpells = computed(() => groupSpellsByLevel(learnedSpellDetails.value.found))
const missingNames = computed(() => learnedSpellDetails.value.missing)

const isPrepared = (spellId: string): boolean =>
  spellsStore.entries.some((entry) => entry.spellId === spellId && entry.isPrepared)

const onTogglePrepared = (spell: SpellDTO): void => {
  if (spell.level === 0) return
  spellsStore.togglePrepared(spell.id)
}

const isFavorite = (spellId: string): boolean =>
  spellsStore.entries.some((entry) => entry.spellId === spellId && entry.isFavorite)

const onToggleFavorite = (spell: SpellDTO): void => {
  spellsStore.toggleFavorite(spell.id)
}

watch(
  () => spellsStore.mutationError,
  (err) => {
    if (!err) return
    void apiErrorToast.handle(err, {
      onStale: () => spellsStore.refetch(),
      onSpellNotFound: () => refreshCatalog(),
    })
    spellsStore.clearMutationError()
  },
)

const expandedSpellIds = ref<string[]>([])
const itemEls = new Map<string, HTMLElement>()

const registerItemEl = (id: string, el: unknown): void => {
  if (el && typeof el === 'object' && '$el' in el && el.$el instanceof HTMLElement) {
    itemEls.set(id, el.$el)
  } else {
    itemEls.delete(id)
  }
}

const focusSpell = async (id: string): Promise<void> => {
  if (!expandedSpellIds.value.includes(id)) expandedSpellIds.value.push(id)
  await nextTick()
  itemEls.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

defineExpose({ focusSpell })
</script>

<style scoped>
.spell-accordion :deep(button:hover:not(:disabled)) {
  background-color: var(--color-info-soft);
}

.favorite-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 9999px;
  color: var(--color-content-muted);
  transition:
    color 120ms ease,
    background-color 120ms ease;
}

.favorite-btn:hover {
  color: var(--color-warning);
}

.favorite-btn.is-active {
  color: var(--color-warning);
}
</style>
