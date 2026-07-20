<template>
  <div class="flex flex-col gap-2.5">
    <div class="flex flex-wrap items-center gap-2">
      <input
        class="min-w-24 max-w-52 rounded-md border border-panel-border bg-canvas-inset px-2 py-1 text-[15px] font-bold outline-none focus:border-primary"
        :value="unit.name"
        :maxlength="UNIT_NAME_MAX_LENGTH"
        :aria-label="t('battlefield.nameAria')"
        :title="t('battlefield.nameEditTitle')"
        @change="onNameChange"
        @keydown.enter="($event.target as HTMLInputElement).blur()"
      />
      <span
        class="whitespace-nowrap rounded-full border border-border-soft bg-canvas-inset px-2 py-px text-[11px] text-content-muted"
      >
        {{ t(`battlefield.kind.${unit.kind}`) }}
      </span>
      <span v-if="unitTitle" class="text-xs text-content-muted">{{ unitTitle }}</span>
      <span class="ml-auto flex items-center">
        <span
          v-if="isActive"
          class="whitespace-nowrap rounded-full border border-ring-soft px-2 py-px text-[11px] font-semibold text-primary-hover"
        >
          {{ t('battlefield.activeChip') }}
        </span>
        <CommonAppButton
          v-else-if="unit.inCombat"
          type="button"
          variant="neutral"
          size="xs"
          @click="emit('setActive')"
        >
          {{ t('battlefield.setActive') }}
        </CommonAppButton>
      </span>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span
        class="inline-flex gap-0.5 rounded-lg border border-border-soft bg-canvas-inset p-0.5"
        role="group"
        :aria-label="t('battlefield.factionAria')"
      >
        <button
          v-for="factionKey in FACTION_ORDER"
          :key="factionKey"
          type="button"
          class="rounded-md px-2.5 py-0.5 text-xs"
          :class="
            unit.faction === factionKey
              ? 'bg-surface-3 font-semibold text-content'
              : 'text-content-muted hover:text-content'
          "
          :aria-pressed="unit.faction === factionKey"
          @click="emit('setFaction', factionKey)"
        >
          {{ t(`battlefield.faction.${factionKey}`) }}
        </button>
      </span>
      <span class="ml-auto">
        <CommonAppButton
          v-if="unit.inCombat"
          type="button"
          variant="ghost"
          size="sm"
          @click="emit('leaveCombat')"
        >
          {{ t('battlefield.leaveCombat') }}
        </CommonAppButton>
        <CommonAppButton
          v-else
          type="button"
          variant="primary"
          size="sm"
          @click="emit('enterCombat')"
        >
          {{ t('battlefield.join') }}
        </CommonAppButton>
      </span>
    </div>

    <div class="grid grid-cols-[repeat(auto-fit,minmax(108px,1fr))] gap-2">
      <div
        class="flex flex-col items-center gap-1 rounded-lg border border-panel-border bg-panel-2 px-1.5 py-2"
      >
        <span class="text-[11px] tracking-wide text-content-muted">
          {{ t('battlefield.hpCurrent') }}
        </span>
        <span
          class="flex items-baseline gap-1 text-[22px] font-bold leading-tight tabular-nums"
          :class="currentHpClass"
        >
          {{ unit.currentHp }}
          <span
            v-if="unit.currentHp === 0"
            class="text-danger-hover"
            :title="t('battlefield.downMark')"
            >☠</span
          >
        </span>
        <BusinessBattlefieldHpQuickControls
          :name="unit.name"
          @damage="(amount) => emit('damage', amount)"
          @heal="(amount) => emit('heal', amount)"
        />
      </div>

      <div
        class="flex flex-col items-center gap-1 rounded-lg border border-panel-border bg-panel-2 px-1.5 py-2"
      >
        <span class="text-[11px] tracking-wide text-content-muted">
          {{ t('battlefield.hpTemp') }}
        </span>
        <span class="text-[22px] font-bold leading-tight text-info tabular-nums">{{
          unit.tempHp
        }}</span>
        <span class="flex items-center gap-0.5">
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-panel-3 hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="unit.tempHp <= 0"
            :aria-label="`${t('battlefield.hpTemp')} -1`"
            @click="emit('adjustTemp', -1)"
          >
            <Icon name="minus" :size="14" />
          </button>
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-panel-3 hover:text-content"
            :aria-label="`${t('battlefield.hpTemp')} +1`"
            @click="emit('adjustTemp', 1)"
          >
            <Icon name="plus" :size="14" />
          </button>
        </span>
      </div>

      <div
        class="flex flex-col items-center gap-1 rounded-lg border border-panel-border bg-panel-2 px-1.5 py-2"
      >
        <span class="text-[11px] tracking-wide text-content-muted">
          {{ t('battlefield.hpMax') }}
        </span>
        <span class="text-[22px] font-bold leading-tight tabular-nums">{{ unit.maxHp }}</span>
        <span class="flex items-center gap-0.5">
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-panel-3 hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="unit.maxHp <= 1"
            :aria-label="`${t('battlefield.hpMax')} -1`"
            @click="emit('adjustMax', -1)"
          >
            <Icon name="minus" :size="14" />
          </button>
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-panel-3 hover:text-content"
            :aria-label="`${t('battlefield.hpMax')} +1`"
            @click="emit('adjustMax', 1)"
          >
            <Icon name="plus" :size="14" />
          </button>
        </span>
      </div>

      <div
        class="flex flex-col items-center gap-1 rounded-lg border border-panel-border bg-panel-2 px-1.5 py-2"
      >
        <span class="text-[11px] tracking-wide text-content-muted">
          {{ t('battlefield.acLabel') }}
        </span>
        <span class="flex items-baseline gap-1 text-[22px] font-bold leading-tight tabular-nums">
          {{ unit.currentAc }}
          <span
            v-if="acAdjustment !== 0"
            class="text-[11px] font-semibold"
            :class="acAdjustment > 0 ? 'text-success-hover' : 'text-danger-hover'"
          >
            ({{ formatModifier(acAdjustment) }})
          </span>
        </span>
        <span class="flex items-center gap-0.5">
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-panel-3 hover:text-content"
            :aria-label="`${t('battlefield.acLabel')} -1`"
            @click="emit('adjustAc', -1)"
          >
            <Icon name="minus" :size="14" />
          </button>
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-panel-3 hover:text-content"
            :aria-label="`${t('battlefield.acLabel')} +1`"
            @click="emit('adjustAc', 1)"
          >
            <Icon name="plus" :size="14" />
          </button>
        </span>
      </div>

      <div
        class="flex flex-col items-center gap-1 rounded-lg border border-panel-border bg-panel-2 px-1.5 py-2"
      >
        <span class="text-[11px] tracking-wide text-content-muted">
          {{ t('battlefield.speedLabel')
          }}{{ unit.speedValue != null ? t('battlefield.speedFeetSuffix') : '' }}
        </span>
        <span
          v-if="unit.speedValue != null"
          class="text-[22px] font-bold leading-tight tabular-nums"
        >
          {{ unit.speedValue }}
        </span>
        <span
          v-else
          class="line-clamp-2 wrap-break-word text-center text-base font-semibold leading-snug"
          :title="unit.speedText ?? ''"
        >
          {{ unit.speedText || '—' }}
        </span>
      </div>

      <div
        class="flex flex-col items-center gap-1 rounded-lg border border-panel-border bg-panel-2 px-1.5 py-2"
      >
        <span class="text-[11px] tracking-wide text-content-muted">
          {{ t('battlefield.initiativeLabel') }}
          <span class="tabular-nums">{{ formatModifier(unit.initiativeBonus) }}</span>
        </span>
        <input
          type="number"
          class="w-16 rounded-md border border-panel-border bg-canvas-inset p-0.5 text-center text-xl font-bold tabular-nums outline-none [appearance:textfield] focus:border-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          :value="unit.initiative ?? ''"
          placeholder="—"
          :aria-label="t('battlefield.initiativeAria', { name: unit.name })"
          @change="onInitiativeChange"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
        />
        <span class="flex items-center gap-0.5">
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-panel-3 hover:text-content"
            :aria-label="`${t('battlefield.initiativeLabel')} -1`"
            @click="emit('adjustInitiative', -1)"
          >
            <Icon name="minus" :size="14" />
          </button>
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-panel-3 hover:text-content"
            :title="
              t('battlefield.rollInitiativeTitle', { bonus: formatModifier(unit.initiativeBonus) })
            "
            :aria-label="t('battlefield.rollInitiativeAria')"
            @click="emit('rollInitiative')"
          >
            <Icon name="dice-20" :size="15" />
          </button>
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-panel-3 hover:text-content"
            :aria-label="`${t('battlefield.initiativeLabel')} +1`"
            @click="emit('adjustInitiative', 1)"
          >
            <Icon name="plus" :size="14" />
          </button>
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <div class="flex flex-wrap gap-1">
        <template v-if="unit.conditions.length > 0">
          <BusinessBattlefieldConditionBadgeList
            :conditions="unit.conditions"
            removable
            @remove="(conditionId) => emit('removeCondition', conditionId)"
          />
        </template>
        <span v-else class="text-xs text-content-muted">{{
          t('battlefield.conditionsEmpty')
        }}</span>
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        <select
          v-model="conditionDraftKey"
          class="rounded-md border border-panel-border bg-canvas-inset px-2 py-1 text-xs outline-none focus:border-primary"
          :aria-label="t('battlefield.conditionSelectAria')"
        >
          <option v-for="key in CONDITION_KEYS" :key="key" :value="key">
            {{ t(`combat.condition.${key}`) }}
          </option>
        </select>
        <input
          v-model="conditionDraftNote"
          type="text"
          class="min-w-24 flex-1 rounded-md border border-panel-border bg-canvas-inset px-2 py-1 text-xs outline-none focus:border-primary"
          :placeholder="t('battlefield.conditionNotePlaceholder')"
          :aria-label="t('battlefield.conditionNotePlaceholder')"
          @keydown.enter="onApplyCondition"
        />
        <CommonAppButton type="button" variant="neutral" size="sm" @click="onApplyCondition">
          ＋{{ t('battlefield.applyCondition') }}
        </CommonAppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import { CONDITION_KEYS } from '@rolling-dice-app/core'
