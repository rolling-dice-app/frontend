<template>
  <!-- 右側邊緣 hint 條 -->
  <button
    type="button"
    :aria-label="t('combat.openRollPanel')"
    aria-haspopup="dialog"
    :aria-expanded="isOpen"
    class="fixed right-0 top-1/2 z-30 flex flex-col -translate-y-1/2 cursor-pointer items-center gap-2 rounded-l-md border border-r-0 border-border-soft bg-panel-2 px-3 pt-2 pb-1 text-content-muted shadow-md transition-colors hover:bg-panel hover:text-content focus-visible:outline-2 focus-visible:outline-ring"
    @click="isOpen = true"
  >
    <Icon name="dice" :size="32" />
    <span class="text-xs font-medium">{{ t('combat.roll') }}</span>
  </button>

  <Drawer
    v-model="isOpen"
    placement="right"
    size="lg"
    :title="t('combat.roll')"
    bg-color="var(--rd--color-panel)"
    text-color="var(--rd--color-text)"
    border-color="var(--rd--color-border)"
  >
    <div class="flex h-full min-h-0 flex-col gap-3">
      <!-- 上 2/3：觸發區（單一大滾動容器） -->
      <div class="min-h-0 grow basis-2/3 space-y-4 overflow-y-auto pr-1">
        <section aria-labelledby="roll-section-ability">
          <h3 id="roll-section-ability" class="mb-1.5 font-display text-sm font-bold text-content">
            {{ t('combat.abilityCheck') }}
          </h3>
          <ul class="grid grid-cols-2 gap-1.5">
            <BusinessCharacterQuickviewRollTriggerRow
              v-for="row in abilityRows"
              :key="row.key"
              :label="row.label"
              :modifier="row.modifier"
              @roll="(mode: RollMode) => handleD20Roll('ability', row.label, row.modifier, mode)"
            />
          </ul>
        </section>

        <section aria-labelledby="roll-section-save">
          <h3 id="roll-section-save" class="mb-1.5 font-display text-sm font-bold text-content">
            {{ t('combat.savingThrowCheck') }}
          </h3>
          <ul class="grid grid-cols-2 gap-1.5">
            <BusinessCharacterQuickviewRollTriggerRow
              v-for="row in savingThrowRows"
              :key="row.key"
              :label="row.label"
              :modifier="row.modifier"
              @roll="
                (mode: RollMode) => handleD20Roll('saving-throw', row.label, row.modifier, mode)
              "
            />
          </ul>
        </section>

        <section aria-labelledby="roll-section-skill">
          <h3 id="roll-section-skill" class="mb-1.5 font-display text-sm font-bold text-content">
            {{ t('combat.skillCheck') }}
          </h3>
          <ul class="grid grid-cols-2 gap-1.5">
            <BusinessCharacterQuickviewRollTriggerRow
              v-for="row in skillRows"
              :key="row.key"
              :label="row.label"
              :modifier="row.modifier"
              @roll="(mode: RollMode) => handleD20Roll('skill', row.label, row.modifier, mode)"
            />
          </ul>
        </section>

        <section v-if="character.attacks.length > 0" aria-labelledby="roll-section-attack">
          <h3 id="roll-section-attack" class="mb-1.5 font-display text-sm font-bold text-content">
            {{ t('combat.attack') }}
          </h3>
          <ul class="space-y-1.5">
            <BusinessCharacterQuickviewRollAttackRow
              v-for="attack in character.attacks"
              :key="attack.id"
              :attack="attack"
              :ability-scores="abilityScores"
              :proficiency-bonus="proficiencyBonus"
              @roll-hit="(mode: RollMode) => handleAttackHit(attack, mode)"
              @roll-damage="(isCritical: boolean) => handleAttackDamage(attack, isCritical)"
            />
          </ul>
        </section>
      </div>

      <!-- 下 1/3：output -->
      <div class="min-h-0 grow basis-1/3">
        <BusinessCharacterQuickviewRollOutputList :entries="entries" @clear="clear" />
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { Drawer, Icon } from '@ui'
import { ABILITY_NAMES, SKILL_NAMES, SKILL_TO_ABILITY_MAP } from '~/constants/dnd'
import { rollD20, rollDice } from '~/helpers/dice'
import {
  ABILITY_KEYS,
  type AttackEntry,
  type CharacterDTO,
  type AbilityKey,
  type ProficiencyLevel,
} from '@rolling-dice-app/core'
import type { TotalAbilityScores } from '~/types/business/character-form'
import type { D20RollEntry, DamageRollEntry, DamageRollLine, RollMode } from '~/types/business/dice'

