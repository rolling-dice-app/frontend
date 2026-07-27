<template>
  <div class="flex flex-col">
    <!-- 出席角色（已帶入、未參戰） -->
    <div class="flex flex-col pb-1.5">
      <h3 class="px-3 pb-1 pt-2 text-[11px] font-bold tracking-wider text-content-faint">
        {{ t('battlefield.groupCharacters') }}
      </h3>
      <template v-if="characterUnits.length > 0">
        <div
          v-for="unit in characterUnits"
          :key="unit.id"
          class="flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-panel-2"
        >
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="truncate font-semibold">{{ unit.name }}</span>
            <span class="text-[11px] text-content-muted tabular-nums">{{
              unitStatLine(unit)
            }}</span>
          </span>
          <CommonAppButton
            type="button"
            variant="primary"
            size="xs"
            @click="emit('enter', unit.id)"
          >
            {{ t('battlefield.join') }}
          </CommonAppButton>
          <button
            type="button"
            class="flex size-7 shrink-0 items-center justify-center rounded-md text-danger-hover hover:bg-panel-2"
            :aria-label="`${t('battlefield.removeUnit')} ${unit.name}`"
            @click="emit('removeUnit', unit.id)"
          >
            <Icon name="close" :size="14" />
          </button>
        </div>
      </template>
      <p v-else class="px-3 py-1.5 text-[11px] text-content-muted">
        {{ t('battlefield.groupEmpty') }}
      </p>
    </div>

    <!-- 怪物模板：一鍵建實例並參戰 -->
    <div class="flex flex-col border-t border-panel-border pb-1.5">
      <h3 class="px-3 pb-1 pt-2 text-[11px] font-bold tracking-wider text-content-faint">
        {{ t('battlefield.groupTemplates') }}
      </h3>
      <div
        v-for="template in templates"
        :key="template.id"
        class="flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-panel-2"
      >
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="truncate font-medium">
            {{ template.name }}
            <span
              v-if="template.challengeRating != null"
              class="text-[11px] text-content-muted tabular-nums"
              >CR {{ template.challengeRating }}</span
            >
          </span>
          <span class="text-[11px] text-content-muted tabular-nums">
            {{ t('battlefield.statAcHp', { ac: template.ac, hp: template.hp }) }}
          </span>
        </span>
        <CommonAppButton
          type="button"
          variant="primary"
          size="xs"
          :title="t('battlefield.joinTemplateTitle')"
          @click="emit('addTemplate', template.id)"
        >
          {{ t('battlefield.join') }}
        </CommonAppButton>
        <span class="size-7 shrink-0" aria-hidden="true" />
      </div>
    </div>

    <!-- 其他單位：手動臨時單位＋退場的怪物實例 -->
    <div class="flex flex-col border-t border-panel-border pb-1.5">
      <h3 class="px-3 pb-1 pt-2 text-[11px] font-bold tracking-wider text-content-faint">
        {{ t('battlefield.groupOthers') }}
      </h3>
      <template v-if="otherUnits.length > 0">
        <div
          v-for="unit in otherUnits"
          :key="unit.id"
          class="flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-panel-2"
        >
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="truncate font-semibold">{{ unit.name }}</span>
            <span class="text-[11px] text-content-muted tabular-nums">{{
              unitStatLine(unit)
            }}</span>
          </span>
          <CommonAppButton
            type="button"
            variant="primary"
            size="xs"
            @click="emit('enter', unit.id)"
          >
            {{ t('battlefield.join') }}
          </CommonAppButton>
          <button
            type="button"
            class="flex size-7 shrink-0 items-center justify-center rounded-md text-danger-hover hover:bg-panel-2"
            :aria-label="`${t('battlefield.removeUnit')} ${unit.name}`"
            @click="emit('removeUnit', unit.id)"
          >
            <Icon name="close" :size="14" />
          </button>
        </div>
      </template>
      <p v-else class="px-3 py-1.5 text-[11px] text-content-muted">
        {{ t('battlefield.groupEmpty') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import type { BattlefieldUnit } from '@rolling-dice-app/core'
import type { BattlefieldTemplateSource } from '~/types/business/battlefield'

const { t } = useI18n()

const props = defineProps<{
  /** 未參戰單位（戰場可用庫） */
  rosterUnits: BattlefieldUnit[]
  templates: BattlefieldTemplateSource[]
}>()

const emit = defineEmits<{
  enter: [unitId: string]
  addTemplate: [templateId: string]
  removeUnit: [unitId: string]
}>()

const characterUnits = computed(() => props.rosterUnits.filter((u) => u.kind === 'character'))
// 怪物實例退場後與 adhoc 一起列在「其他單位」，可再參戰（結束戰鬥 banner 的承諾）
const otherUnits = computed(() => props.rosterUnits.filter((u) => u.kind !== 'character'))

const unitStatLine = (unit: BattlefieldUnit): string => {
  const base = t('battlefield.statHpAc', {
    current: unit.hp.current,
    max: effectiveMaxHp(unit),
    ac: effectiveAc(unit),
  })
  return unit.conditions.length > 0
    ? `${base}・${t('battlefield.conditionCount', { count: unit.conditions.length })}`
    : base
}
</script>
