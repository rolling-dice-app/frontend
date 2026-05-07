<template>
  <NuxtLink
    :to="`/character/${character.id}`"
    class="group block transition-shadow duration-200 hover:shadow-(--card-shadow) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    :style="cardShadowStyle"
    :aria-label="`查看角色 ${character.name}`"
  >
    <Card
      :radius="8"
      :padding="0"
      shadow="none"
      :bg-color="'var(--rd--color-bg-elevated)'"
      class="overflow-hidden border border-border transition-colors duration-200"
    >
      <!-- Cover: classKey image -->
      <template #cover>
        <div class="relative h-52 overflow-hidden">
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
          <div
            class="absolute right-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-sm font-bold backdrop-blur-sm"
            :class="{ 'tier-shimmer': isMaxLevel }"
            :style="{ backgroundColor: tierConfig.badgeBg, color: tierConfig.textColor }"
          >
            Lv.{{ totalLevel }}
          </div>
        </div>
      </template>

      <!-- Body -->
      <div class="flex items-end justify-between px-4 pb-4 pt-3">
        <div>
          <div class="flex items-center gap-2">
            <img
              v-show="!classIconError"
              :src="CLASS_IMAGES[character.classes[0]!.classKey]"
              alt=""
              class="size-4"
              loading="lazy"
              decoding="async"
              @error="onClassIconError"
            />
            <h3
              class="truncate font-display text-base font-bold"
              :class="{ 'tier-shimmer': isMaxLevel }"
              :style="{ color: tierConfig.textColor }"
            >
              {{ character.name }}
            </h3>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <Badge
              bg-color="var(--rd--color-surface-2)"
              text-color="var(--rd--color-text-muted)"
              :radius="4"
              size="sm"
            >
              {{ character.race ?? '-' }}
            </Badge>
            <span class="text-xs text-content-muted">
              {{ character.classes.map((p) => CLASS_CONFIG[p.classKey].label).join(' / ') }}
            </span>
          </div>
        </div>
        <button
          v-if="isDeleteMode"
          type="button"
          :aria-label="`刪除角色卡 ${character.name}`"
          class="size-8 flex items-center justify-center bg-danger rounded-md cursor-pointer hover:bg-danger-hover transition-colors duration-150 text-text-inverse"
          @click.prevent="$emit('delete', character)"
        >
          <Icon name="close" :size="20" />
        </button>
      </div>
    </Card>
  </NuxtLink>
</template>

<script setup lang="ts">
import { Badge, Card, Icon } from '@ui'
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
  { textColor: string; badgeBg: string; gradientEnd: string; shadowRgb: string }
> = {
  common: {
    textColor: 'var(--rd--color-text-muted)',
    badgeBg: 'rgba(35, 31, 32, 0.75)',
    gradientEnd: 'var(--rd--color-bg-elevated)',
    shadowRgb: '160, 150, 140',
  },
  elite: {
    textColor: 'var(--rd--tier-elite)',
    badgeBg: 'var(--rd--tier-elite-soft)',
    gradientEnd: 'var(--rd--tier-elite-gradient)',
    shadowRgb: '74, 158, 108',
  },
  master: {
    textColor: 'var(--rd--tier-master)',
    badgeBg: 'var(--rd--tier-master-soft)',
    gradientEnd: 'var(--rd--tier-master-gradient)',
    shadowRgb: '74, 122, 207',
  },
  legendary: {
    textColor: 'var(--rd--color-primary)',
    badgeBg: 'var(--rd--color-primary-soft)',
    gradientEnd: 'var(--rd--color-primary-soft)',
    shadowRgb: '184, 134, 14',
  },
}

const totalLevel = computed(() => calculateTotalLevel(props.character.classes))
const tier = computed(() => getCharacterTier(totalLevel.value))
const tierConfig = computed(() => TIER_CONFIG[tier.value])
const isMaxLevel = computed(() => totalLevel.value === 20)

const cardShadowStyle = computed(() => {
  const opacity = totalLevel.value * 0.017 + 0.1
  return { '--card-shadow': `0 0 24px rgba(${tierConfig.value.shadowRgb}, ${opacity.toFixed(3)})` }
})

const coverError = ref(false)
const classIconError = ref(false)

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

const onClassIconError = () => {
  classIconError.value = true
}
</script>
