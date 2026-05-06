<template>
  <section :aria-labelledby="headingId">
    <header class="mb-4 flex items-center justify-between">
      <h2 :id="headingId" class="font-display text-lg font-bold text-content">法術資料庫</h2>
    </header>

    <!-- Filter bar -->
    <div class="mb-4 space-y-3 rounded-lg border border-border-soft bg-canvas p-3">
      <CommonAppInput
        :radius="0"
        :model-value="keywordInput"
        type="search"
        size="sm"
        outline
        placeholder="搜尋法術名稱"
        class="w-full"
        @update:model-value="onKeywordInput"
      />

      <div class="flex flex-wrap items-end gap-2">
        <div>
          <label :for="levelSelectId" class="mb-1 block text-xs text-content">環數</label>
          <CommonAppSelect
            :id="levelSelectId"
            v-model="filter.level"
            :options="SPELL_LEVEL_OPTIONS"
            multiple
            multiple-display="count"
            placeholder="-"
            size="sm"
            class="w-32"
          />
        </div>
        <div>
          <label :for="schoolSelectId" class="mb-1 block text-xs text-content">學派</label>
          <CommonAppSelect
            :id="schoolSelectId"
            :model-value="filter.school"
            :options="SPELL_SCHOOL_OPTIONS"
            size="sm"
            class="w-24"
            @update:model-value="filter.school = ($event ?? '') as SchoolFilter"
          />
        </div>
        <Button
          v-if="hasActiveFilter"
          size="sm"
          outline
          :radius="4"
          text-color="var(--color-content-muted)"
          border-color="var(--color-border)"
          class="clear-filter-btn"
          @click="resetFilter"
        >
          清除篩選
        </Button>
      </div>

      <div class="flex flex-wrap gap-x-5 gap-y-2 text-xs text-content">
        <label class="inline-flex items-center gap-2">
          <Toggle
            :model-value="filter.ritual"
            size="sm"
            aria-label="只顯示儀式法術"
            color="var(--color-info)"
            @update:model-value="filter.ritual = $event"
          />
          儀式
        </label>
        <label class="inline-flex items-center gap-2">
          <Toggle
            :model-value="filter.concentration"
            size="sm"
            aria-label="只顯示需要專注的法術"
            color="var(--color-warning)"
            @update:model-value="filter.concentration = $event"
          />
          專注
        </label>
      </div>
    </div>

    <!-- Body -->
    <p v-if="groupedSpells.length === 0" class="py-8 text-center text-content-muted">
      沒有符合條件的法術
    </p>
    <div v-else class="space-y-5 max-h-[60vh] overflow-y-auto md:max-h-[90vh] scrollbar-hidden">
      <div v-for="group in groupedSpells" :key="group.level">
        <div class="mb-2 flex items-center gap-2">
          <h3 class="font-display text-sm font-bold text-content">
            {{ formatSpellLevel(group.level) }}
          </h3>
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
                  :model-value="isLearned(spell.id)"
                  size="sm"
                  color="var(--color-primary)"
                  :aria-label="`掌握 ${spell.name}`"
                  @click.stop
                  @update:model-value="toggleLearnedSpell(spell.id)"
                />
                <div class="min-w-0 flex-1 text-left">
                  <div class="flex items-center gap-2">
                    <p class="truncate text-sm font-semibold text-content">{{ spell.name }}</p>
                    <div v-if="spell.ritual || spell.concentration" class="flex shrink-0 gap-1">
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
import { Accordion, AccordionItem, Badge, Button, Checkbox, Toggle } from '@ui'
import { SPELL_SCHOOL_LABELS } from '~/constants/dnd'
import { SPELL_LEVEL_OPTIONS, SPELL_SCHOOL_OPTIONS } from '~/constants/spell-options'
import type { CharacterUpdateFormState } from '~/types/business/character-form'
import type { Spell, SpellSchool } from '@rolling-dice-app/core'

type SchoolFilter = SpellSchool | ''

const formState = defineModel<CharacterUpdateFormState>('formState', { required: true })
const { toggleLearnedSpell } = useCharacterSpellsForm(formState.value)

const { spells } = useSpells()

const headingId = useId()
const levelSelectId = useId()
const schoolSelectId = useId()

// ─── Filter ─────────────────────────────────────────────────────────────────

interface SpellFilter {
  keyword: string
  level: number[]
  school: SpellSchool | ''
  ritual: boolean
  concentration: boolean
}

const defaultFilter = (): SpellFilter => ({
  keyword: '',
  level: [],
  school: '',
  ritual: false,
  concentration: false,
})

const filter = reactive<SpellFilter>(defaultFilter())

const expandedSpellIds = ref<string[]>([])

const keywordInput = ref('')
const commitKeyword = debounce((value: string) => {
  filter.keyword = value
}, 250)

const onKeywordInput = (value: string) => {
  keywordInput.value = value
  commitKeyword(value)
}

onBeforeUnmount(() => commitKeyword.cancel())

const hasActiveFilter = computed(
  () =>
    filter.keyword !== '' ||
    filter.level.length > 0 ||
    filter.school !== '' ||
    filter.ritual ||
    filter.concentration,
)

const resetFilter = () => {
  Object.assign(filter, defaultFilter())
  keywordInput.value = ''
  commitKeyword.cancel()
}

const filteredSpells = computed<Spell[]>(() => {
  const keyword = filter.keyword.trim().toLowerCase()
  const levels = filter.level.length > 0 ? new Set(filter.level) : null
  const school = filter.school === '' ? null : filter.school

  return spells.value.filter((s) => {
    if (keyword && !s.name.toLowerCase().includes(keyword)) return false
    if (levels && !levels.has(s.level)) return false
    if (school && s.school !== school) return false
    if (filter.ritual && !s.ritual) return false
    if (filter.concentration && !s.concentration) return false
    return true
  })
})

const groupedSpells = computed(() => groupSpellsByLevel(filteredSpells.value))

const isLearned = (id: string): boolean => {
  return formState.value.spells.some((entry) => entry.id === id)
}

const itemEls = new Map<string, HTMLElement>()

const registerItemEl = (id: string, el: unknown): void => {
  if (el && typeof el === 'object' && '$el' in el && el.$el instanceof HTMLElement) {
    itemEls.set(id, el.$el)
  } else {
    itemEls.delete(id)
  }
}

const focusSpell = async (id: string): Promise<void> => {
  Object.assign(filter, defaultFilter())
  keywordInput.value = ''
  commitKeyword.cancel()
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

.clear-filter-btn {
  height: 2rem;
  padding: 0 0.5rem;
  font-size: 0.75rem;
}
</style>
