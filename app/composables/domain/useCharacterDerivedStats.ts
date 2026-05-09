import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { CharacterDTO, ClassEntry, AbilityKey } from '@rolling-dice-app/core'
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

/**
 * 由 update 表單狀態派生角色戰鬥 / 屬性相關衍生數值。
 */
export function useCharacterDerivedStats(
  formState: CharacterUpdateFormState,
): CharacterDerivedStats {
  const totalAbilityScores = computed(() => calculateTotalAbilityScores(formState.abilities))

  const totalLevel = computed(() => calculateTotalLevel(formState.classes))
  const proficiencyBonus = computed(() => getProficiencyBonus(totalLevel.value))

  const validClasses = computed<ClassEntry[]>(() =>
    formState.classes.filter((entry): entry is ClassEntry => entry.classKey !== null),
  )

  const savingThrowProficiencies = computed<AbilityKey[]>(() => [
    ...calculateSavingThrowProficiencies(validClasses.value),
    ...formState.savingThrowExtras,
  ])

  const totalHp = computed(() =>
    calculateTotalHp({
      classes: validClasses.value,
      conModifier: getAbilityModifier(totalAbilityScores.value.constitution),
      isTough: formState.isTough,
      customHpBonus: formState.customHpBonus,
    }),
  )

  const totalArmorClass = computed(() =>
    getTotalArmorClass(formState.armorClass, totalAbilityScores.value),
  )

  const totalInitiative = computed(() =>
    calculateTotalInitiative({
      dexModifier: getAbilityModifier(totalAbilityScores.value.dexterity),
      extraAbilityModifier: formState.initiativeAbilityKey
        ? getAbilityModifier(totalAbilityScores.value[formState.initiativeAbilityKey])
        : 0,
      initiativeBonus: formState.initiativeBonus,
    }),
  )

  const totalSpeed = computed(() => calculateTotalSpeed(formState.speedBonus))

  const totalPassivePerception = computed(() =>
    calculatePassiveScore({
      abilityModifier: getAbilityModifier(totalAbilityScores.value.wisdom),
      skillLevel: formState.skills.perception ?? 'none',
      proficiencyBonus: proficiencyBonus.value,
      isJackOfAllTrades: formState.isJackOfAllTrades,
      extraBonus: formState.passivePerceptionBonus,
    }),
  )

  const totalPassiveInsight = computed(() =>
    calculatePassiveScore({
      abilityModifier: getAbilityModifier(totalAbilityScores.value.wisdom),
      skillLevel: formState.skills.insight ?? 'none',
      proficiencyBonus: proficiencyBonus.value,
      isJackOfAllTrades: formState.isJackOfAllTrades,
      extraBonus: formState.passiveInsightBonus,
    }),
  )

  return {
    totalLevel,
    totalAbilityScores,
    proficiencyBonus,
    savingThrowProficiencies,
    validClasses,
    totalHp,
    totalArmorClass,
    totalInitiative,
    totalSpeed,
    totalPassivePerception,
    totalPassiveInsight,
  }
}

/**
 * 從已建立的 CharacterDTO 派生戰鬥 / 屬性數值，給速查（read-only）情境使用。
 * 與 useCharacterDerivedStats 回傳同一組介面，方便共用子元件。
 */
export function useCharacterDerivedStatsFromCharacter(
  character: Ref<CharacterDTO>,
): CharacterDerivedStats {
  const totalAbilityScores = computed(() => calculateTotalAbilityScores(character.value.abilities))

  const totalLevel = computed(() => calculateTotalLevel(character.value.classes))
  const proficiencyBonus = computed(() => getProficiencyBonus(totalLevel.value))

  const savingThrowProficiencies = computed<AbilityKey[]>(() => [
    ...calculateSavingThrowProficiencies(character.value.classes),
    ...character.value.savingThrowExtras,
  ])

  const validClasses = computed(() => character.value.classes)

  const totalHp = computed(() =>
    calculateTotalHp({
      classes: character.value.classes,
      conModifier: getAbilityModifier(totalAbilityScores.value.constitution),
      isTough: character.value.isTough,
      customHpBonus: character.value.customHpBonus,
    }),
  )

  const totalArmorClass = computed(() =>
    getTotalArmorClass(character.value.armorClass, totalAbilityScores.value),
  )

  const totalInitiative = computed(() =>
    calculateTotalInitiative({
      dexModifier: getAbilityModifier(totalAbilityScores.value.dexterity),
      extraAbilityModifier: character.value.initiativeAbilityKey
        ? getAbilityModifier(totalAbilityScores.value[character.value.initiativeAbilityKey])
        : 0,
      initiativeBonus: character.value.initiativeBonus,
    }),
  )

  const totalSpeed = computed(() => calculateTotalSpeed(character.value.speedBonus))

  const totalPassivePerception = computed(() =>
    calculatePassiveScore({
      abilityModifier: getAbilityModifier(totalAbilityScores.value.wisdom),
      skillLevel: character.value.skills.perception ?? 'none',
      proficiencyBonus: proficiencyBonus.value,
      isJackOfAllTrades: character.value.isJackOfAllTrades,
      extraBonus: character.value.passivePerceptionBonus,
    }),
  )

  const totalPassiveInsight = computed(() =>
    calculatePassiveScore({
      abilityModifier: getAbilityModifier(totalAbilityScores.value.wisdom),
      skillLevel: character.value.skills.insight ?? 'none',
      proficiencyBonus: proficiencyBonus.value,
      isJackOfAllTrades: character.value.isJackOfAllTrades,
      extraBonus: character.value.passiveInsightBonus,
    }),
  )

  return {
    totalLevel,
    totalAbilityScores,
    proficiencyBonus,
    savingThrowProficiencies,
    validClasses,
    totalHp,
    totalArmorClass,
    totalInitiative,
    totalSpeed,
    totalPassivePerception,
    totalPassiveInsight,
  }
}
