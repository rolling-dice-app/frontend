import { POINT_BUY_DEFAULT_SCORE } from '~/constants/dnd'
import { ABILITY_KEYS, createDefaultArmorClass, type CharacterDTO } from '@rolling-dice-app/core'
import type { CharacterUpdateFormState } from '~/types/business/character-form'
import { buildCharacterUpdatePatch } from '~/helpers/character'
import { createLogger } from '~/utils/log'

export type UpdateTab = 'basic' | 'profile' | 'combat' | 'spells' | 'features' | 'backpack'

// ─── Form State Factories ─────────────────────────────────────────────────────

function characterToFormState(character: CharacterDTO): CharacterUpdateFormState {
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
    avatar: character.avatar,
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
    spells: [],
    spellSlotsDelta: { ...character.spellSlotsDelta },
    pactSlotsDelta: { ...character.pactSlotsDelta },
    features: character.features.map((f) => ({ ...f, usage: { ...f.usage } })),
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
    avatar: null,
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
  }
}

const extractStatus = (err: unknown): number | undefined => {
  if (typeof err !== 'object' || err === null) return undefined
  const e = err as { response?: { status?: number }; statusCode?: number }
  return e.response?.status ?? e.statusCode
}

export function useCharacterUpdate(id: string) {
  const store = useCharacterStore()
  const activeTab = ref<UpdateTab>('basic')

  const character = computed(() => store.getById(id))

  const formState = reactive<CharacterUpdateFormState>(
    character.value ? characterToFormState(character.value) : createEmptyUpdateFormState(),
  )

  const derived = useCharacterDerivedStats(formState)

  const isSubmitting = ref(false)

  const patch = computed(() =>
    character.value ? buildCharacterUpdatePatch(character.value, formState) : null,
  )

  const hasChanges = computed(() => !!patch.value && Object.keys(patch.value).length > 1)

  const canSubmit = computed(
    () =>
      !isSubmitting.value &&
      formState.name.trim().length > 0 &&
      formState.classes.every((entry) => entry.classKey !== null) &&
      hasChanges.value,
  )

  const logger = createLogger('[CharacterUpdate]')
  const { t } = useI18n()

  const submit = async (): Promise<void> => {
    if (!canSubmit.value) return
    isSubmitting.value = true
    try {
      await store.updateCharacter(id, formState)
      useToast().success(t('ui.message.saveSuccess'))
      const next = store.getById(id)
      if (next) Object.assign(formState, characterToFormState(next))
    } catch (err) {
      if (extractStatus(err) === 409) {
        useToast().error(t('ui.message.staleCharacter'))
        await navigateTo(`/character/${id}`)
        return
      }
      logger.error('update submit failed:', err)
      useToast().error(t('ui.message.saveFailed'))
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    activeTab,
    character,
    formState,
    isSubmitting,
    canSubmit,
    hasChanges,
    derived,
    submit,
  }
}
