<template>
  <div class="space-y-8 bg-canvas-elevated p-4">
    <section
      class="flex flex-col-reverse sm:flex-row items-start gap-8"
      aria-labelledby="section-basic"
    >
      <div class="flex-1 flex flex-col gap-4">
        <!-- 角色資訊 -->
        <h2 id="section-basic" class="font-display text-lg font-bold text-content">角色資訊</h2>
        <dl class="grid grid-cols-5 gap-x-4 gap-y-3">
          <div>
            <dt class="text-xs text-content-muted">姓名</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ character.name }}</dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">等級</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ totalLevel }}</dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">性別</dt>
            <dd class="mt-0.5 text-sm text-content-soft">
              {{ character.gender ? GENDER_NAMES[character.gender] : '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">種族</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ raceDisplay }}</dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">背景</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ character.background ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">陣營</dt>
            <dd class="mt-0.5 text-sm text-content-soft">
              {{ character.alignment ? ALIGNMENT_NAMES[character.alignment] : '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">信仰</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ character.faith }}</dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">年齡</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ character.age }}</dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">身高</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ character.height }}</dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">體重</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ character.weight }}</dd>
          </div>
        </dl>
        <!-- 熟練 -->
        <div class="flex flex-col gap-4">
          <h2 id="section-proficiencies" class="font-display text-lg font-bold text-content">
            熟練
          </h2>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border-soft text-left text-xs text-content-muted">
                <th class="pb-2 font-normal">語言</th>
                <th class="pb-2 font-normal">工具</th>
                <th class="pb-2 font-normal">武器</th>
                <th class="pb-2 font-normal">護甲</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-border-soft">
                <td class="py-2 text-content-soft">{{ character.languages || '—' }}</td>
                <td class="py-2 text-content-soft">{{ character.tools || '—' }}</td>
                <td class="py-2 text-content-soft">{{ character.weaponProficiencies || '—' }}</td>
                <td class="py-2 text-content-soft">{{ character.armorProficiencies || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 職業資訊 -->
        <div class="flex flex-col gap-4 flex-1">
          <h2 id="section-classes" class="font-display text-lg font-bold text-content">職業</h2>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border-soft text-left text-xs text-content-muted">
                <th class="pb-2 pr-2 font-normal">職業</th>
                <th class="pb-2 pr-2 font-normal text-right">等級</th>
                <th class="pb-2 pr-2 font-normal text-right">生命骰</th>
                <th class="pb-2 pr-2 font-normal text-right">生命值</th>
                <th class="pb-2 font-normal text-right">體質</th>
                <th class="pb-2 font-normal text-right">健壯</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in classHpRows"
                :key="row.classKey"
                class="border-b border-border-soft"
              >
                <td class="py-2 pr-2 text-content-soft">
                  <div class="flex items-center gap-1.5">
                    <img
                      v-if="CLASS_IMAGES[row.classKey]"
                      :src="CLASS_IMAGES[row.classKey]"
                      alt=""
                      class="size-4"
                      loading="lazy"
                      decoding="async"
                    />
                    <span>{{ row.label }}</span>
                    <span
                      v-if="row.subclassLabel"
                      class="text-xs text-content-muted hidden xs:inline"
                    >
                      （{{ row.subclassLabel }}）
                    </span>
                  </div>
                </td>
                <td class="py-2 pr-2 text-right text-content-soft">{{ row.level }}</td>
                <td class="py-2 pr-2 text-right text-content-soft">d{{ row.hitDie }}</td>
                <td class="py-2 pr-2 text-right text-content-soft">{{ row.hp }}</td>
                <td class="py-2 text-right text-content-soft">{{ row.conBonus }}</td>
                <td class="py-2 text-right text-content-soft">
                  {{ character.isTough ? row.level * 2 : '-' }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="font-bold text-content">
                <td class="pt-2 pr-2">合計</td>
                <td class="pt-2 pr-2 text-right">{{ totalLevel }}</td>
                <td class="pt-2 pr-3 text-right">—</td>
                <td class="pt-2 text-right" colspan="3">{{ totalHp }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <!-- TODO: 頭像 / 角色圖像區塊，待實作 -->
      <div class="sm:w-1/4 md:w-1/3 border border-primary h-100 w-full"></div>
    </section>

    <div class="flex flex-col sm:flex-row gap-4">
      <!-- 屬性與豁免 -->
      <div class="flex flex-col flex-1 sm:w-1/2 gap-4">
        <section aria-labelledby="section-abilities-saves">
          <div class="flex flex-col gap-4">
            <h2 id="section-abilities-saves" class="font-display text-lg font-bold text-content">
              屬性與豁免
            </h2>
            <div class="grid grid-cols-3 gap-3">
              <div
                v-for="key in ABILITY_KEYS"
                :key="key"
                class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3"
              >
                <span
                  class="text-xs text-content-muted"
                  :class="{ 'text-primary': savingThrowProficiencies.includes(key) }"
                >
                  {{ ABILITY_NAMES[key] }}
                </span>
                <div class="flex items-center gap-2">
                  <span class="mt-1 text-2xl font-bold text-content">
                    {{ getTotalScore(character.abilities[key]) }}
                  </span>
                  <span
                    class="text-sm"
                    :class="
                      modifierTextColor(getAbilityModifier(getTotalScore(character.abilities[key])))
                    "
                  >
                    {{
                      formatModifier(getAbilityModifier(getTotalScore(character.abilities[key])))
                    }}
                  </span>
                </div>
                <span class="text-xs text-content-soft mt-1">
                  豁免
                  <span :class="modifierTextColor(savingThrowBonuses[key])">
                    {{ formatModifier(savingThrowBonuses[key]) }}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </section>
        <section aria-labelledby="section-other-abilities">
          <h2 id="section-other-abilities" class="font-display text-lg font-bold text-content">
            其他屬性
          </h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            <div
              class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3"
            >
              <span class="text-xs text-content-muted">護甲值</span>
              <span class="mt-1 text-2xl font-bold text-content">{{ baseAC }}</span>
            </div>
            <div
              class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3"
            >
              <span class="text-xs text-content-muted">先攻</span>
              <span class="mt-1 text-2xl font-bold" :class="modifierTextColor(totalInitiative)">
                {{ formatModifier(totalInitiative) }}
              </span>
            </div>
            <div
              class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3"
            >
              <span class="text-xs text-content-muted">移動速度</span>
              <span class="mt-1 text-2xl font-bold text-content"
                >30
                <span class="text-xs font-normal text-content-muted">呎</span>
              </span>
            </div>
            <div
              class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3"
            >
              <span class="text-xs text-content-muted">被動察覺</span>
              <span class="mt-1 text-2xl font-bold text-content">{{ passivePerception }}</span>
            </div>
            <div
              class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3"
            >
              <span class="text-xs text-content-muted">被動洞察</span>
              <span class="mt-1 text-2xl font-bold text-content">{{ passiveInsight }}</span>
            </div>
            <div
              class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3"
            >
              <span class="text-xs text-content-muted">熟練加值</span>
              <span class="mt-1 text-2xl font-bold" :class="modifierTextColor(proficiencyBonus)">
                {{ formatModifier(proficiencyBonus) }}
              </span>
            </div>
          </div>
        </section>
      </div>

      <!-- 技能熟練 -->
      <section class="flex-1 sm:w-1/2" aria-labelledby="section-skills">
        <h2 id="section-skills" class="mb-4 font-display text-lg font-bold text-content">
          技能熟練度
        </h2>
        <div class="grid grid-cols-2 grid-rows-9 grid-flow-col gap-x-6 gap-y-2">
          <div
            v-for="skill in skillList"
            :key="skill.key"
            class="flex items-center justify-between rounded px-3 py-1.5"
          >
            <div class="flex items-center gap-2">
              <span class="size-2 rounded-full" :class="proficiencyDotClass(skill.proficiency)" />
              <span class="text-sm text-content-soft"
                >{{ skill.name }}({{ skill.abilityName }})</span
              >
            </div>
            <span class="text-sm font-bold text-content">
              {{ formatModifier(skill.bonus) }}
            </span>
          </div>
        </div>
      </section>
    </div>

    <!-- ─── 背景故事 ─────────────────────────────────────────────────────── -->
    <section aria-labelledby="section-background">
      <h2 id="section-background" class="mb-4 font-display text-lg font-bold text-content">
        背景故事
      </h2>
      <div class="space-y-3">
        {{ character.story || '（無）' }}
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  ABILITY_KEYS,
  type CharacterDTO,
  type AbilityKey,
  type ProficiencyLevel,
  type SkillKey,
} from '@rolling-dice-app/core'
import type { TotalAbilityScores } from '~/types/business/character-form'
import {
  ABILITY_NAMES,
  ALIGNMENT_NAMES,
  GENDER_NAMES,
  CLASS_CONFIG,
  SKILL_NAMES,
  SKILL_TO_ABILITY_MAP,
} from '~/constants/dnd'
import { SUBCLASS_CONFIG } from '~/constants/subclass'

const props = defineProps<{
  character: CharacterDTO
}>()

const raceDisplay = computed(() => {
  const { race, subrace } = props.character
  if (!race) return '—'
  return subrace ? `${race}（${subrace}）` : race
})

// ─── Ability Computed ──────────────────────────────────────────────────────

const conModifier = computed(() =>
  getAbilityModifier(getTotalScore(props.character.abilities.constitution)),
)

const totalAbilityScores = computed(
  () =>
    Object.fromEntries(
      ABILITY_KEYS.map((key) => [key, getTotalScore(props.character.abilities[key])]),
    ) as TotalAbilityScores,
)

const baseAC = computed(() =>
  getTotalArmorClass(props.character.armorClass, totalAbilityScores.value),
)

const passivePerception = computed(() =>
  calculatePassiveScore({
    abilityModifier: getAbilityModifier(totalAbilityScores.value.wisdom),
    skillLevel: props.character.skills.perception ?? 'none',
    proficiencyBonus: proficiencyBonus.value,
    isJackOfAllTrades: props.character.isJackOfAllTrades,
    extraBonus: props.character.passivePerceptionBonus,
  }),
)

const passiveInsight = computed(() =>
  calculatePassiveScore({
    abilityModifier: getAbilityModifier(totalAbilityScores.value.wisdom),
    skillLevel: props.character.skills.insight ?? 'none',
    proficiencyBonus: proficiencyBonus.value,
    isJackOfAllTrades: props.character.isJackOfAllTrades,
    extraBonus: props.character.passiveInsightBonus,
  }),
)

const totalInitiative = computed(() =>
  calculateTotalInitiative({
    dexModifier: getAbilityModifier(totalAbilityScores.value.dexterity),
    extraAbilityModifier: props.character.initiativeAbilityKey
      ? getAbilityModifier(totalAbilityScores.value[props.character.initiativeAbilityKey])
      : 0,
    initiativeBonus: props.character.initiativeBonus,
  }),
)

const classHpRows = computed(() =>
  props.character.classes.map((entry, index) => {
    const config = CLASS_CONFIG[entry.classKey]
    const hp = getClassHitPoints(config.hitDie, entry.level, index === 0)
    const conBonus = conModifier.value * entry.level
    return {
      classKey: entry.classKey,
      label: config.label,
      subclassLabel:
        entry.subclass === null ? null : (SUBCLASS_CONFIG[entry.classKey][entry.subclass] ?? null),
      level: entry.level,
      hitDie: config.hitDie,
      hp,
      conBonus,
    }
  }),
)

const totalLevel = computed(() => calculateTotalLevel(props.character.classes))

const savingThrowProficiencies = computed<AbilityKey[]>(() => [
  ...calculateSavingThrowProficiencies(props.character.classes),
  ...props.character.savingThrowExtras,
])

const toughBonus = computed(() => (props.character.isTough ? totalLevel.value * 2 : 0))

const totalHp = computed(
  () => classHpRows.value.reduce((sum, row) => sum + row.hp + row.conBonus, 0) + toughBonus.value,
)

const proficiencyBonus = computed(() => getProficiencyBonus(totalLevel.value))

const savingThrowBonuses = computed(() => {
  const result = {} as Record<AbilityKey, number>
  for (const key of ABILITY_KEYS) {
    const mod = getAbilityModifier(getTotalScore(props.character.abilities[key]))
    const proficient = savingThrowProficiencies.value.includes(key)
    result[key] = getSavingThrowBonus(mod, proficient, proficiencyBonus.value)
  }
  return result
})

// ─── Skill Computed ────────────────────────────────────────────────────────

const skillList = computed(() => {
  const jackBonus = props.character.isJackOfAllTrades ? Math.floor(proficiencyBonus.value / 2) : 0
  return (Object.entries(SKILL_NAMES) as [SkillKey, string][]).map(([key, name]) => {
    const abilityKey = SKILL_TO_ABILITY_MAP[key]
    const mod = getAbilityModifier(getTotalScore(props.character.abilities[abilityKey]))
    const proficiency: ProficiencyLevel = props.character.skills[key] ?? 'none'
    const base = getSkillBonus(mod, proficiency, proficiencyBonus.value)
    const bonus = proficiency === 'none' ? base + jackBonus : base
    const abilityName = ABILITY_NAMES[abilityKey]
    return { key, name, proficiency, bonus, abilityName }
  })
})

const modifierTextColor = (value: number): string => {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-content-muted'
}

const proficiencyDotClass = (level: ProficiencyLevel): string => {
  if (level === 'expertise') return 'bg-primary'
  if (level === 'proficient') return 'bg-content-soft'
  return props.character.isJackOfAllTrades ? 'bg-success' : 'bg-border-soft'
}
</script>
