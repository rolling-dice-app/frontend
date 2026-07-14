<template>
  <ul
    v-if="members.length > 0"
    :aria-label="t('dmSession.container.field.members')"
    class="flex flex-wrap items-center gap-1.5"
  >
    <li v-for="member in members" :key="member.id">
      <!-- 有效連結：整顆 chip 連到公開角色卡 -->
      <NuxtLink
        v-if="member.character?.available"
        :to="`/share/${member.character.shareId}`"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`${member.playerName} · ${member.character.name ?? member.character.shareId}`"
        class="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-surface-2 px-2 py-0.5 text-xs text-content transition-colors hover:border-primary hover:bg-info-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <img
          v-if="member.character.avatar"
          :src="member.character.avatar"
          :alt="member.character.name ?? ''"
          class="size-4 rounded-full object-cover"
          loading="lazy"
        />
        <span class="max-w-32 truncate font-medium">{{ member.playerName }}</span>
        <span class="max-w-32 truncate text-content-muted">
          · {{ member.character.name ?? member.character.shareId }}
        </span>
      </NuxtLink>

      <!-- 失效連結或未連結：純文字 chip -->
      <span
        v-else
        class="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-surface-2 px-2 py-0.5 text-xs text-content"
      >
        <span class="max-w-32 truncate font-medium">{{ member.playerName }}</span>
        <span v-if="member.character" class="text-content-faint">
          · {{ t('dmSession.member.unavailable') }}
        </span>
      </span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { DmSessionMemberDTO } from '@rolling-dice-app/core'

const { t } = useI18n()

defineProps<{
  members: DmSessionMemberDTO[]
}>()
</script>
