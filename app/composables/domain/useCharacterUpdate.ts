import { POINT_BUY_DEFAULT_SCORE } from '~/constants/dnd'
import {
  ABILITY_KEYS,
  DEFAULT_CURRENCY,
  createDefaultArmorClass,
  type Character,
} from '@rolling-dice-app/core'
import type { CharacterUpdateFormState } from '~/types/business/character-form'

export type UpdateTab = 'basic' | 'profile' | 'combat' | 'spells' | 'features' | 'backpack'

// ─── Form State Factories ─────────────────────────────────────────────────────

function characterToFormState(character: Character): CharacterUpdateFormState {
  return {
    id: character.id,
    name: character.name,
    gender: character.gender,
    race: character.race,
    subrace: character.subrace,
    alignment: character.alignment,
    classes: character.classes.map((entry) => ({
      classKey: entry.classKey,
      level: entry.level,
      subclass: entry.subclass,
    })),
    abilities: Object.fromEntries(
      ABILITY_KEYS.map((key) => [
        key,
        {
          origin: character.abilities[key].origin,
          race: character.abilities[key].race,
          bonusScore: character.abilities[key].bonusScore,
        },
      ]),
    ) as CharacterUpdateFormState['abilities'],
    savingThrowExtras: [...(character.savingThrowExtras ?? [])],
    skills: { ...character.skills },
    background: character.background,
    isJackOfAllTrades: character.isJackOfAllTrades,
    isTough: character.isTough,
    faith: character.faith,
    age: character.age,
    height: character.height,
    weight: character.weight,
    appearance: character.appearance,
    story: character.story,
    languages: character.languages,
    tools: character.tools,
    weaponProficiencies: character.weaponProficiencies,
    armorProficiencies: character.armorProficiencies,
    armorClass: { ...character.armorClass },
    speedBonus: character.speedBonus ?? 0,
    initiativeBonus: character.initiativeBonus ?? 0,
    initiativeAbilityKey: character.initiativeAbilityKey ?? null,
    passivePerceptionBonus: character.passivePerceptionBonus ?? 0,
    passiveInsightBonus: character.passiveInsightBonus ?? 0,
    customHpBonus: character.customHpBonus,
    attacks: character.attacks.map((a) => ({
      ...a,
      damageDice: a.damageDice.map((e) => ({ ...e })),
    })),
    spellcastingAbilities: [...character.spellcastingAbilities],
    customSpellcastingBonuses: { ...character.customSpellcastingBonuses },
    spells: character.spells.map((entry) => ({ ...entry })),
    spellSlotsDelta: { ...character.spellSlotsDelta },
    pactSlotsDelta: { ...character.pactSlotsDelta },
    features: character.features.map((f) => ({ ...f, usage: { ...f.usage } })),
    items: character.items.map((i) => ({ ...i })),
    currency: { ...character.currency },
  }
}

function createEmptyUpdateFormState(): CharacterUpdateFormState {
  return {
    id: '',
    name: '',
    gender: null,
    race: null,
    subrace: null,
    alignment: null,
    classes: [{ classKey: null, level: 1, subclass: null }],
    abilities: Object.fromEntries(
      ABILITY_KEYS.map((key) => [key, { origin: POINT_BUY_DEFAULT_SCORE, race: 0, bonusScore: 0 }]),
    ) as CharacterUpdateFormState['abilities'],
    savingThrowExtras: [],
    skills: {},
    background: null,
    isJackOfAllTrades: false,
    isTough: false,
    faith: null,
    age: null,
    height: null,
    weight: null,
    appearance: null,
    story: null,
    languages: null,
    tools: null,
    weaponProficiencies: null,
    armorProficiencies: null,
    armorClass: createDefaultArmorClass(),
    speedBonus: 0,
    initiativeBonus: 0,
    initiativeAbilityKey: null,
    passivePerceptionBonus: 0,
    passiveInsightBonus: 0,
    customHpBonus: 0,
    attacks: [],
    spellcastingAbilities: [],
    customSpellcastingBonuses: {},
    spells: [],
    spellSlotsDelta: {},
    pactSlotsDelta: {},
    features: [],
    items: [],
    currency: { ...DEFAULT_CURRENCY },
  }
}

export function useCharacterUpdate(id: string) {
  const store = useCharacterStore()
  const activeTab = ref<UpdateTab>('basic')

  const character = computed(() => store.getById(id))

  const formState = reactive<CharacterUpdateFormState>(
    character.value ? characterToFormState(character.value) : createEmptyUpdateFormState(),
  )

  const derived = useCharacterDerivedStats(formState)

  // ─── Submit guard ─────────────────────────────────────────────────────
  // backend 尚未提供 character update endpoint；submit 永久 disable 並提示。

  const isSubmitting = ref(false)
  const canSubmit = computed(() => false)

  const { t } = useI18n()

  const submit = async (): Promise<void> => {
    useToast().error(t('ui.message.editingNotAvailable'))
  }

  return {
    activeTab,
    character,
    formState,
    isSubmitting,
    canSubmit,
    derived,
    submit,
  }
}
