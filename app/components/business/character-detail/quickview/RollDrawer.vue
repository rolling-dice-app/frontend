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
    bg-color="var(--color-panel)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
  >
    <div class="flex h-full min-h-0 flex-col gap-3">
      <!-- 上 2/3：觸發區（單一大滾動容器） -->
      <div class="min-h-0 grow basis-2/3 space-y-4 overflow-y-auto pr-1">
        <section aria-labelledby="roll-section-initiative">
          <h3
            id="roll-section-initiative"
            class="mb-1.5 font-display text-sm font-bold text-content"
          >
            {{ t('combat.initiative') }}
          </h3>
          <ul class="grid grid-cols-2 gap-1.5">
            <BusinessCharacterDetailQuickviewRollTriggerRow
              :label="t('combat.initiative')"
              :modifier="totalInitiative"
              @roll="
                (mode: RollMode) =>
                  handleD20Roll('initiative', t('combat.initiative'), totalInitiative, mode)
              "
            />
          </ul>
        </section>

        <section aria-labelledby="roll-section-ability">
          <h3 id="roll-section-ability" class="mb-1.5 font-display text-sm font-bold text-content">
            {{ t('combat.abilityCheck') }}
          </h3>
          <ul class="grid grid-cols-2 gap-1.5">
            <BusinessCharacterDetailQuickviewRollTriggerRow
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
            <BusinessCharacterDetailQuickviewRollTriggerRow
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
            <BusinessCharacterDetailQuickviewRollTriggerRow
              v-for="row in skillRows"
              :key="row.key"
              :label="row.label"
              :modifier="row.modifier"
              @roll="(mode: RollMode) => handleD20Roll('skill', row.label, row.modifier, mode)"
            />
          </ul>
        </section>

        <section v-if="hitDieRows.length > 0" aria-labelledby="roll-section-hit-die">
          <h3 id="roll-section-hit-die" class="mb-1.5 font-display text-sm font-bold text-content">
            {{ t('class.hitDie') }}
          </h3>
          <ul class="grid grid-cols-2 gap-1.5">
            <BusinessCharacterDetailQuickviewRollTriggerRow
              v-for="row in hitDieRows"
              :key="row.classKey"
              :label="row.label"
              :modifier="conModifier"
              :disabled="row.isExhausted"
              :modes="['normal']"
              @roll="() => handleHitDieRoll(row)"
            />
          </ul>
        </section>

        <section v-if="character.attacks.length > 0" aria-labelledby="roll-section-attack">
          <h3 id="roll-section-attack" class="mb-1.5 font-display text-sm font-bold text-content">
            {{ t('combat.attack') }}
          </h3>
          <ul class="space-y-1.5">
            <BusinessCharacterDetailQuickviewRollAttackRow
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

      <!-- 下 1/3：單骰 bar + output -->
      <div class="flex min-h-0 grow basis-1/3 flex-col gap-2">
        <BusinessCharacterDetailQuickviewRollAdHocBar @roll="handleAdHocRoll" />
        <div class="min-h-0 flex-1">
          <BusinessCharacterDetailQuickviewRollOutputList :entries="entries" @clear="clear" />
        </div>
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { Drawer, Icon } from '@ui'
import { rollD20, rollDice, rollDie } from '~/helpers/dice'
import { CLASS_CONFIG } from '~/constants/dnd'
import {
  ABILITY_KEYS,
  type AttackEntry,
  type CharacterDTO,
  type AbilityKey,
  type ClassKey,
} from '@rolling-dice-app/core'
import type { TotalAbilityScores } from '~/types/business/character-form'
import type {
  D100RollEntry,
  D20RollEntry,
  DamageRollEntry,
  DamageRollLine,
  HitDieRollEntry,
  RawRollEntry,
  RollMode,
} from '~/types/business/dice'
import type { AdHocRollRequest } from './RollAdHocBar.vue'

const { t } = useI18n()

const props = defineProps<{
  character: CharacterDTO
  abilityScores: TotalAbilityScores
  proficiencyBonus: number
  savingThrowProficiencies: AbilityKey[]
  savingThrowAdjustments: Partial<Record<AbilityKey, number>>
  hitDiceUsed: Partial<Record<ClassKey, number>>
  totalInitiative: number
  onHealFromHitDie: (amount: number) => void
  onConsumeHitDie: (classKey: ClassKey, level: number) => void
}>()

const isOpen = ref(false)
const { entries, push, clear } = useDiceRollLog()

watch(
  () => props.character.id,
  () => {
    clear()
  },
)

const abilityRows = computed(() =>
  ABILITY_KEYS.map((key) => ({
    key,
    label: t(`ability.${key}`),
    modifier: getAbilityModifier(props.abilityScores[key]),
  })),
)

const savingThrowRows = computed(() => {
  const bonuses = calculateSavingThrowBonuses({
    abilityScores: props.abilityScores,
    proficiencies: props.savingThrowProficiencies,
    proficiencyBonus: props.proficiencyBonus,
    adjustments: props.savingThrowAdjustments,
  })
  return ABILITY_KEYS.map((key) => ({ key, label: t(`ability.${key}`), modifier: bonuses[key] }))
})

const conModifier = computed(() => getAbilityModifier(props.abilityScores.constitution))

const hitDieRows = computed(() =>
  props.character.classes.map((entry) => {
    const sides = CLASS_CONFIG[entry.classKey].hitDie
    const used = props.hitDiceUsed[entry.classKey] ?? 0
    return {
      classKey: entry.classKey,
      sides,
      level: entry.level,
      label: `${t(`class.label.${entry.classKey}`)} / d${sides}`,
      isExhausted: used >= entry.level,
    }
  }),
)

const skillRows = computed(() =>
  calculateSkillBonuses({
    abilityScores: props.abilityScores,
    skills: props.character.skills,
    proficiencyBonus: props.proficiencyBonus,
    isJackOfAllTrades: props.character.isJackOfAllTrades,
  }).map(({ key, bonus }) => ({ key, label: t(`skill.${key}`), modifier: bonus })),
)

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

type HitDieRow = {
  classKey: ClassKey
  sides: number
  level: number
  label: string
  isExhausted: boolean
}

const handleHitDieRoll = (row: HitDieRow): void => {
  if (row.isExhausted) return
  const modifier = conModifier.value
  const roll = rollDie(row.sides)
  const healed = Math.max(0, roll + modifier)
  props.onConsumeHitDie(row.classKey, row.level)
  if (healed > 0) props.onHealFromHitDie(healed)
  push({
    kind: 'hit-die',
    label: row.label,
    classKey: row.classKey,
    sides: row.sides,
    roll,
    modifier,
    healed,
  } satisfies Omit<HitDieRollEntry, 'id' | 'rolledAt'>)
}

const handleAdHocRoll = (request: AdHocRollRequest): void => {
  if (request.kind === 'raw') {
    const roll = rollDie(request.sides)
    push({
      kind: 'raw',
      label: `d${request.sides}`,
      sides: request.sides,
      roll,
    } satisfies Omit<RawRollEntry, 'id' | 'rolledAt'>)
    return
  }
  // d100: 兩顆 d10（rollDie 回 1~10，10 視為 0）；雙 0 = 100
  const tens = rollDie(10) % 10
  const ones = rollDie(10) % 10
  const total = tens === 0 && ones === 0 ? 100 : tens * 10 + ones
  push({
    kind: 'd100',
    label: 'd100',
    tens,
    ones,
    total,
  } satisfies Omit<D100RollEntry, 'id' | 'rolledAt'>)
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
