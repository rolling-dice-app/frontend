<template>
  <NuxtLink
    :to="`/character/${character.id}`"
    class="tier-glow group block rounded-lg transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    :style="tierGlowStyle"
    :aria-label="`${t('character.viewLabel')} ${character.name}`"
  >
    <Card
      :radius="RADIUS.lg"
      :padding="0"
      shadow="none"
      :bg-color="'var(--color-canvas-elevated)'"
      class="overflow-hidden border border-border transition-colors duration-200"
    >
      <!-- Cover: classKey image -->
      <template #cover>
        <div class="relative h-64 overflow-hidden">
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
            :style="{ backgroundColor: tierConfig.badgeBg, color: tierConfig.textColor }"
          >
            <span :class="{ 'tier-shimmer': isMaxLevel }">Lv.{{ totalLevel }}</span>
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
            <CommonAppBadge variant="default" size="sm">
              {{ character.race ?? '-' }}
            </CommonAppBadge>
            <span class="text-xs text-content-muted">
              {{ character.classes.map((p) => t(`class.label.${p.classKey}`)).join(' / ') }}
            </span>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <BusinessCharacterListShareMenu
            v-if="!isDeleteMode"
            :character="character"
            @copy-link="$emit('copy-link', $event)"
            @open-page="$emit('open-page', $event)"
            @toggle-share="$emit('toggle-share', $event)"
          />
          <button
            v-if="isDeleteMode"
            type="button"
            :aria-label="`${t('character.deleteLabel')} ${character.name}`"
            class="size-11 flex items-center justify-center bg-danger rounded-md cursor-pointer hover:bg-danger-hover transition-colors duration-150 text-content-inverse"
            @click.prevent.stop="$emit('delete', character)"
          >
            <Icon name="close" :size="20" />
          </button>
        </div>
      </div>
    </Card>
  </NuxtLink>
</template>

<script setup lang="ts">
import { Card, Icon } from '@ui'
import { RADIUS } from '~/constants/style'
import type { CharacterTier } from '~/helpers/character'
import type { CharacterListItem } from '~/types/business/character-list'

const { t } = useI18n()

const props = defineProps<{
  character: CharacterListItem
  isDeleteMode: boolean
}>()

defineEmits<{
  delete: [CharacterListItem]
  'copy-link': [CharacterListItem]
  'open-page': [CharacterListItem]
  'toggle-share': [CharacterListItem]
}>()

const TIER_CONFIG: Record<
  CharacterTier,
  { textColor: string; badgeBg: string; gradientEnd: string; shadowRgb: string }
> = {
  common: {
    textColor: 'var(--rd--color-text-muted)',
    badgeBg: 'var(--rd--tier-common-soft)',
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

// tier-glow 強度/顏色由 .tier-glow class 用 token calc() 算（design-language §9）；
// 此處只餵 tier 色 RGB、總等級、清單卡半徑 24px。
const tierGlowStyle = computed(() => ({
  '--tier-glow-rgb': tierConfig.value.shadowRgb,
  '--tier-glow-level': totalLevel.value,
  '--tier-glow-radius': '24px',
}))

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
