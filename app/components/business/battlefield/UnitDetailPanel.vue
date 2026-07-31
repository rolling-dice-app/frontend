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
          {{ unit.hp.current }}
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
          unit.hp.tempHp
        }}</span>
        <span class="flex items-center gap-0.5">
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-panel-3 hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="unit.hp.tempHp <= 0"
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
        <span class="flex items-baseline gap-1 text-[22px] font-bold leading-tight tabular-nums">
          {{ unitEffectiveMaxHp }}
          <span
            v-if="unit.hp.maxAdjustment !== 0"
            class="text-[11px] font-semibold"
            :class="unit.hp.maxAdjustment > 0 ? 'text-success-hover' : 'text-danger-hover'"
          >
            ({{ formatModifier(unit.hp.maxAdjustment) }})
          </span>
        </span>
        <span class="flex items-center gap-0.5">
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-panel-3 hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="unitEffectiveMaxHp <= 1"
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
          {{ unitEffectiveAc }}
          <span
            v-if="unit.acAdjustment !== 0"
            class="text-[11px] font-semibold"
            :class="unit.acAdjustment > 0 ? 'text-success-hover' : 'text-danger-hover'"
          >
            ({{ formatModifier(unit.acAdjustment) }})
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
          }}{{ unit.speed != null ? t('battlefield.speedFeetSuffix') : '' }}
        </span>
        <template v-if="unit.speed != null">
          <span class="flex items-baseline gap-1 text-[22px] font-bold leading-tight tabular-nums">
            {{ effectiveSpeed }}
            <span
              v-if="unit.speedAdjustment !== 0"
              class="text-[11px] font-semibold"
              :class="unit.speedAdjustment > 0 ? 'text-success-hover' : 'text-danger-hover'"
            >
              ({{ formatModifier(unit.speedAdjustment) }})
            </span>
          </span>
          <span class="flex items-center gap-0.5">
            <button
              type="button"
              class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-panel-3 hover:text-content"
              :aria-label="`${t('battlefield.speedLabel')} -1`"
              @click="emit('adjustSpeed', -1)"
            >
              <Icon name="minus" :size="14" />
            </button>
            <button
              type="button"
              class="flex size-7 items-center justify-center rounded-md text-content-muted hover:bg-panel-3 hover:text-content"
              :aria-label="`${t('battlefield.speedLabel')} +1`"
              @click="emit('adjustSpeed', 1)"
            >
              <Icon name="plus" :size="14" />
            </button>
          </span>
        </template>
        <span v-else class="text-[22px] font-bold leading-tight text-content-muted">—</span>
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

    <BusinessBattlefieldDeathSavesSection
      v-if="unit.hp.current === 0"
      :successes="unit.deathSaves.successes"
      :failures="unit.deathSaves.failures"
      @set-success="(value) => emit('setDeathSaveSuccesses', value)"
      @set-failure="(value) => emit('setDeathSaveFailures', value)"
      @roll="emit('rollDeathSave')"
    />

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
          class="h-7 rounded-md border border-panel-border bg-canvas-inset px-2 text-xs outline-none focus:border-primary"
          :aria-label="t('battlefield.conditionSelectAria')"
        >
          <option v-for="key in CONDITION_KEYS" :key="key" :value="key">
            {{ t(`combat.condition.${key}`) }}
          </option>
        </select>
        <input
          v-model="conditionDraftNote"
          type="text"
          class="h-7 min-w-24 flex-1 rounded-md border border-panel-border bg-canvas-inset px-2 text-xs outline-none focus:border-primary"
          :placeholder="t('battlefield.conditionNotePlaceholder')"
          :aria-label="t('battlefield.conditionNotePlaceholder')"
          @keydown.enter="onApplyCondition"
        />
        <CommonAppButton
          type="button"
          variant="neutral"
          size="xs"
          :disabled="atConditionCap"
          :title="atConditionCap ? t('battlefield.conditionCapReached') : undefined"
          @click="onApplyCondition"
        >
          ＋{{ t('battlefield.applyCondition') }}
        </CommonAppButton>
      </div>
    </div>

    <div v-if="unit.attacks.length > 0" class="flex flex-col gap-1.5">
      <h3 class="text-[11px] tracking-wide text-content-muted">
        {{ t('battlefield.attacksTitle') }}
      </h3>
      <ul class="flex flex-col gap-1.5">
        <BusinessBattlefieldUnitAttackRow
          v-for="attackEntry in unit.attacks"
          :key="attackEntry.id"
          :attack="attackEntry"
          @roll-hit="(mode) => emit('rollAttackHit', attackEntry, mode)"
          @roll-damage="(isCritical) => emit('rollAttackDamage', attackEntry, isCritical)"
        />
      </ul>
    </div>

    <div v-if="hasSkills" class="flex flex-col gap-1.5">
      <h3 class="text-[11px] tracking-wide text-content-muted">
        {{ t('battlefield.skillsTitle') }}
      </h3>
      <BusinessBattlefieldUnitSkillList
        :skills="unit.skills"
        @roll="(key, mode) => emit('rollSkill', key, mode)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import {
  BATTLEFIELD_LIMITS,
  CHARACTER_TEXT_LIMITS,
  CONDITION_KEYS,
  VALIDATION_LIMITS,
} from '@rolling-dice-app/core'
import type {
  BattlefieldAttackEntry,
  BattlefieldFaction,
  BattlefieldUnit,
  ClassKey,
  ConditionKey,
  SkillKey,
} from '@rolling-dice-app/core'
import type { RollMode } from '~/types/business/dice'
import { FACTION_ORDER } from '~/constants/battlefield'

