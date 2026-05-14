import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type {
  AbilityKey,
  ArmorClassConfig,
  CharacterAbilityScores,
  CharacterDTO,
  ClassEntry,
  ProficiencyLevel,
} from '@rolling-dice-app/core'
import type { CharacterUpdateFormState, TotalAbilityScores } from '~/types/business/character-form'
import {
  calculatePassiveScore,
  calculateSavingThrowProficiencies,
  calculateTotalAbilityScores,
  calculateTotalHp,
  calculateTotalInitiative,
  calculateTotalLevel,
  calculateTotalSpeed,
  getProficiencyBonus,
  getTotalArmorClass,
} from '~/helpers/character'
import { getAbilityModifier } from '~/helpers/ability'

export interface CharacterDerivedStats {
  totalLevel: ComputedRef<number>
  totalAbilityScores: ComputedRef<TotalAbilityScores>
  proficiencyBonus: ComputedRef<number>
  savingThrowProficiencies: ComputedRef<AbilityKey[]>
  validClasses: ComputedRef<ClassEntry[]>
  totalHp: ComputedRef<number>
  totalArmorClass: ComputedRef<number>
  totalInitiative: ComputedRef<number>
  totalSpeed: ComputedRef<number>
  totalPassivePerception: ComputedRef<number>
  totalPassiveInsight: ComputedRef<number>
}

interface DerivedInputs {
  abilities: ComputedRef<CharacterAbilityScores>
  /** 用於 totalLevel：包含尚未選定 classKey 的草稿條目（form 流程允許） */
  classesForLevel: ComputedRef<ReadonlyArray<{ level: number }>>
  /** 用於 HP / 豁免熟練：僅含已選定 classKey 的條目 */
  validClasses: ComputedRef<ClassEntry[]>
  savingThrowExtras: ComputedRef<readonly AbilityKey[]>
  isTough: ComputedRef<boolean>
  customHpBonus: ComputedRef<number>
  armorClass: ComputedRef<ArmorClassConfig>
  initiativeBonus: ComputedRef<number>
  initiativeAbilityKey: ComputedRef<AbilityKey | null>
  speedBonus: ComputedRef<number>
  skillPerception: ComputedRef<ProficiencyLevel | undefined>
  skillInsight: ComputedRef<ProficiencyLevel | undefined>
  isJackOfAllTrades: ComputedRef<boolean>
  passivePerceptionBonus: ComputedRef<number>
  passiveInsightBonus: ComputedRef<number>
}

const fromFormState = (form: CharacterUpdateFormState): DerivedInputs => ({
  abilities: computed(() => form.abilities),
  classesForLevel: computed(() => form.classes),
  validClasses: computed(() =>
    form.classes.filter((entry): entry is ClassEntry => entry.classKey !== null),
  ),
  savingThrowExtras: computed(() => form.savingThrowExtras),
  isTough: computed(() => form.isTough),
  customHpBonus: computed(() => form.customHpBonus),
  armorClass: computed(() => form.armorClass),
  initiativeBonus: computed(() => form.initiativeBonus),
  initiativeAbilityKey: computed(() => form.initiativeAbilityKey),
  speedBonus: computed(() => form.speedBonus),
  skillPerception: computed(() => form.skills.perception),
  skillInsight: computed(() => form.skills.insight),
  isJackOfAllTrades: computed(() => form.isJackOfAllTrades),
  passivePerceptionBonus: computed(() => form.passivePerceptionBonus),
  passiveInsightBonus: computed(() => form.passiveInsightBonus),
})

