<template>
  <div class="space-y-8 bg-canvas-elevated p-4">
    <section
      class="flex flex-col-reverse sm:flex-row items-start gap-8"
      aria-labelledby="section-basic"
    >
      <div class="flex-1 flex flex-col gap-4">
        <!-- 角色資訊 -->
        <h2 id="section-basic" class="font-display text-lg font-bold text-content">
          {{ t('character.info') }}
        </h2>
        <dl class="grid grid-cols-5 gap-x-4 gap-y-3">
          <div>
            <dt class="text-xs text-content-muted">{{ t('character.name') }}</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ character.name }}</dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">{{ t('class.level') }}</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ totalLevel }}</dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">{{ t('character.genderLabel') }}</dt>
            <dd class="mt-0.5 text-sm text-content-soft">
              {{
                character.gender
                  ? t(`character.gender.${character.gender}`)
                  : t('character.emptyDash')
              }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">{{ t('character.race') }}</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ raceDisplay }}</dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">{{ t('character.background') }}</dt>
            <dd class="mt-0.5 text-sm text-content-soft">
              {{ character.background ?? t('character.emptyDash') }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">{{ t('character.alignmentLabel') }}</dt>
            <dd class="mt-0.5 text-sm text-content-soft">
              {{
                character.alignment
                  ? t(`character.alignment.${character.alignment}`)
                  : t('character.emptyDash')
              }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">{{ t('character.faith') }}</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ character.faith }}</dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">{{ t('character.age') }}</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ character.age }}</dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">{{ t('character.height') }}</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ character.height }}</dd>
          </div>
          <div>
            <dt class="text-xs text-content-muted">{{ t('character.weight') }}</dt>
            <dd class="mt-0.5 text-sm text-content-soft">{{ character.weight }}</dd>
          </div>
        </dl>
        <!-- 熟練 -->
        <div class="flex flex-col gap-4">
          <h2 id="section-proficiencies" class="font-display text-lg font-bold text-content">
            {{ t('character.proficiencies') }}
          </h2>
          <table class="w-full table-fixed text-sm">
            <thead>
              <tr class="border-b border-border-soft text-left text-xs text-content-muted">
                <th class="pb-2 font-normal">{{ t('character.language') }}</th>
                <th class="pb-2 font-normal">{{ t('character.tool') }}</th>
                <th class="pb-2 font-normal">{{ t('character.weaponProficiency') }}</th>
                <th class="pb-2 font-normal">{{ t('character.armorProficiency') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-border-soft">
                <td class="py-2 pr-4 align-top wrap-break-word text-content-soft">
                  {{ character.languages || t('character.emptyDash') }}
                </td>
                <td class="py-2 pr-4 align-top wrap-break-word text-content-soft">
                  {{ character.tools || t('character.emptyDash') }}
                </td>
                <td class="py-2 pr-4 align-top wrap-break-word text-content-soft">
                  {{ character.weaponProficiencies || t('character.emptyDash') }}
                </td>
                <td class="py-2 pr-4 align-top wrap-break-word text-content-soft">
                  {{ character.armorProficiencies || t('character.emptyDash') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 職業資訊 -->
        <div class="flex flex-col gap-4 flex-1 tabular">
          <h2 id="section-classes" class="font-display text-lg font-bold text-content">
            {{ t('class.className') }}
          </h2>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border-soft text-left text-xs text-content-muted">
                <th class="pb-2 pr-2 font-normal">{{ t('class.className') }}</th>
                <th class="pb-2 pr-2 font-normal text-right">{{ t('class.level') }}</th>
                <th class="pb-2 pr-2 font-normal text-right">{{ t('class.hitDie') }}</th>
                <th class="pb-2 pr-2 font-normal text-right">{{ t('combat.hp') }}</th>
                <th class="pb-2 font-normal text-right">{{ t('ability.constitution') }}</th>
                <th class="pb-2 font-normal text-right">{{ t('combat.tough') }}</th>
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
                <td class="pt-2 pr-2">{{ t('character.total') }}</td>
                <td class="pt-2 pr-2 text-right">{{ totalLevel }}</td>
                <td class="pt-2 pr-2 text-right">{{ t('character.emptyDash') }}</td>
                <td class="pt-2 pr-2 text-right">{{ t('combat.extraHpShort') }}</td>
                <td class="pt-2 text-right">{{ character.customHpBonus }}</td>
                <td class="pt-2 text-right">{{ totalHp }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div class="sm:w-1/4 md:w-1/3 w-full">
        <div
          class="aspect-3/4 w-full overflow-hidden border border-primary rounded-md bg-canvas-inset"
        >
          <img
            v-if="character.avatar"
            :src="character.avatar"
            :alt="`${t('character.portrait.label')} ${character.name}`"
            class="h-full w-full object-cover"
            loading="lazy"
          />
          <div
            v-else
            class="h-full w-full flex flex-col items-center justify-center gap-1 px-3 text-center text-xs text-content-muted"
            :aria-label="t('character.portrait.placeholderEmpty')"
          >
            <span>{{ t('character.portrait.placeholderEmpty') }}</span>
          </div>
        </div>
      </div>
    </section>

    <div class="flex flex-col sm:flex-row gap-4">
      <!-- 屬性與豁免 -->
      <div class="flex flex-col flex-1 sm:w-1/2 gap-4">
        <section aria-labelledby="section-abilities-saves">
          <div class="flex flex-col gap-4">
            <h2 id="section-abilities-saves" class="font-display text-lg font-bold text-content">
              {{ t('character.abilitiesAndSaves') }}
            </h2>
            <div class="grid grid-cols-3 gap-3 tabular">
              <div
                v-for="key in ABILITY_KEYS"
                :key="key"
                class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3"
              >
                <span
                  class="text-xs text-content-muted"
                  :class="{ 'text-primary': savingThrowProficiencies.includes(key) }"
                >
                  {{ t(`ability.${key}`) }}
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
                  {{ t('combat.savingThrow') }}
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
            {{ t('character.otherAbilities') }}
          </h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 tabular">
            <div
              class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3"
            >
              <span class="text-xs text-content-muted">{{ t('combat.acValue') }}</span>
              <span class="mt-1 text-2xl font-bold text-content">{{ baseAC }}</span>
            </div>
            <div
              class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3"
            >
              <span class="text-xs text-content-muted">{{ t('combat.initiative') }}</span>
              <span class="mt-1 text-2xl font-bold" :class="modifierTextColor(totalInitiative)">
                {{ formatModifier(totalInitiative) }}
              </span>
            </div>
            <div
              class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3"
            >
              <span class="text-xs text-content-muted">{{ t('combat.speed') }}</span>
              <span class="mt-1 text-2xl font-bold text-content"
                >30
                <span class="text-xs font-normal text-content-muted">
                  {{ t('combat.unitFeet') }}
                </span>
              </span>
            </div>
            <div
              class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3"
            >
              <span class="text-xs text-content-muted">{{ t('combat.passivePerception') }}</span>
              <span class="mt-1 text-2xl font-bold text-content">{{ passivePerception }}</span>
            </div>
            <div
              class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3"
            >
              <span class="text-xs text-content-muted">{{ t('combat.passiveInsight') }}</span>
              <span class="mt-1 text-2xl font-bold text-content">{{ passiveInsight }}</span>
            </div>
            <div
              class="flex flex-col items-center rounded-lg border border-border-soft bg-surface p-3"
            >
              <span class="text-xs text-content-muted">{{ t('combat.proficiencyBonus') }}</span>
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
          {{ t('character.skillProficienciesTitle') }}
        </h2>
        <div class="grid grid-cols-2 grid-rows-9 grid-flow-col gap-x-6 gap-y-2 tabular">
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
        {{ t('character.backgroundStory') }}
      </h2>
      <div class="whitespace-pre-line wrap-break-word text-sm text-content-soft">
        {{ character.story || t('character.emptyParenthesized') }}
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  ABILITY_KEYS,
  getClassHitPoints,
  type ProficiencyLevel,
  type SharedCharacterProfileDTO,
} from '@rolling-dice-app/core'
import { useCharacterDerivedStatsFromCharacter } from '~/composables/domain/useCharacterDerivedStats'
import { CLASS_CONFIG } from '~/constants/dnd'

const { t, messages } = useI18n()

const props = defineProps<{
  character: SharedCharacterProfileDTO
}>()

const raceDisplay = computed(() => {
  const { race, subrace } = props.character
  if (!race) return t('character.emptyDash')
  return subrace ? `${race}（${subrace}）` : race
})

// ─── Ability Computed ──────────────────────────────────────────────────────

const conModifier = computed(() =>
  getAbilityModifier(getTotalScore(props.character.abilities.constitution)),
)

const characterRef = computed(() => props.character)

const {
  totalLevel,
  totalAbilityScores,
  proficiencyBonus,
  savingThrowProficiencies,
  totalHp,
  totalArmorClass: baseAC,
  totalInitiative,
  totalPassivePerception: passivePerception,
  totalPassiveInsight: passiveInsight,
} = useCharacterDerivedStatsFromCharacter(characterRef)

const classHpRows = computed(() =>
  props.character.classes.map((entry, index) => {
    const config = CLASS_CONFIG[entry.classKey]
    const hp = getClassHitPoints(config.hitDie, entry.level, index === 0)
    const conBonus = conModifier.value * entry.level
    const subclassLabels = messages.value.class.subclass[entry.classKey]
    return {
      classKey: entry.classKey,
      label: t(`class.label.${entry.classKey}`),
      subclassLabel: entry.subclass === null ? null : (subclassLabels[entry.subclass] ?? null),
      level: entry.level,
      hitDie: config.hitDie,
      hp,
      conBonus,
    }
  }),
)

const savingThrowBonuses = computed(() =>
  calculateSavingThrowBonuses({
    abilityScores: totalAbilityScores.value,
    proficiencies: savingThrowProficiencies.value,
    proficiencyBonus: proficiencyBonus.value,
  }),
)

// ─── Skill Computed ────────────────────────────────────────────────────────

const skillList = computed(() =>
  calculateSkillBonuses({
    abilityScores: totalAbilityScores.value,
    skills: props.character.skills,
    proficiencyBonus: proficiencyBonus.value,
    isJackOfAllTrades: props.character.isJackOfAllTrades,
  }).map(({ key, abilityKey, proficiency, bonus }) => ({
    key,
    name: t(`skill.label.${key}`),
    proficiency,
    bonus,
    abilityName: t(`ability.${abilityKey}`),
  })),
)

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