const { t } = useI18n()

const props = defineProps<{
  character: CharacterDTO
  abilityScores: TotalAbilityScores
  proficiencyBonus: number
  savingThrowProficiencies: AbilityKey[]
  savingThrowAdjustments: Partial<Record<AbilityKey, number>>
}>()

const isOpen = ref(false)
const { entries, push, clear } = useDiceRollLog()

watch(
  () => props.character.id,
  () => {
    clear()
  },
)

const proficiencySet = computed(() => new Set(props.savingThrowProficiencies))

const abilityRows = computed(() =>
  ABILITY_KEYS.map((key) => ({
    key,
    label: ABILITY_NAMES[key],
    modifier: getAbilityModifier(props.abilityScores[key]),
  })),
)

const savingThrowRows = computed(() =>
  ABILITY_KEYS.map((key) => {
    const mod = getAbilityModifier(props.abilityScores[key])
    const base = getSavingThrowBonus(mod, proficiencySet.value.has(key), props.proficiencyBonus)
    const adjustment = props.savingThrowAdjustments[key] ?? 0
    return {
      key,
      label: ABILITY_NAMES[key],
      modifier: base + adjustment,
    }
  }),
)

const skillRows = computed(() => {
  const jackBonus = props.character.isJackOfAllTrades ? Math.floor(props.proficiencyBonus / 2) : 0
  return (Object.entries(SKILL_NAMES) as [keyof typeof SKILL_NAMES, string][]).map(
    ([key, name]) => {
      const abilityKey = SKILL_TO_ABILITY_MAP[key]
      const mod = getAbilityModifier(props.abilityScores[abilityKey])
      const proficiency: ProficiencyLevel = props.character.skills[key] ?? 'none'
      const base = getSkillBonus(mod, proficiency, props.proficiencyBonus)
      const modifier = proficiency === 'none' ? base + jackBonus : base
      return { key, label: name, modifier }
    },
  )
})

const handleD20Roll = (
  kind: D20RollEntry['kind'],
  label: string,
  modifier: number,
  mode: RollMode,
): void => {
  const { rolls, chosen } = rollD20(mode)
  push({
    kind,
    label,
    mode,
    rolls,
    chosen,
    modifier,
    total: chosen + modifier,
    isCritical: chosen === 20,
    isFumble: chosen === 1,
  } satisfies Omit<D20RollEntry, 'id' | 'rolledAt'>)
}

const handleAttackHit = (attack: AttackEntry, mode: RollMode): void => {
  const modifier = getAttackHit(attack, props.abilityScores, props.proficiencyBonus)
  handleD20Roll(
    'attack-hit',
    `${attack.name || t('combat.attack')} ${t('combat.hitBonus')}`,
    modifier,
    mode,
  )
}

const handleAttackDamage = (attack: AttackEntry, isCritical: boolean): void => {
  const abilityMod =
    attack.abilityKey != null && attack.applyAbilityToDamage
      ? getAbilityModifier(props.abilityScores[attack.abilityKey])
      : 0

  const lines: DamageRollLine[] = attack.damageDice.map((entry, idx) => {
    const totalBonus = (entry.bonus ?? 0) + (idx === 0 ? abilityMod : 0)
    if (entry.dieType == null || entry.count <= 0) {
      return {
        rolls: [],
        sides: null,
        count: 0,
        bonus: totalBonus,
        damageType: entry.damageType,
        subtotal: totalBonus,
      }
    }
    const sides = entry.dieType
    const count = isCritical ? entry.count * 2 : entry.count
    const rolls = rollDice(count, sides)
    const subtotal = rolls.reduce((s, r) => s + r, 0) + totalBonus
    return {
      rolls,
      sides,
      count,
      bonus: totalBonus,
      damageType: entry.damageType,
      subtotal,
    }
  })

  const renderable = lines.filter((l) => l.sides != null || l.bonus !== 0)
  if (renderable.length === 0) return

  const total = renderable.reduce((s, l) => s + l.subtotal, 0)
  push({
    kind: 'attack-damage',
    label: `${attack.name || t('combat.attack')} ${t('combat.damage')}`,
    lines: renderable,
    total,
    isCritical,
  } satisfies Omit<DamageRollEntry, 'id' | 'rolledAt'>)
}
</script>
