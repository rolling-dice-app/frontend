<template>
  <div class="flex flex-col">
    <!-- 出席角色（已帶入；參戰中的也列出，參戰鈕 disabled） -->
    <div class="flex flex-col pb-1.5">
      <h3 class="px-3 pb-1 pt-2 text-[11px] font-bold tracking-wider text-content-faint">
        {{ t('battlefield.groupCharacters') }}
      </h3>
      <template v-if="characterUnits.length > 0">
        <div
          v-for="unit in characterUnits"
          :key="unit.id"
          data-testid="battlefield-roster-row"
          class="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-panel-2"
          :class="unit.id === selectedId ? 'ring-2 ring-inset ring-primary' : ''"
          @click="emit('select', unit.id)"
        >
          <span class="flex min-w-0 flex-1 flex-col">
            <!-- 選取入口是這顆真 button（比照 CombatRow）；整列的 click 保留給指標操作 -->
            <button
              type="button"
              class="truncate text-left font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :aria-label="t('battlefield.selectUnitAria', { name: unit.name })"
              :aria-pressed="unit.id === selectedId"
              @click.stop="emit('select', unit.id)"
            >
              {{ unit.name }}
            </button>
            <span class="text-[11px] text-content-muted tabular-nums">{{
              unitStatLine(unit)
            }}</span>
          </span>
          <span class="flex shrink-0 items-center gap-2" @click.stop>
            <CommonAppButton
              type="button"
              variant="primary"
              size="xs"
              :disabled="unit.inCombat"
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
          </span>
        </div>
      </template>
      <p v-else class="px-3 py-1.5 text-[11px] text-content-muted">
        {{ t('battlefield.groupCharactersEmpty') }}
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

    <!-- 其他單位：怪物實例＋手動臨時單位（參戰中的也列出，參戰鈕 disabled） -->
    <div class="flex flex-col border-t border-panel-border pb-1.5">
      <h3 class="px-3 pb-1 pt-2 text-[11px] font-bold tracking-wider text-content-faint">
        {{ t('battlefield.groupOthers') }}
      </h3>
      <template v-if="otherUnits.length > 0">
        <div
          v-for="unit in otherUnits"
          :key="unit.id"
          data-testid="battlefield-roster-row"
          class="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-panel-2"
          :class="unit.id === selectedId ? 'ring-2 ring-inset ring-primary' : ''"
          @click="emit('select', unit.id)"
        >
          <span class="flex min-w-0 flex-1 flex-col">
            <!-- 選取入口是這顆真 button（比照 CombatRow）；整列的 click 保留給指標操作 -->
            <button
              type="button"
              class="truncate text-left font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :aria-label="t('battlefield.selectUnitAria', { name: unit.name })"
              :aria-pressed="unit.id === selectedId"
              @click.stop="emit('select', unit.id)"
            >
              {{ unit.name }}
            </button>
            <span class="text-[11px] text-content-muted tabular-nums">{{
              unitStatLine(unit)
            }}</span>
          </span>
          <span class="flex shrink-0 items-center gap-2" @click.stop>
            <CommonAppButton
              type="button"
              variant="primary"
              size="xs"
              :disabled="unit.inCombat"
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
          </span>
        </div>
      </template>
      <p v-else class="px-3 py-1.5 text-[11px] text-content-muted">
        {{ t('battlefield.groupOthersEmpty') }}
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
  /** 戰場全部單位；面板自行分組 */
  units: BattlefieldUnit[]
  /** 右欄目前顯示的單位；對應列加選取外框 */
  selectedId: string | null
  templates: BattlefieldTemplateSource[]
}>()

const emit = defineEmits<{
  select: [unitId: string]
  enter: [unitId: string]
  addTemplate: [templateId: string]
  removeUnit: [unitId: string]
}>()

// 角色不論是否參戰都列出，DM 才看得出哪些出席角色已帶入戰場
const characterUnits = computed(() => props.units.filter((u) => u.kind === 'character'))
// 同模板的怪物實例排在一起，adhoc 殿後
const otherUnits = computed(() => sortOtherUnits(props.units.filter((u) => u.kind !== 'character')))

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
