<template>
  <ul class="flex flex-col gap-1">
    <li
      v-for="row in rows"
      :key="row.key"
      class="flex items-center gap-2 rounded-lg border border-panel-border bg-panel-2 px-3 py-1.5"
    >
      <span class="min-w-0 flex-1 truncate text-sm text-content">{{ row.label }}</span>
      <span class="text-xs font-bold" :class="getHitBonusColorClass(row.bonus)">
        {{ formatModifier(row.bonus) }}
      </span>
      <span class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          :aria-label="`${row.label} ${t('combat.rollNormal')}`"
          class="flex size-7 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-panel-3 hover:text-content focus-visible:outline-2 focus-visible:outline-ring"
          @click="emit('roll', row.key, 'normal')"
        >
          <Icon name="dice" :size="18" />
        </button>
        <button
          type="button"
          :aria-label="`${row.label} ${t('combat.rollAdvantage')}`"
          class="flex size-7 items-center justify-center rounded-md text-success transition-colors hover:text-success-hover focus-visible:outline-2 focus-visible:outline-ring"
          @click="emit('roll', row.key, 'advantage')"
        >
          <Icon name="double-triangle-up" :size="12" />
        </button>
        <button
          type="button"
          :aria-label="`${row.label} ${t('combat.rollDisadvantage')}`"
          class="flex size-7 items-center justify-center rounded-md text-danger transition-colors hover:text-danger-hover focus-visible:outline-2 focus-visible:outline-ring"
          @click="emit('roll', row.key, 'disadvantage')"
        >
          <Icon name="double-triangle-down" :size="12" />
        </button>
      </span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import { SKILL_KEYS, type SkillKey } from '@rolling-dice-app/core'
import { getHitBonusColorClass } from '~/helpers/combat'
import type { RollMode } from '~/types/business/dice'

const { t } = useI18n()

// 只列有加值的技能（快照為 Partial record）；空物件時由父層不渲染整個區塊
const props = defineProps<{
  skills: Partial<Record<SkillKey, number>>
}>()

const emit = defineEmits<{
  roll: [key: SkillKey, mode: RollMode]
}>()

const rows = computed(() =>
  SKILL_KEYS.filter((key) => props.skills[key] != null).map((key) => ({
    key,
    label: t(`skill.label.${key}`),
    bonus: props.skills[key] ?? 0,
  })),
)
</script>