/** 與 store 端 renameUnit 的截斷上限一致（core caps） */
const UNIT_NAME_MAX_LENGTH = CHARACTER_TEXT_LIMITS.SHORT

const { t } = useI18n()

const props = defineProps<{
  unit: BattlefieldUnit
  /** 當前行動者 */
  isActive: boolean
}>()

const classLabelOf = (key: ClassKey) => t(`class.label.${key}`)

// character 由快照 race/classes 組「種族 主職業 Lv.總等級」；monster 顯示 CR、adhoc 無補充
const unitTitle = computed(() => {
  if (props.unit.kind === 'character')
    return formatCharacterTitle(props.unit.race, props.unit.classes, classLabelOf)
  if (props.unit.kind === 'monster') return formatChallengeRating(props.unit.challengeRating)
  return ''
})

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
  adjustSpeed: [delta: number]
  setInitiative: [value: number | null]
  adjustInitiative: [delta: number]
  rollInitiative: []
  addCondition: [key: ConditionKey, note: string | null]
  removeCondition: [conditionId: string]
  setDeathSaveSuccesses: [value: number]
  setDeathSaveFailures: [value: number]
  rollDeathSave: []
  rollAttackHit: [attack: BattlefieldAttackEntry, mode: RollMode]
  rollAttackDamage: [attack: BattlefieldAttackEntry, isCritical: boolean]
  rollSkill: [key: SkillKey, mode: RollMode]
}>()

const hasSkills = computed(() => Object.keys(props.unit.skills).length > 0)

// 有效值＝快照基準＋臨時調整（調整值模型）；badge 顯示調整量
const unitEffectiveAc = computed(() => effectiveAc(props.unit))
const unitEffectiveMaxHp = computed(() => effectiveMaxHp(props.unit))

// 有效速度＝快照＋調整（夾 0）；speed 為 null（adhoc 未填）時整卡顯示 em dash
const effectiveSpeed = computed(() =>
  props.unit.speed == null ? null : Math.max(0, props.unit.speed + props.unit.speedAdjustment),
)

const atConditionCap = computed(
  () => props.unit.conditions.length >= VALIDATION_LIMITS.maxConditionsPerBattlefieldUnit,
)

const currentHpClass = computed(() => {
  const tier = hpRatioTier(props.unit.hp.current, unitEffectiveMaxHp.value)
  if (tier === 'crit') return 'text-danger-hover'
  if (tier === 'low') return 'text-warning'
  return 'text-content'
})

/**
 * 名稱與先攻皆為未受控 input（`:value` + `@change`）。store 會 trim / clamp / 截斷，
 * 結果與現值相同時 Vue 不會 patch DOM，輸入框會殘留使用者打的原始內容。
 * 兩者都在提交後把正規值寫回 DOM。
 */
const onNameChange = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const value = input.value.trim()
  // 空值不提交；store 另會截斷到 SHORT 上限，故一律以截斷後的值回寫
  if (value) emit('rename', value.slice(0, UNIT_NAME_MAX_LENGTH))
  input.value = value ? value.slice(0, UNIT_NAME_MAX_LENGTH) : props.unit.name
}

const onInitiativeChange = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const next = parseIntegerInput(input.value, undefined, BATTLEFIELD_LIMITS.UNIT_INITIATIVE_ABS_MAX)
  emit('setInitiative', next)
  input.value = next == null ? '' : String(next)
}

// ── 狀態新增 ─────────────────────────────────────────────────────────────────
const conditionDraftKey = ref<ConditionKey>(CONDITION_KEYS[0] ?? 'blinded')
const conditionDraftNote = ref('')

const onApplyCondition = (): void => {
  if (atConditionCap.value) return
  const note = conditionDraftNote.value.trim()
  emit('addCondition', conditionDraftKey.value, note === '' ? null : note)
  conditionDraftNote.value = ''
}
</script>
