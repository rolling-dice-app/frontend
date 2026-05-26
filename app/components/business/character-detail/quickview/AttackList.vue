<template>
  <section aria-labelledby="quickview-attacks-label">
    <h3 id="quickview-attacks-label" class="mb-2 font-display text-sm font-bold text-content">
      {{ t('combat.attackModule') }}
    </h3>
    <p v-if="attacks.length === 0" class="py-6 text-center text-sm text-content-muted">
      {{ t('combat.emptyAttack') }}
    </p>
    <ul v-else class="space-y-2">
      <li
        v-for="attack in attacks"
        :key="attack.id"
        class="rounded-lg border border-border-soft bg-surface px-3 py-2"
      >
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p class="text-sm font-semibold text-content">
            {{ attack.name }}
          </p>
          <p class="text-xs text-content">
            {{ t('combat.hitBonus') }}
            <span
              class="font-bold"
              :class="getHitBonusColorClass(getAttackHit(attack, abilityScores, proficiencyBonus))"
            >
              {{ formatModifier(getAttackHit(attack, abilityScores, proficiencyBonus)) }}
            </span>
          </p>
        </div>
        <p class="my-1 text-xs text-content">
          {{ formatDamageSummary(attack, abilityScores) }}
        </p>
        <p
          v-if="attack.comment"
          class="line-clamp-2 text-xs whitespace-pre-line text-content-muted"
        >
          {{ attack.comment }}
        </p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { AttackEntry } from '@rolling-dice-app/core'
import type { TotalAbilityScores } from '~/types/business/character-form'

const { t } = useI18n()

defineProps<{
  attacks: AttackEntry[]
  abilityScores: TotalAbilityScores
  proficiencyBonus: number
}>()
</script>