import type { ClassKey, ConditionKey } from '@rolling-dice-app/core'
import type { BattlefieldFaction, BattlefieldUnit } from '~/types/business/battlefield'
import { FACTION_ORDER } from '~/constants/battlefield'

/** 與 store 端 renameUnit 的截斷上限一致 */
const UNIT_NAME_MAX_LENGTH = 30

const { t } = useI18n()

const props = defineProps<{
  unit: BattlefieldUnit
  /** 當前行動者 */
  isActive: boolean
}>()

const classLabelOf = (key: ClassKey) => t(`class.label.${key}`)

// character 由快照 race/classes 組「種族 主職業 Lv.總等級」；monster/adhoc 用 title 原字
const unitTitle = computed(() =>
  props.unit.kind === 'character'
    ? formatCharacterTitle(props.unit.race, props.unit.classes, classLabelOf)
    : props.unit.title,
)

const emit = defineEmits<{
  rename: [name: string]
  setFaction: [faction: BattlefieldFaction]
  setActive: []
  enterCombat: []
  leaveCombat: []
  damage: [amount: number]
  heal: [amount: number]
  adjustTemp: [delta: number]
  adjustMax: [delta: number]
  adjustAc: [delta: number]
  setInitiative: [value: number | null]
  adjustInitiative: [delta: number]
  rollInitiative: []
  addCondition: [key: ConditionKey, note: string | null]
  removeCondition: [conditionId: string]
}>()

