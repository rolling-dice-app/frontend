import { ABILITY_KEYS, type CharacterDTO, type SpellEntryDTO } from '@rolling-dice-app/core'
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
    // avatar 不再進 update patch（改走 atomic POST/DELETE /characters/:id/avatar）；
    // 此欄位僅作為 PortraitUploader v-model 的顯示來源
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

const entryToFormSpell = (entry: SpellEntryDTO): SpellFormEntry => ({
  spellId: entry.spellId,
  isPrepared: entry.isPrepared,
  isFavorite: entry.isFavorite,
  sourceClass: entry.sourceClass,
})

export function useCharacterUpdate(character: CharacterDTO) {
  const id = character.id
  const store = useCharacterStore()
  const spellsStore = useCharacterSpellsStore()
  const apiErrorToast = useApiErrorToast()
  const activeTab = ref<UpdateTab>('basic')

  const formState = reactive<CharacterUpdateFormState>(characterToFormState(character))
  const baseline = computed(() => store.getById(id) ?? character)

  const derived = useCharacterDerivedStats(formState)

  const isSubmitting = ref(false)

  const patch = computed(() => buildCharacterUpdatePatch(baseline.value, formState))

  const hasMainChanges = computed(() => Object.keys(patch.value).length > 1)

  // ─── Spells buffer：edit 進入時自 spellsStore.entries 種子化 ──────────────
  // page 層 useAsyncData 已預先 load spells，這裡可同步 seed，不需 flag / onMounted 補載。

  const seedSpells = (): void => {
    formState.spells = spellsStore.entries.map(entryToFormSpell)
  }

  seedSpells()

  const diffSpells = (): { toLearn: string[]; toForget: string[] } => {
    const baselineSet = new Set(spellsStore.entries.map((e) => e.spellId))
    const formSet = new Set(formState.spells.map((e) => e.spellId))
    const toLearn = [...formSet].filter((s) => !baselineSet.has(s))
    const toForget = [...baselineSet].filter((s) => !formSet.has(s))
    return { toLearn, toForget }
  }

  const hasSpellDiff = computed(() => {
    const { toLearn, toForget } = diffSpells()
    return toLearn.length > 0 || toForget.length > 0
  })

  const hasChanges = computed(() => hasMainChanges.value || hasSpellDiff.value)

  const canSubmit = computed(
    () =>
      !isSubmitting.value &&
      formState.name.trim().length > 0 &&
      formState.classes.every((entry) => entry.classKey !== null) &&
      hasChanges.value,
  )

  const { t } = useI18n()

  // ─── Avatar：atomic，與 Save 解耦；上傳/清除後重抓同步 updatedAt 避免後續 Save 409 ──

  const avatarUpload = async (blob: Blob): Promise<string> => {
    const { url } = await characters().uploadAvatar(id, blob)
    await store.refreshCharacterAfterAvatar(id)
    return url
  }

  const avatarDelete = async (): Promise<void> => {
    await characters().deleteAvatar(id)
    await store.refreshCharacterAfterAvatar(id)
  }

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

      // Re-seed：只有成功的 section 才以伺服器當前狀態為基準重種；失敗的 section 保留草稿，
      // 讓使用者可直接重試而不丟編輯（partial failure 時尤其重要）。
      if (mainResult!.status === 'fulfilled') {
        const next = store.getById(id)
        if (next) {
          // characterToFormState 會把 spells 重設為 []；先留住 spell 草稿，是否覆寫交由下方 seedSpells 決定。
          const spellDraft = formState.spells
          Object.assign(formState, characterToFormState(next))
          formState.spells = spellDraft
        }
      }
      // spell 任一失敗時保留 spell 草稿（上方已 refetch 對齊 baseline，重試時 diff 只會處理未完成項）。
      if (!anySpellFailed) seedSpells()
    } catch (err) {
      apiErrorToast.handle(err)
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    activeTab,
    formState,
    isSubmitting,
    canSubmit,
    hasChanges,
    derived,
    submit,
    avatarUpload,
    avatarDelete,
  }
}
