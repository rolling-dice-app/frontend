<template>
  <section
    class="flex flex-col gap-5 rounded-lg border border-border bg-canvas-elevated p-4 sm:flex-row sm:items-start sm:gap-6"
    aria-labelledby="share-summary-name"
  >
    <!-- Portrait -->
    <div
      class="aspect-3/4 w-full shrink-0 overflow-hidden rounded-md border border-primary bg-canvas-inset sm:w-40 md:w-48"
    >
      <img
        v-if="character.avatar"
        :src="character.avatar"
        :alt="`${t('character.portrait.label')} ${character.name}`"
        class="h-full w-full object-cover"
        loading="lazy"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center px-3 text-center text-xs text-content-muted"
      >
        {{ t('character.portrait.placeholderEmpty') }}
      </div>
    </div>

    <!-- Identity + stats -->
    <div class="flex min-w-0 flex-1 flex-col gap-4">
      <div class="flex flex-col gap-1">
        <p class="text-xs text-content-muted">
          {{ t('character.share.sharedBy') }}：{{ ownerDisplayName }}
        </p>
        <h1
          id="share-summary-name"
          class="font-display text-2xl font-bold text-content sm:text-3xl"
        >
          {{ character.name }}
        </h1>
        <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-content-soft">
          <span>{{ raceDisplay }}</span>
          <span class="text-content-faint" aria-hidden="true">·</span>
          <span>{{ classSummary }}</span>
          <span class="text-content-faint" aria-hidden="true">·</span>
          <span>{{ alignmentDisplay }}</span>
        </p>
      </div>

      <dl class="grid grid-cols-3 gap-2 tabular sm:grid-cols-4 lg:grid-cols-8">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="flex flex-col items-center rounded-lg border border-border-soft bg-surface px-2 py-2.5"
        >
          <dt class="text-[0.7rem] text-content-muted">{{ stat.label }}</dt>
          <dd class="mt-0.5 text-xl font-bold" :class="stat.colorClass ?? 'text-content'">
            {{ stat.value }}
          </dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { SharedCharacterProfileDTO } from '@rolling-dice-app/core'

const { t } = useI18n()

const props = defineProps<{
  character: SharedCharacterProfileDTO
  ownerDisplayName: string
}>()

const characterRef = toRef(props, 'character')
const {
  totalLevel,
  totalHp,
  totalArmorClass,
  totalInitiative,
  totalSpeed,
  proficiencyBonus,
  totalPassivePerception,
  totalPassiveInsight,
} = useCharacterDerivedStatsFromCharacter(characterRef)

const raceDisplay = computed(() => {
  const { race, subrace } = props.character
  if (!race) return t('character.emptyDash')
  return subrace ? `${race}（${subrace}）` : race
})

const classSummary = computed(() =>
  props.character.classes
    .map((entry) => `${t(`class.label.${entry.classKey}`)} ${entry.level}`)
    .join(' / '),
)

const alignmentDisplay = computed(() =>
  props.character.alignment
    ? t(`character.alignment.${props.character.alignment}`)
    : t('character.emptyDash'),
)

const modifierColor = (value: number): string => {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-content-muted'
}

const stats = computed(() => [
  { label: t('character.share.totalLevel'), value: totalLevel.value },
  { label: t('combat.acValue'), value: totalArmorClass.value },
  { label: t('combat.hp'), value: totalHp.value },
  {
    label: t('combat.initiative'),
    value: formatModifier(totalInitiative.value),
    colorClass: modifierColor(totalInitiative.value),
  },
  { label: t('combat.speed'), value: totalSpeed.value },
  {
    label: t('combat.proficiencyBonus'),
    value: formatModifier(proficiencyBonus.value),
    colorClass: modifierColor(proficiencyBonus.value),
  },
  {
    label: t('combat.passivePerception'),
    value: totalPassivePerception.value,
  },
  {
    label: t('combat.passiveInsight'),
    value: totalPassiveInsight.value,
  },
])
</script>
