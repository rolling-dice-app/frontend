import { ABILITY_KEYS, POINT_BUY_DEFAULT_SCORE, UNASSIGNED_ABILITY_SCORE } from '~/constants/dnd'
import { createDicePool, tryCalculateSpentPoints } from '~/helpers/ability'
import { calculateTotalLevel } from '~/helpers/character'
import type {
  AbilityMethod,
  AbilityScores,
  CharacterFormState,
} from '~/types/business/character-form'
import type { AbilityKey } from '@rolling-dice-app/types'

export type BuildTab = 'basic' | 'profile'

function createDefaultAbilities(): AbilityScores {
  return Object.fromEntries(
    ABILITY_KEYS.map((key) => [key, { origin: POINT_BUY_DEFAULT_SCORE, race: 0 }]),
  ) as AbilityScores
}

/** 只重置 origin（race 保留），用於重置按鈕 / 切換模式時不洗掉種族加值 */
function resetOrigins(abilities: AbilityScores): void {
  for (const key of ABILITY_KEYS) {
    abilities[key].origin = POINT_BUY_DEFAULT_SCORE
  }
}

function createDefaultFormState(): CharacterFormState {
  return {
    name: '',
    gender: null,
    race: null,
    subrace: null,
    alignment: null,
    professions: [{ profession: null, level: 1, subprofession: null }],
    abilities: createDefaultAbilities(),
    abilityMethod: 'custom',
    dicePool: [],
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
  }
}

export function useCharacterBuild() {
  const store = useCharacterStore()
  const activeTab = ref<BuildTab>('basic')
  const formState = reactive<CharacterFormState>(createDefaultFormState())

  const totalLevel = computed(() => calculateTotalLevel(formState.professions))

  // ─── Dice Roll ────────────────────────────────────────────────────────

  function rollAllAbilities(): void {
    formState.dicePool = createDicePool()
    resetOrigins(formState.abilities)
  }

  function resetAbilities(): void {
    resetOrigins(formState.abilities)
    formState.dicePool = []
  }

  function assignDiceToAbility(key: AbilityKey, slotId: string | null): void {
    const previous = formState.dicePool.find((slot) => slot.assignedTo === key)
    if (previous) previous.assignedTo = null

    if (slotId === null) {
      formState.abilities[key].origin = UNASSIGNED_ABILITY_SCORE
      return
    }

    const target = formState.dicePool.find((slot) => slot.id === slotId)
    if (!target) return
    target.assignedTo = key
    formState.abilities[key].origin = target.value
  }

  // ─── Ability Method Switching ─────────────────────────────────────────

  function setAbilityMethod(method: AbilityMethod): void {
    if (formState.abilityMethod === method) return
    formState.abilityMethod = method

    if (method === 'diceRoll') {
      rollAllAbilities()
    } else {
      resetOrigins(formState.abilities)
      formState.dicePool = []
    }
  }

  // ─── Point Usage（自訂模式下的指示性點數使用） ────────────────────────────

  const pointBuyUsage = computed<number | null>(() => {
    if (formState.abilityMethod !== 'custom') return null
    const origins = Object.fromEntries(
      ABILITY_KEYS.map((key) => [key, formState.abilities[key].origin]),
    ) as Record<AbilityKey, number>
    return tryCalculateSpentPoints(origins)
  })

  function updateAbilityScore(key: AbilityKey, score: number): void {
    formState.abilities[key].origin = score
  }

  // ─── Submit guard ─────────────────────────────────────────────────────

  const isSubmitting = ref(false)

  const isDiceAssignmentComplete = computed(
    () =>
      formState.abilityMethod !== 'diceRoll' ||
      (formState.dicePool.length === ABILITY_KEYS.length &&
        formState.dicePool.every((slot) => slot.assignedTo !== null)),
  )

  const canSubmit = computed(
    () =>
      !isSubmitting.value &&
      formState.name.trim().length > 0 &&
      formState.professions.every((p) => p.profession !== null) &&
      isDiceAssignmentComplete.value,
  )

  // ─── Submit ───────────────────────────────────────────────────────────

  const logger = createLogger('[CharacterBuild]')

  async function submit(): Promise<void> {
    if (!canSubmit.value) return
    isSubmitting.value = true
    try {
      const created = store.addCharacter(formState)
      if (!created) {
        useToast().error('儲存失敗，請稍後再試')
        isSubmitting.value = false
        return
      }
      await navigateTo('/character')
    } catch (error) {
      logger.error('submit failed:', error)
      useToast().error('儲存失敗，請稍後再試')
      isSubmitting.value = false
    }
  }

  return {
    activeTab,
    formState,
    totalLevel,
    isSubmitting,
    canSubmit,

    abilities: {
      pointBuyUsage,
      setAbilityMethod,
      rollAllAbilities,
      resetAbilities,
      updateAbilityScore,
      assignDiceToAbility,
    },

    submit,
  }
}
