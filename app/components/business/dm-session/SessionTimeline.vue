<template>
  <ol class="relative ml-1.5 space-y-6 border-l-2 border-border-soft pl-6">
    <li v-for="group in groups" :key="group.date" class="relative">
      <!-- date node：軸線上的金色圓點，ring 用畫布色把軸線打洞 -->
      <span
        class="absolute top-1 -left-[31px] size-3 rounded-full bg-primary ring-4 ring-canvas"
        aria-hidden="true"
      />
      <p class="font-display text-sm font-bold text-primary tabular-nums">{{ group.date }}</p>

      <ul class="mt-2 space-y-2">
        <li v-for="entry in group.entries" :key="entry.session.id">
          <NuxtLink
            :to="`/dm/session/${containerId}/log/${entry.session.id}`"
            class="flex items-center gap-3 rounded-lg border border-border-soft bg-surface px-4 py-3 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              class="shrink-0 rounded bg-canvas-inset px-1.5 py-0.5 text-[10px] tracking-wide text-content-muted tabular-nums"
            >
              {{ t('dmSession.timeline.sessionSeq', { n: entry.seq }) }}
            </span>
            <span class="min-w-0 flex-1 truncate font-display font-semibold text-content">
              {{ entry.session.title }}
            </span>
            <Icon name="chevron-right" :size="16" class="shrink-0 text-content-faint" />
          </NuxtLink>
        </li>
      </ul>
    </li>

    <!-- 軸線末端：空心節點 + 虛線新增卡，邀請續寫下一場 -->
    <li class="relative">
      <span
        class="absolute top-1 -left-[31px] size-3 rounded-full border-2 border-primary bg-canvas ring-4 ring-canvas"
        aria-hidden="true"
      />
      <NuxtLink
        :to="`/dm/session/${containerId}/log/create`"
        class="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-content-muted transition-colors duration-150 hover:bg-surface hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon name="plus" :size="16" />
        {{ t('dmSession.log.addLog') }}
      </NuxtLink>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import type { DmSessionLogSummaryDTO } from '@rolling-dice-app/core'

const { t } = useI18n()

const props = defineProps<{
  /** 已依 date 升冪、同日 createdAt 升冪排序（server 衍生欄位順序） */
  sessions: DmSessionLogSummaryDTO[]
  containerId: string
}>()

/** 依日期分組；seq 為跨組的全域場次序號（第 N 場） */
const groups = computed<
  { date: string; entries: { session: DmSessionLogSummaryDTO; seq: number }[] }[]
>(() => {
  const result: { date: string; entries: { session: DmSessionLogSummaryDTO; seq: number }[] }[] = []
  props.sessions.forEach((session, index) => {
    const last = result[result.length - 1]
    const entry = { session, seq: index + 1 }
    if (last && last.date === session.date) last.entries.push(entry)
    else result.push({ date: session.date, entries: [entry] })
  })
  return result
})
</script>
