<template>
  <section
    class="rounded-lg border border-border bg-canvas-elevated p-4"
    aria-labelledby="share-spells-label"
  >
    <h2 id="share-spells-label" class="mb-4 font-display text-lg font-bold text-content">
      {{ t('spell.learnedSection') }}
    </h2>

    <p v-if="pending" class="py-8 text-center text-content-muted">
      {{ t('spell.loadingMessage') }}
    </p>

    <div v-else-if="error" class="flex flex-col items-center gap-3 py-8 text-center">
      <p class="text-danger">{{ t('spell.loadFailed') }}</p>
      <CommonAppButton variant="warning" size="sm" @click="refresh()">
        {{ t('ui.state.retry') }}
      </CommonAppButton>
    </div>

    <template v-else>
      <!-- 圖鑑已載入但個別 spellId 查無：明示而非靜默丟棄（版本漂移） -->
      <p
        v-if="missingIds.length > 0"
        class="mb-3 rounded-md border border-warning bg-warning-soft px-3 py-2 text-xs text-warning"
      >
        {{ t('spell.missingHint') }}：{{ missingIds.join('、') }}
      </p>

      <p v-if="entries.length === 0" class="py-8 text-center text-content-muted">
        {{ t('spell.emptyLearned') }}
      </p>

      <div v-else-if="groupedSpells.length > 0" class="space-y-5">
        <div v-for="group in groupedSpells" :key="group.level">
          <div class="mb-2 flex items-center gap-2">
            <h3 class="font-display text-sm font-bold text-content">
              {{ formatSpellLevel(group.level) }}
            </h3>
            <span class="text-xs text-content-muted">
              {{ group.spells.length }} {{ t('spell.itemCount') }}
            </span>
          </div>
          <Accordion v-model="expandedSpellIds" multiple class="share-spell-accordion">
            <AccordionItem v-for="spell in group.spells" :key="spell.id" :value="spell.id">
              <template #title>
                <div class="min-w-0 flex-1 text-left">
                  <div class="flex items-center gap-2">
                    <p class="truncate text-sm font-semibold text-content">{{ spell.name }}</p>
                    <div
                      v-if="spell.ritual || spell.concentration || spell.material"
                      class="flex shrink-0 gap-1"
                    >
                      <CommonAppBadge
                        v-if="spell.ritual"
                        variant="status"
                        size="sm"
                        bg-color="var(--color-info)"
                        text-color="var(--color-info-soft)"
                      >
                        {{ t('spell.ritual') }}
                      </CommonAppBadge>
                      <CommonAppBadge
                        v-if="spell.concentration"
                        variant="status"
                        size="sm"
                        bg-color="var(--color-warning)"
                        text-color="var(--color-warning-soft)"
                      >
                        {{ t('spell.concentration') }}
                      </CommonAppBadge>
                      <CommonAppBadge
                        v-if="spell.material"
                        variant="status"
                        size="sm"
                        bg-color="var(--color-surface-3)"
                      >
                        {{ t('spell.consumed') }}
                      </CommonAppBadge>
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
    </template>
  </section>
</template>

<script setup lang="ts">
import { Accordion, AccordionItem } from '@ui'
import type { SharedSpellEntryDTO, SpellDTO } from '@rolling-dice-app/core'

const { t } = useI18n()

const props = defineProps<{
  entries: SharedSpellEntryDTO[]
}>()

// 圖鑑載入與 join 是本元件職責（比照 LearnedSpellAccordion）；查無 vs 未載入分流。
const { getSpell, pending, error, refresh } = useSpells()

const resolved = computed(() => {
  const found: SpellDTO[] = []
  const missing: string[] = []
  for (const entry of props.entries) {
    const spell = getSpell(entry.spellId)
    if (spell) found.push(spell)
    else missing.push(entry.spellId)
  }
  return { found, missing }
})

const groupedSpells = computed(() => groupSpellsByLevel(resolved.value.found))
const missingIds = computed(() => resolved.value.missing)

const expandedSpellIds = ref<string[]>([])
</script>

<style scoped>
.share-spell-accordion :deep(button:hover:not(:disabled)) {
  background-color: var(--color-info-soft);
}
</style>