const acAdjustment = computed(() => props.unit.currentAc - props.unit.baseAc)

const currentHpClass = computed(() => {
  const tier = hpRatioTier(props.unit.currentHp, props.unit.maxHp)
  if (tier === 'crit') return 'text-danger-hover'
  if (tier === 'low') return 'text-warning'
  return 'text-content'
})

const onNameChange = (event: Event): void => {
  const value = (event.target as HTMLInputElement).value.trim()
  if (value) emit('rename', value)
  // 空值不提交；還原顯示為現值
  else (event.target as HTMLInputElement).value = props.unit.name
}

const onInitiativeChange = (event: Event): void => {
  const raw = (event.target as HTMLInputElement).value.trim()
  if (raw === '') {
    emit('setInitiative', null)
    return
  }
  const parsed = Number.parseInt(raw, 10)
  emit('setInitiative', Number.isFinite(parsed) ? parsed : null)
}

// ── 狀態新增 ─────────────────────────────────────────────────────────────────
const conditionDraftKey = ref<ConditionKey>(CONDITION_KEYS[0] ?? 'blinded')
const conditionDraftNote = ref('')

const onApplyCondition = (): void => {
  const note = conditionDraftNote.value.trim()
  emit('addCondition', conditionDraftKey.value, note === '' ? null : note)
  conditionDraftNote.value = ''
}
</script>