const fromCharacter = (character: Ref<CharacterDTO>): DerivedInputs => ({
  abilities: computed(() => character.value.abilities),
  classesForLevel: computed(() => character.value.classes),
  validClasses: computed(() => character.value.classes),
  savingThrowExtras: computed(() => character.value.savingThrowExtras),
  isTough: computed(() => character.value.isTough),
  customHpBonus: computed(() => character.value.customHpBonus),
  armorClass: computed(() => character.value.armorClass),
  initiativeBonus: computed(() => character.value.initiativeBonus),
  initiativeAbilityKey: computed(() => character.value.initiativeAbilityKey),
  speedBonus: computed(() => character.value.speedBonus),
  skillPerception: computed(() => character.value.skills.perception),
  skillInsight: computed(() => character.value.skills.insight),
  isJackOfAllTrades: computed(() => character.value.isJackOfAllTrades),
  passivePerceptionBonus: computed(() => character.value.passivePerceptionBonus),
  passiveInsightBonus: computed(() => character.value.passiveInsightBonus),
})

const computeDerived = (src: DerivedInputs): CharacterDerivedStats => {
  const totalAbilityScores = computed(() => calculateTotalAbilityScores(src.abilities.value))

  const totalLevel = computed(() => calculateTotalLevel(src.classesForLevel.value))
  const proficiencyBonus = computed(() => getProficiencyBonus(totalLevel.value))

  const savingThrowProficiencies = computed<AbilityKey[]>(() => [
    ...calculateSavingThrowProficiencies(src.validClasses.value),
    ...src.savingThrowExtras.value,
  ])

  const totalHp = computed(() =>
    calculateTotalHp({
      classes: src.validClasses.value,
      conModifier: getAbilityModifier(totalAbilityScores.value.constitution),
      isTough: src.isTough.value,
      customHpBonus: src.customHpBonus.value,
    }),
  )

  const totalArmorClass = computed(() =>
    getTotalArmorClass(src.armorClass.value, totalAbilityScores.value),
  )

  const totalInitiative = computed(() =>
    calculateTotalInitiative({
      dexModifier: getAbilityModifier(totalAbilityScores.value.dexterity),
      extraAbilityModifier: src.initiativeAbilityKey.value
        ? getAbilityModifier(totalAbilityScores.value[src.initiativeAbilityKey.value])
        : 0,
      initiativeBonus: src.initiativeBonus.value,
    }),
  )

  const totalSpeed = computed(() => calculateTotalSpeed(src.speedBonus.value))

  const totalPassivePerception = computed(() =>
    calculatePassiveScore({
      abilityModifier: getAbilityModifier(totalAbilityScores.value.wisdom),
      skillLevel: src.skillPerception.value ?? 'none',
      proficiencyBonus: proficiencyBonus.value,
      isJackOfAllTrades: src.isJackOfAllTrades.value,
      extraBonus: src.passivePerceptionBonus.value,
    }),
  )

  const totalPassiveInsight = computed(() =>
    calculatePassiveScore({
      abilityModifier: getAbilityModifier(totalAbilityScores.value.wisdom),
      skillLevel: src.skillInsight.value ?? 'none',
      proficiencyBonus: proficiencyBonus.value,
      isJackOfAllTrades: src.isJackOfAllTrades.value,
      extraBonus: src.passiveInsightBonus.value,
    }),
  )

  return {
    totalLevel,
    totalAbilityScores,
    proficiencyBonus,
    savingThrowProficiencies,
    validClasses: src.validClasses,
    totalHp,
    totalArmorClass,
    totalInitiative,
    totalSpeed,
    totalPassivePerception,
    totalPassiveInsight,
  }
}

/** 由 update 表單狀態派生角色戰鬥 / 屬性相關衍生數值。 */
export function useCharacterDerivedStats(
  formState: CharacterUpdateFormState,
): CharacterDerivedStats {
  return computeDerived(fromFormState(formState))
}

/** 從已建立的 CharacterDTO 派生戰鬥 / 屬性數值，給速查（read-only）情境使用。 */
export function useCharacterDerivedStatsFromCharacter(
  character: Ref<CharacterDTO>,
): CharacterDerivedStats {
  return computeDerived(fromCharacter(character))
}
