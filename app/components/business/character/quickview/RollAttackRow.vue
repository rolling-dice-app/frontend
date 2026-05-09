<template>
  <li class="rounded-lg border border-border-soft bg-surface px-3 py-2">
    <div class="flex items-center justify-between gap-2">
      <div class="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <p class="text-sm font-semibold text-content">
          {{ attack.name || t('combat.unnamed') }}
        </p>
        <p class="text-xs text-content">
          {{ t('combat.hitBonus') }}
          <span class="font-bold" :class="modifierColor(hitBonus)">
            {{ formatModifier(hitBonus) }}
          </span>
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          :aria-label="`${attack.name || t('combat.attack')} ${t('combat.hitNormal')}`"
          class="flex size-7 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-surface-raised hover:text-content focus-visible:outline-2 focus-visible:outline-ring"
          @click="emit('roll-hit', 'normal')"
        >
          <Icon name="dice" :size="18" />
        </button>
        <button
          type="button"
          :aria-label="`${attack.name || t('combat.attack')} ${t('combat.hitAdvantage')}`"
          class="flex size-7 items-center justify-center rounded-md text-success transition-colors hover:text-success-hover focus-visible:outline-2 focus-visible:outline-ring"
          @click="emit('roll-hit', 'advantage')"
        >
          <Icon name="double-triangle-up" :size="12" />
        </button>
        <button
          type="button"
          :aria-label="`${attack.name || t('combat.attack')} ${t('combat.hitDisadvantage')}`"
          class="flex size-7 items-center justify-center rounded-md text-danger transition-colors hover:text-danger-hover focus-visible:outline-2 focus-visible:outline-ring"
          @click="emit('roll-hit', 'disadvantage')"
        >
          <Icon name="double-triangle-down" :size="12" />
        </button>
      </div>
    </div>

    <div class="my-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <div class="flex min-w-0 flex-1 items-center gap-2 text-xs text-content-muted">
        <span class="min-w-0 wrap-break-word font-bold text-content">{{ damageSummary }}</span>
      </div>
      <div class="ml-auto flex gap-0.5">
        <button
          type="button"
          :aria-label="`${attack.name || t('combat.attack')} ${t('combat.damageNormal')}`"
          class="flex size-7 items-center justify-center rounded-md text-danger transition-colors hover:text-danger-hover focus-visible:outline-2 focus-visible:outline-ring"
          @click="emit('roll-damage', false)"
        >
          <Icon name="sword" :size="14" />
        </button>
        <button
          type="button"
          :aria-label="`${attack.name || t('combat.attack')} ${t('combat.damageCritical')}`"
          class="flex size-7 items-center justify-center rounded-md text-danger transition-colors hover:text-danger-hover focus-visible:outline-2 focus-visible:outline-ring"
          @click="emit('roll-damage', true)"
        >
          <Icon name="double-sword" :size="20" />
        </button>
      </div>
    </div>

    <p v-if="attack.comment" class="line-clamp-2 text-xs whitespace-pre-line text-content-muted">
      {{ attack.comment }}
    </p>
  </li>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import { formatDamageSummary, getAttackHit } from '~/helpers/combat'
import type { AttackEntry } from '@rolling-dice-app/core'
import type { TotalAbilityScores } from '~/types/business/character-form'
import type { RollMode } from '~/types/business/dice'

const { t } = useI18n()

const props = defineProps<{
  attack: AttackEntry
  abilityScores: TotalAbilityScores
  proficiencyBonus: number
}>()

const emit = defineEmits<{
  'roll-hit': [mode: RollMode]
  'roll-damage': [isCritical: boolean]
}>()

const hitBonus = computed(() =>
  getAttackHit(props.attack, props.abilityScores, props.proficiencyBonus),
)

const damageSummary = computed(() => formatDamageSummary(props.attack, props.abilityScores))

const modifierColor = (value: number): string => {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-content-muted'
}
</script>
