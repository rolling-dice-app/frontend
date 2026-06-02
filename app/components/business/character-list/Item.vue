<template>
  <div class="flex items-center gap-2">
    <NuxtLink
      :to="`/character/${character.id}`"
      :class="[
        'tier-glow group flex flex-1 items-center gap-3 rounded-lg border border-border bg-canvas-elevated px-3 py-2.5 transition-colors duration-200 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        mode === 'trashed' && 'opacity-60 grayscale',
      ]"
      :style="tierGlowStyle"
      :aria-label="`${t('character.viewLabel')} ${character.name}`"
      :aria-disabled="mode === 'trashed' || undefined"
      @click="onCardClick"
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

    <!-- Share menu：與刪除模式互斥，刪除模式 / trash mode 時隱藏 -->
    <BusinessCharacterListShareMenu
      v-if="mode === 'active' && !isDeleteMode"
      class="shrink-0"
      :character="character"
      @copy-link="$emit('copy-link', $event)"
      @open-page="$emit('open-page', $event)"
      @toggle-share="$emit('toggle-share', $event)"
    />

    <!-- Delete button（cooldown 期內 disable） -->
    <button
      v-if="mode === 'active' && isDeleteMode"
      type="button"
      :disabled="isInDeleteCooldown"
      :aria-label="`${t('character.deleteLabel')} ${character.name}`"
      :title="
        isInDeleteCooldown
          ? t('character.trash.deleteCooldownTooltip', { days: RESTORE_COOLDOWN_DAYS })
          : undefined
      "
      :class="[
        'ml-2 size-11 shrink-0 flex items-center justify-center rounded-md transition-colors duration-150',
        isInDeleteCooldown
          ? 'bg-canvas-elevated border border-border text-content-muted cursor-not-allowed opacity-60'
          : 'bg-danger text-content-inverse cursor-pointer hover:bg-danger-hover',
      ]"
      @click.prevent="$emit('delete', character)"
    >
      <Icon name="close" :size="20" />
    </button>

    <!-- Restore button（trash mode） -->
    <button
      v-if="mode === 'trashed'"
      type="button"
      :aria-label="`${t('character.trash.restoreLabel')} ${character.name}`"
      class="ml-2 size-11 shrink-0 flex items-center justify-center bg-canvas-elevated border border-border rounded-md cursor-pointer hover:bg-surface transition-colors duration-150 text-content"
      @click.prevent="$emit('restore', character)"
    >
      <Icon name="restore" :size="20" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { RESTORE_COOLDOWN_DAYS } from '@rolling-dice-app/core'
import { Icon } from '@ui'
import type { CharacterListItem } from '~/types/business/character-list'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    character: CharacterListItem
    isDeleteMode: boolean
    mode?: 'active' | 'trashed'
  }>(),
  { mode: 'active' },
)

defineEmits<{
  delete: [CharacterListItem]
  restore: [CharacterListItem]
  'copy-link': [CharacterListItem]
  'open-page': [CharacterListItem]
  'toggle-share': [CharacterListItem]
}>()

// list 版型不畫職業 icon，故 firstClassKey 不取用（封面 null-safety 由 composable 內處理）。
const {
  onCardClick,
  isInDeleteCooldown,
  totalLevel,
  tierConfig,
  isMaxLevel,
  tierGlowStyle,
  hasAvatar,
  coverSrc,
  onCoverError,
} = useCharacterListCardView(
  () => props.character,
  () => props.mode,
  '16px',
)
</script>
