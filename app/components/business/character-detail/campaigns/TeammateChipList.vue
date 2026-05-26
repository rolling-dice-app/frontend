<template>
  <ul
    v-if="teammates.length > 0"
    :aria-label="t('character.campaignField.teammates')"
    class="flex flex-wrap items-center gap-1.5"
  >
    <li v-for="teammate in teammates" :key="teammate.shareId">
      <NuxtLink
        v-if="linkable && teammate.available"
        :to="`/share/${teammate.shareId}`"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="teammate.name ?? teammate.shareId"
        class="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-surface-2 px-2 py-0.5 text-xs text-content transition-colors hover:border-primary hover:bg-info-soft"
      >
        <img
          v-if="teammate.avatar"
          :src="teammate.avatar"
          :alt="teammate.name ?? ''"
          class="size-4 rounded-full object-cover"
          loading="lazy"
        />
        <span
          v-else
          aria-hidden="true"
          class="flex size-4 items-center justify-center rounded-full bg-surface-raised text-content-muted"
        >
          <Icon name="user" :size="10" />
        </span>
        <span class="max-w-32 truncate">{{ teammate.name ?? teammate.shareId }}</span>
        <span v-if="teammate.ownerDisplayName" class="text-content-muted">
          · {{ teammate.ownerDisplayName }}
        </span>
      </NuxtLink>

      <span
        v-else
        :aria-label="
          teammate.available ? (teammate.name ?? teammate.shareId) : unavailableAria(teammate)
        "
        :class="[
          'inline-flex items-center gap-1.5 rounded-full border border-border-soft px-2 py-0.5 text-xs',
          teammate.available ? 'bg-surface-2 text-content' : 'bg-surface text-content-muted',
        ]"
      >
        <img
          v-if="teammate.available && teammate.avatar"
          :src="teammate.avatar"
          :alt="teammate.name ?? ''"
          class="size-4 rounded-full object-cover"
          loading="lazy"
        />
        <span
          v-else
          aria-hidden="true"
          class="flex size-4 items-center justify-center rounded-full bg-surface-raised text-content-muted"
        >
          <Icon name="user" :size="10" />
        </span>
        <span class="max-w-32 truncate">
          {{
            teammate.available
              ? (teammate.name ?? teammate.shareId)
              : t('character.campaignField.teammateUnavailable')
          }}
        </span>
        <span v-if="teammate.available && teammate.ownerDisplayName" class="text-content-muted">
          · {{ teammate.ownerDisplayName }}
        </span>
      </span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import type { SharedCharacterPreviewDTO } from '@rolling-dice-app/core'

const { t } = useI18n()

withDefaults(
  defineProps<{
    teammates: SharedCharacterPreviewDTO[]
    linkable?: boolean
  }>(),
  { linkable: true },
)

const unavailableAria = (teammate: SharedCharacterPreviewDTO): string =>
  `${t('character.campaignField.teammateUnavailable')} (${teammate.shareId})`
</script>
