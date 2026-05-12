import { POINT_BUY_DEFAULT_SCORE } from '~/constants/dnd'
import {
  ABILITY_KEYS,
  createDefaultArmorClass,
  type CharacterDTO,
  type SpellEntryDTO,
} from '@rolling-dice-app/core'
import type { CharacterUpdateFormState, SpellFormEntry } from '~/types/business/character-form'
import { buildCharacterUpdatePatch } from '~/helpers/character'

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

const entryToFormSpell = (entry: SpellEntryDTO): SpellFormEntry => ({
  spellId: entry.spellId,
  isPrepared: entry.isPrepared,
  isFavorite: entry.isFavorite,
  sourceClass: entry.sourceClass,
})

export function useCharacterUpdate(id: string) {
  const store = useCharacterStore()
  const spellsStore = useCharacterSpellsStore()
  const apiErrorToast = useApiErrorToast()
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

  const hasMainChanges = computed(() => !!patch.value && Object.keys(patch.value).length > 1)

  // ─── Spells buffer：edit 進入時自 spellsStore.entries 種子化 ──────────────

  const spellsSeeded = ref(false)

  const seedSpells = (): void => {
    formState.spells = spellsStore.entries.map(entryToFormSpell)
    spellsSeeded.value = true
  }

  // 若 detail 頁已先載過、store 內已有此角色資料，立即種子化；否則 onMounted 補載
  if (spellsStore.characterId === id) seedSpells()

  onMounted(async () => {
    if (spellsSeeded.value) return
    try {
      await spellsStore.load(id)
    } catch {
      // error 透過 spellsStore.error 暴露；UI 端可決定如何顯示
    }
    seedSpells()
  })

  const diffSpells = (): { toLearn: string[]; toForget: string[] } => {
    const baseline = new Set(spellsStore.entries.map((e) => e.spellId))
    const formSet = new Set(formState.spells.map((e) => e.spellId))
    const toLearn = [...formSet].filter((s) => !baseline.has(s))
    const toForget = [...baseline].filter((s) => !formSet.has(s))
    return { toLearn, toForget }
  }

  const hasSpellDiff = computed(() => {
    if (!spellsSeeded.value) return false
    const { toLearn, toForget } = diffSpells()
    return toLearn.length > 0 || toForget.length > 0
  })

  const hasChanges = computed(() => hasMainChanges.value || hasSpellDiff.value)

  const canSubmit = computed(
    () =>
      !isSubmitting.value &&
      spellsSeeded.value &&
      formState.name.trim().length > 0 &&
      formState.classes.every((entry) => entry.classKey !== null) &&
      hasChanges.value,
  )

  const { t } = useI18n()

  // ─── Submit：主幹 PATCH + N 個 spell mutations 並行 ──────────────────────

  const submit = async (): Promise<void> => {
    if (!canSubmit.value) return
    isSubmitting.value = true
    try {
      const { toLearn, toForget } = diffSpells()
      const mainPromise: Promise<unknown> = hasMainChanges.value
        ? store.updateCharacter(id, formState)
        : Promise.resolve()
      const spellPromises: Promise<unknown>[] = [
        ...toLearn.map((spellId) => spellsStore.learn(spellId)),
        ...toForget.map((spellId) => spellsStore.forget(spellId)),
      ]

      const [mainResult, ...spellResults] = await Promise.allSettled([
        mainPromise,
        ...spellPromises,
      ])

      // 主幹失敗 → 統一交給 useApiErrorToast；不在前端判狀態碼
      if (mainResult!.status === 'rejected') {
        apiErrorToast.handle(mainResult!.reason)
      }

      // 個別 spell op 失敗 → 各自 toast；前端不解析後端錯誤碼
      for (const r of spellResults) {
        if (r.status === 'rejected') {
          apiErrorToast.handle(r.reason)
        }
      }

      const anySpellFailed = spellResults.some((r) => r.status === 'rejected')
      const anyFailed = mainResult!.status === 'rejected' || anySpellFailed
      if (!anyFailed) useToast().success(t('ui.message.saveSuccess'))

      // spell mutation 失敗 → 無條件 refetch 同步本地與 server 狀態（不解析錯誤類型）
      if (anySpellFailed) {
        await spellsStore.refetch().catch(() => {})
      }

      // Re-seed：以伺服器當前狀態為基準
      const next = store.getById(id)
      if (next) Object.assign(formState, characterToFormState(next))
      seedSpells()
    } catch (err) {
      apiErrorToast.handle(err)
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
