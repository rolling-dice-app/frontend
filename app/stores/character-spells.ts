import type { SpellEntryDTO, SpellEntryUpdateBody } from '@rolling-dice-app/core'
import { createLogger } from '~/utils/log'

const logger = createLogger('[CharacterSpellsStore]')

type ToggleFlag = 'isPrepared' | 'isFavorite'

export const useCharacterSpellsStore = defineStore('character-spells', () => {
  const characterId = ref<string | null>(null)
  const entries = ref<SpellEntryDTO[]>([])
  const loading = ref(false)
  const error = ref<unknown>(null)

  const load = async (id: string): Promise<SpellEntryDTO[]> => {
    characterId.value = id
    loading.value = true
    error.value = null
    try {
      const list = await characters().spells.list(id)
      entries.value = list
      return list
    } catch (err) {
      error.value = err
      logger.error('load failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const refetch = async (): Promise<SpellEntryDTO[]> => {
    if (!characterId.value) return []
    return load(characterId.value)
  }

  /** 學新法術；成功時 server 回傳完整 entry 並 append 到本地。 */
  const learn = async (spellId: string): Promise<SpellEntryDTO> => {
    if (!characterId.value) throw new Error('learn: store not loaded')
    const created = await characters().spells.learn(characterId.value, { spellId })
    entries.value = [...entries.value, created]
    return created
  }

  /** 忘記法術；以 catalog spellId 對應後端 DELETE。 */
  const forget = async (spellId: string): Promise<void> => {
    if (!characterId.value) throw new Error('forget: store not loaded')
    const snapshot = entries.value
    entries.value = snapshot.filter((entry) => entry.spellId !== spellId)
    try {
      await characters().spells.forget(characterId.value, spellId)
    } catch (err) {
      entries.value = snapshot
      throw err
    }
  }

  /** 切換 prepared / favorite；optimistic 翻 flag、PATCH 完 refetch 拿新 updatedAt。 */
  const toggleFlag = async (spellId: string, flag: ToggleFlag): Promise<void> => {
    if (!characterId.value) throw new Error('toggleFlag: store not loaded')
    const index = entries.value.findIndex((entry) => entry.spellId === spellId)
    if (index === -1) throw new Error(`toggleFlag: spellId ${spellId} not in store`)
    const current = entries.value[index]!
    const nextValue = !current[flag]
    const snapshot = entries.value
    entries.value = entries.value.map((entry, i) =>
      i === index ? { ...entry, [flag]: nextValue } : entry,
    )
    try {
      const body: SpellEntryUpdateBody = { updatedAt: current.updatedAt, [flag]: nextValue }
      await characters().spells.patch(characterId.value, spellId, body)
      await refetch()
    } catch (err) {
      entries.value = snapshot
      throw err
    }
  }

  const togglePrepared = (spellId: string): Promise<void> => toggleFlag(spellId, 'isPrepared')
  const toggleFavorite = (spellId: string): Promise<void> => toggleFlag(spellId, 'isFavorite')

  const reset = (): void => {
    characterId.value = null
    entries.value = []
    error.value = null
  }

  return {
    characterId,
    entries,
    loading,
    error,
    load,
    refetch,
    learn,
    forget,
    togglePrepared,
    toggleFavorite,
    reset,
  }
})
