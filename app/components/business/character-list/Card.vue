<template>
  <NuxtLink
    :to="`/character/${character.id}`"
    :class="[
      'tier-glow group block rounded-lg transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
      mode === 'trashed' && 'opacity-60 grayscale',
    ]"
    :style="tierGlowStyle"
    :aria-label="`${t('character.viewLabel')} ${character.name}`"
    :aria-disabled="mode === 'trashed' || undefined"
    @click="onCardClick"
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
              v-if="firstClassKey && !classIconError"
              :src="CLASS_IMAGES[firstClassKey]"
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
            v-if="mode === 'active' && !isDeleteMode"
            :character="character"
            @copy-link="$emit('copy-link', $event)"
            @open-page="$emit('open-page', $event)"
            @toggle-share="$emit('toggle-share', $event)"
          />
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
              'size-11 flex items-center justify-center rounded-md transition-colors duration-150',
              isInDeleteCooldown
                ? 'bg-canvas-elevated border border-border text-content-muted cursor-not-allowed opacity-60'
                : 'bg-danger text-content-inverse cursor-pointer hover:bg-danger-hover',
            ]"
            @click.prevent.stop="$emit('delete', character)"
          >
            <Icon name="close" :size="20" />
          </button>
          <button
            v-if="mode === 'trashed'"
            type="button"
            :aria-label="`${t('character.trash.restoreLabel')} ${character.name}`"
            class="size-11 flex items-center justify-center bg-canvas-elevated border border-border rounded-md cursor-pointer hover:bg-surface transition-colors duration-150 text-content"
            @click.prevent.stop="$emit('restore', character)"
          >
            <Icon name="restore" :size="20" />
          </button>
        </div>
      </div>
    </Card>
  </NuxtLink>
</template>

<script setup lang="ts">
import { RESTORE_COOLDOWN_DAYS } from '@rolling-dice-app/core'
import { Card, Icon } from '@ui'
import { RADIUS } from '~/constants/style'
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

const {
  onCardClick,
  isInDeleteCooldown,
  totalLevel,
  tierConfig,
  isMaxLevel,
  tierGlowStyle,
  firstClassKey,
  hasAvatar,
  coverSrc,
  onCoverError,
} = useCharacterListCardView(
  () => props.character,
  () => props.mode,
  '24px',
)

const classIconError = ref(false)
const onClassIconError = () => {
  classIconError.value = true
}
</script>
