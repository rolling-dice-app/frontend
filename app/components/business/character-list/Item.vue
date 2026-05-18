<template>
  <div class="flex items-center gap-2">
    <NuxtLink
      :to="`/character/${character.id}`"
      class="tier-glow group flex flex-1 items-center gap-3 rounded-lg border border-border bg-canvas-elevated px-3 py-2.5 transition-colors duration-200 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      :style="tierGlowStyle"
      :aria-label="`${t('character.viewLabel')} ${character.name}`"
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
          <CommonAppBadge variant="default" class="shrink-0" size="sm">
            {{ character.race ?? '-' }}
          </CommonAppBadge>
        </div>

        <!-- Right: classKey + level badge -->
        <div class="ml-auto flex shrink-0 items-center gap-2">
          <span class="text-xs text-content-muted md:text-sm">
            {{ character.classes.map((p) => t(`class.label.${p.classKey}`)).join(' / ') }}
          </span>
          <div
            class="rounded-full px-2.5 py-0.5 text-xs font-bold md:px-3 md:text-sm"
            :style="{ backgroundColor: tierConfig.badgeBg, color: tierConfig.textColor }"
          >
            <span :class="{ 'tier-shimmer': isMaxLevel }">Lv.{{ totalLevel }}</span>
          </div>
        </div>
      </div>
    </NuxtLink>

    <!-- Share menu：與刪除模式互斥，刪除模式時隱藏 -->
    <BusinessCharacterListShareMenu
      v-if="!isDeleteMode"
      class="shrink-0"
      :character="character"
      @copy-link="$emit('copy-link', $event)"
      @open-page="$emit('open-page', $event)"
      @toggle-share="$emit('toggle-share', $event)"
    />

    <!-- Delete button -->
    <button
      v-if="isDeleteMode"
      type="button"
      :aria-label="`${t('character.deleteLabel')} ${character.name}`"
      class="ml-2 size-11 shrink-0 flex items-center justify-center bg-danger rounded-md cursor-pointer hover:bg-danger-hover transition-colors duration-150 text-content-inverse"
      @click.prevent="$emit('delete', character)"
    >
      <Icon name="close" :size="20" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
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
  { textColor: string; badgeBg: string; shadowRgb: string }
> = {
  common: {
    textColor: 'var(--rd--color-text-muted)',
    badgeBg: 'var(--rd--tier-common-soft)',
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

// tier-glow 強度/顏色由 .tier-glow class 用 token calc() 算（design-language §9）；
// 此處只餵 tier 色 RGB、總等級、列表卡半徑 16px。
const tierGlowStyle = computed(() => ({
  '--tier-glow-rgb': tierConfig.value.shadowRgb,
  '--tier-glow-level': totalLevel.value,
  '--tier-glow-radius': '16px',
}))

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
