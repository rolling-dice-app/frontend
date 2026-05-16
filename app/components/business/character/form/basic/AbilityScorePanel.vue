<template>
  <div class="space-y-4 px-2">
    <h2 class="font-display text-lg font-bold text-content">{{ t('character.abilityScores') }}</h2>
    <!-- Method selector -->
    <div>
      <p class="mb-1 text-xs text-content">{{ t('character.allocationMethod') }}</p>
      <div class="flex gap-2">
        <CommonAppButton
          v-for="method in methods"
          :key="method.key"
          :variant="abilityMethod === method.key ? 'primary' : 'secondary'"
          size="sm"
          class="ability-button"
          @click="emit('update:method', method.key)"
        >
          {{ method.label }}
        </CommonAppButton>
      </div>
    </div>

    <!-- Dice pool (diceRoll mode) -->
    <div v-if="isDiceMode && dicePool.length > 0" class="flex items-center gap-2">
      <ul class="flex flex-1 flex-wrap gap-2" :aria-label="t('character.diceSlot')">
        <li
          v-for="slot in dicePool"
          :key="slot.id"
          class="rounded border px-2 py-1 font-mono text-sm"
          :class="
            slot.assignedTo
              ? 'border-content-muted text-content-muted opacity-60'
              : 'border-primary text-content'
          "
        >
          {{ slot.value }}
        </li>
      </ul>
      <CommonAppButton
        variant="secondary"
        size="sm"
        class="flex shrink-0 items-center gap-2"
        @click="emit('roll:all')"
      >
        <Icon name="dice-20" :size="16" />
        {{ t('character.rerollDice') }}
      </CommonAppButton>
    </div>

    <!-- Ability grid -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <div v-for="key in ABILITY_KEYS" :key="key" class="space-y-1">
        <label :for="`ability-${key}`" class="block text-xs text-content">
          {{ t(`ability.${key}`)
          }}<template v-if="!isDiceMode || diceCells[key].selectedId">
            （{{
              formatModifier(getAbilityModifier(abilities[key].origin + abilities[key].race))
            }}）
          </template>
        </label>

        <!-- Stepper (custom) -->
        <div v-if="!isDiceMode" class="flex items-center gap-1 py-0.5">
          <button
            type="button"
            class="flex items-center justify-center size-6 transition-colors hover:bg-surface-hover disabled:opacity-30"
            :disabled="abilities[key].origin <= CUSTOM_ABILITY_MIN"
            :aria-label="t('character.decreaseScore')"
            @click="adjustAbility(key, -1)"
          >
            <Icon name="minus" :size="16" />
          </button>
          <span :id="`ability-${key}`" class="w-8 text-center font-mono text-lg font-bold">
            {{ abilities[key].origin + abilities[key].race }}
          </span>
          <button
            type="button"
            class="flex items-center justify-center size-6 transition-colors hover:bg-surface-hover disabled:opacity-30"
            :disabled="abilities[key].origin >= CUSTOM_ABILITY_MAX"
            :aria-label="t('character.increaseScore')"
            @click="adjustAbility(key, 1)"
          >
            <Icon name="plus" :size="16" />
          </button>
        </div>

        <!-- Dice Roll: 從骰值池下拉選取 -->
        <CommonAppSelect
          v-else
          :id="`ability-${key}`"
          class="w-full"
          size="sm"
          :placeholder="t('character.unassigned')"
          :model-value="diceCells[key].selectedId"
          :options="diceCells[key].options"
          @update:model-value="onAssign(key, $event)"
        />
      </div>
    </div>

    <!-- Footer: usage indicator + reset button (custom mode) -->
    <div v-if="!isDiceMode" class="flex items-center justify-between">
      <p
        class="text-sm"
        :class="isUsageOver ? 'text-info font-bold' : 'text-content-muted'"
        aria-live="polite"
      >
        {{ usageLabel }}
      </p>
      <CommonAppButton
        variant="secondary"
        size="sm"
        class="flex items-center gap-2"
        @click="emit('reset:abilities')"
      >
        {{ t('character.resetAbilities') }}
      </CommonAppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon, type SelectOption } from '@ui'
import { CUSTOM_ABILITY_MAX, CUSTOM_ABILITY_MIN, POINT_BUY_BUDGET } from '~/constants/dnd'
import type {
  AbilityMethod,
  AbilityScores,
  DiceCell,
  DiceSlot,
} from '~/types/business/character-form'
import { ABILITY_KEYS, type AbilityKey } from '@rolling-dice-app/core'

const { t } = useI18n()

const props = defineProps<{
  abilities: AbilityScores
  abilityMethod: AbilityMethod
  pointBuyUsage: number | null
  dicePool: DiceSlot[]
}>()

const emit = defineEmits<{
  'update:method': [method: AbilityMethod]
  'update:score': [key: AbilityKey, score: number]
  'assign:dice': [key: AbilityKey, slotId: string | null]
  'roll:all': []
  'reset:abilities': []
}>()

const methods = computed<{ key: AbilityMethod; label: string }[]>(() => [
  { key: 'custom', label: t('character.custom') },
  { key: 'diceRoll', label: t('character.diceRoll') },
])

const isDiceMode = computed(() => props.abilityMethod === 'diceRoll')

const usageLabel = computed(() =>
  props.pointBuyUsage === null
    ? t('character.outOfRange')
    : `${t('character.pointUsage')} ${props.pointBuyUsage} / ${POINT_BUY_BUDGET} ${t('character.pointUnit')}`,
)

const isUsageOver = computed(
  () => props.pointBuyUsage === null || props.pointBuyUsage > POINT_BUY_BUDGET,
)

const diceCells = computed<Record<AbilityKey, DiceCell>>(() => {
  const assignedSlotByAbility = new Map<AbilityKey, DiceSlot>()
  for (const slot of props.dicePool) {
    if (slot.assignedTo) assignedSlotByAbility.set(slot.assignedTo, slot)
  }

  const entries = ABILITY_KEYS.map<[AbilityKey, DiceCell]>((key) => {
    const slotOptions: SelectOption[] = props.dicePool.map((slot) => ({
      value: slot.id,
      label: `${slot.value}`,
      disabled: slot.assignedTo !== null && slot.assignedTo !== key,
    }))
    return [
      key,
      {
        selectedId: assignedSlotByAbility.get(key)?.id ?? '',
        options: [{ value: '', label: t('character.unassigned') }, ...slotOptions],
      },
    ]
  })

  return Object.fromEntries(entries) as Record<AbilityKey, DiceCell>
})

const onAssign = (key: AbilityKey, value: string | number | null): void => {
  const slotId = value === '' || value === null ? null : String(value)
  emit('assign:dice', key, slotId)
}

const adjustAbility = (key: AbilityKey, delta: number): void => {
  const current = props.abilities[key].origin
  const next = Math.max(CUSTOM_ABILITY_MIN, Math.min(CUSTOM_ABILITY_MAX, current + delta))
  if (next === current) return
  emit('update:score', key, next)
}
</script>

<style scoped>
:deep(.ability-button) {
  padding: 0.3625rem 1rem;
}
</style>
