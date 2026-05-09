<template>
  <section :aria-labelledby="headingId">
    <header class="mb-3 flex items-center justify-between">
      <h2 :id="headingId" class="font-display text-lg font-bold text-content">已知法術</h2>
      <!-- TODO: 待職業對應的準備數量規則確定後，加回「已準備 N / M」計數 -->
    </header>

    <p
      v-if="missingNames.length > 0"
      class="mb-3 rounded-md border border-warning bg-warning-soft px-3 py-2 text-xs text-warning"
    >
      資料庫中找不到下列法術：{{ missingNames.join('、') }}
    </p>

    <p v-if="groupedSpells.length === 0" class="py-8 text-center text-content-muted">
      尚未掌握任何法術
    </p>
    <div v-else class="space-y-5">
      <div v-for="group in groupedSpells" :key="group.level">
        <div class="mb-2 flex items-center gap-2">
          <h4 class="font-display text-sm font-bold text-content">
            {{ formatSpellLevel(group.level) }}
          </h4>
          <span class="text-xs text-content-muted">{{ group.spells.length }} 個</span>
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
                  :aria-label="`準備 ${spell.name}`"
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
                        儀式
                      </Badge>
                      <Badge
                        v-if="spell.concentration"
                        size="sm"
                        bg-color="var(--color-warning)"
                        text-color="var(--color-warning-soft)"
                      >
                        專注
                      </Badge>
                      <Badge v-if="spell.material" size="sm" bg-color="var(--color-surface-3)">
                        耗材
                      </Badge>
                    </div>
                  </div>
                  <p class="mt-0.5 truncate text-xs text-content-muted">
                    {{ SPELL_SCHOOL_LABELS[spell.school] }}
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
                  :aria-label="`${isFavorite(spell.id) ? '取消常用' : '標記為常用'} ${spell.name}`"
                  @click.stop="onToggleFavorite(spell)"
                >
                  <Icon name="star" :size="18" />
                </button>
              </div>
            </template>

            <dl class="space-y-1 text-sm text-content">
              <div class="flex gap-2">
                <dt class="w-16 shrink-0 text-content-muted">成分</dt>
                <dd>{{ formatSpellComponents(spell) }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="w-16 shrink-0 text-content-muted">持續時間</dt>
                <dd>{{ spell.duration }}</dd>
              </div>
              <div v-if="spell.material" class="flex gap-2">
                <dt class="w-16 shrink-0 text-content-muted">材料</dt>
                <dd>{{ spell.material }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="w-16 shrink-0 text-content-muted">描述</dt>
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
import { SPELL_SCHOOL_LABELS } from '~/constants/dnd'
import type { CharacterDTO, SpellDTO } from '@rolling-dice-app/core'

const props = defineProps<{
  character: CharacterDTO
}>()

const characterStore = useCharacterStore()
const { getSpell } = useSpells()

const headingId = useId()

const learnedSpellDetails = computed(() => {
  const found: SpellDTO[] = []
  const missing: string[] = []
  for (const entry of props.character.spells) {
    const spell = getSpell(entry.id)
    if (spell) found.push(spell)
    else missing.push(entry.id)
  }
  return { found, missing }
})

const groupedSpells = computed(() => groupSpellsByLevel(learnedSpellDetails.value.found))
const missingNames = computed(() => learnedSpellDetails.value.missing)

const isPrepared = (id: string): boolean => {
  return props.character.spells.some((entry) => entry.id === id && entry.isPrepared)
}

const onTogglePrepared = (spell: SpellDTO): void => {
  if (spell.level === 0) return
  const latest = characterStore.getById(props.character.id)
  if (!latest) return
  characterStore.patchCharacter(props.character.id, {
    spells: withToggledFlag(latest.spells, spell.id, 'isPrepared'),
  })
}

const isFavorite = (id: string): boolean => {
  return props.character.spells.some((entry) => entry.id === id && entry.isFavorite)
}

const onToggleFavorite = (spell: SpellDTO): void => {
  const latest = characterStore.getById(props.character.id)
  if (!latest) return
  characterStore.patchCharacter(props.character.id, {
    spells: withToggledFlag(latest.spells, spell.id, 'isFavorite'),
  })
}

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
