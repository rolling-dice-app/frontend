<template>
  <div class="flex items-center gap-2">
    <NuxtLink
      :to="`/character/${character.id}`"
      class="group flex flex-1 items-center gap-3 rounded-lg border border-border bg-bg-elevated px-3 py-2.5 transition-colors duration-200 hover:bg-surface hover:shadow-(--card-shadow) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      :style="cardShadowStyle"
      :aria-label="`查看角色 ${character.name}`"
    >
      <!-- Thumbnail -->
      <div class="relative size-14 shrink-0 overflow-hidden rounded-md">
        <img
          :src="coverSrc"
          alt=""
          :class="[
            'h-full w-full transition-transform duration-300 group-hover:scale-105',
            hasAvatar ? 'object-cover' : 'object-contain object-top',
          ]"
          loading="lazy"
          decoding="async"
          @error="onCoverError"
        />
      </div>

      <!-- Info -->
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <!-- Left: name + race -->
        <div class="flex min-w-0 shrink items-center gap-2">
          <h3
            class="min-w-0 truncate font-display text-sm font-bold md:text-base"
            :class="{ 'tier-shimmer': isMaxLevel }"
            :style="{ color: tierConfig.textColor }"
          >
            {{ character.name }}
          </h3>
          <Badge
            class="shrink-0"
            bg-color="var(--rd--color-surface-2)"
            text-color="var(--rd--color-text-muted)"
            :radius="4"
            size="sm"
          >
            {{ character.race ?? '-' }}
          </Badge>
        </div>

        <!-- Right: classKey + level badge -->
        <div class="ml-auto flex shrink-0 items-center gap-2">
          <span class="text-xs text-content-muted md:text-sm">
            {{ character.classes.map((p) => CLASS_CONFIG[p.classKey].label).join(' / ') }}
          </span>
          <div
            class="rounded-full px-2.5 py-0.5 text-xs font-bold md:px-3 md:text-sm"
            :class="{ 'tier-shimmer': isMaxLevel }"
            :style="{ backgroundColor: tierConfig.badgeBg, color: tierConfig.textColor }"
          >
            Lv.{{ totalLevel }}
          </div>
        </div>
      </div>
    </NuxtLink>

    <!-- Delete button -->
    <button
      v-if="isDeleteMode"
      type="button"
      :aria-label="`刪除角色卡 ${character.name}`"
      class="ml-2 size-8 shrink-0 flex items-center justify-center bg-danger rounded-md cursor-pointer hover:bg-danger-hover transition-colors duration-150 text-text-inverse"
      @click.prevent="$emit('delete', character)"
    >
      <Icon name="close" :size="20" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Badge, Icon } from '@ui'
import { CLASS_CONFIG } from '~/constants/dnd'
import type { CharacterTier } from '~/helpers/character'
import type { Character } from '@rolling-dice-app/core'

const props = defineProps<{
  character: Character
  isDeleteMode: boolean
}>()

defineEmits<{
  delete: [Character]
}>()

const TIER_CONFIG: Record<
  CharacterTier,
  { textColor: string; badgeBg: string; shadowRgb: string }
> = {
  common: {
    textColor: 'var(--rd--color-text-muted)',
    badgeBg: 'rgba(35, 31, 32, 0.75)',
    shadowRgb: '160, 150, 140',
  },
  elite: {
    textColor: 'var(--rd--tier-elite)',
    badgeBg: 'var(--rd--tier-elite-soft)',
    shadowRgb: '74, 158, 108',
  },
  master: {
    textColor: 'var(--rd--tier-master)',
    badgeBg: 'var(--rd--tier-master-soft)',
    shadowRgb: '74, 122, 207',
  },
  legendary: {
    textColor: 'var(--rd--color-primary)',
    badgeBg: 'var(--rd--color-primary-soft)',
    shadowRgb: '184, 134, 14',
  },
}

const totalLevel = computed(() => calculateTotalLevel(props.character.classes))
const tier = computed(() => getCharacterTier(totalLevel.value))
const tierConfig = computed(() => TIER_CONFIG[tier.value])
const isMaxLevel = computed(() => totalLevel.value === 20)

const cardShadowStyle = computed(() => {
  const opacity = totalLevel.value * 0.017 + 0.1
  return { '--card-shadow': `0 0 16px rgba(${tierConfig.value.shadowRgb}, ${opacity.toFixed(3)})` }
})

const coverError = ref(false)

watch(
  () => props.character.avatar,
  () => {
    coverError.value = false
  },
)

const hasAvatar = computed(() => !!props.character.avatar && !coverError.value)
const coverSrc = computed(() =>
  hasAvatar.value ? props.character.avatar! : CLASS_IMAGES[props.character.classes[0]!.classKey],
)

const onCoverError = () => {
  coverError.value = true
}
</script>
