import type { SpellEntryDTO, SpellEntryUpdateBody } from '@rolling-dice-app/core'
import { debounce, type DebouncedFn } from '~/utils/timing'
import { createLogger } from '~/utils/log'

const logger = createLogger('[CharacterSpellsStore]')

type ToggleFlag = 'isPrepared' | 'isFavorite'

const FLAG_DEBOUNCE_MS = 300

export const useCharacterSpellsStore = defineStore('character-spells', () => {
  const characterId = ref<string | null>(null)
  const entries = ref<SpellEntryDTO[]>([])
  const loading = ref(false)
  const error = ref<unknown>(null)
  /** 最近一次背景持久化失敗的錯誤；由 consumer watch 並交給 useApiErrorToast 處理。 */
  const mutationError = ref<unknown>(null)

  /** 每 spellId 一支 debounce；同 spell 的 prepared / favorite 合併 PATCH，避免兩個獨立 PATCH 帶同一 stale updatedAt 競態。 */
  const persistDebounces = new Map<string, DebouncedFn<[]>>()

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

  /** 背景同步：不動 loading，避免 consumer 的 v-if 把整段 unmount 造成跳回頂部 */
  const silentRefetch = async (): Promise<void> => {
    if (!characterId.value) return
    try {
      entries.value = await characters().spells.list(characterId.value)
    } catch (err) {
      logger.error('silentRefetch failed:', err)
    }
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

  /** 將指定 spell 當前的 prepared / favorite 一次送出；失敗時 refetch 取回 server truth。 */
  const persistMergedFlags = async (spellId: string): Promise<void> => {
    if (!characterId.value) return
    const entry = entries.value.find((e) => e.spellId === spellId)
    if (!entry) return
    try {
      const body: SpellEntryUpdateBody = {
        updatedAt: entry.updatedAt,
        isPrepared: entry.isPrepared,
        isFavorite: entry.isFavorite,
      }
      await characters().spells.patch(characterId.value, spellId, body)
      await silentRefetch()
    } catch (err) {
      mutationError.value = err
      logger.error(`persistMergedFlags(${spellId}) failed:`, err)
      // 不丟出：debounce 把 promise 丟掉了；錯誤由 mutationError ref 傳給 consumer
      await silentRefetch()
    }
  }

  /** 立刻翻 flag（視覺 optimistic）；trailing debounce 後以 spellId 為單位合併送出當前兩個 flag。 */
  const toggleFlag = (spellId: string, flag: ToggleFlag): void => {
    const index = entries.value.findIndex((entry) => entry.spellId === spellId)
    if (index === -1) return
    const current = entries.value[index]!
    entries.value = entries.value.map((entry, i) =>
      i === index ? { ...entry, [flag]: !current[flag] } : entry,
    )
    let d = persistDebounces.get(spellId)
    if (!d) {
      d = debounce(() => void persistMergedFlags(spellId), FLAG_DEBOUNCE_MS)
      persistDebounces.set(spellId, d)
    }
    d()
  }

  const togglePrepared = (spellId: string): void => toggleFlag(spellId, 'isPrepared')
  const toggleFavorite = (spellId: string): void => toggleFlag(spellId, 'isFavorite')

  const clearMutationError = (): void => {
    mutationError.value = null
  }

  /** 立即觸發所有 pending 的 toggle PATCH；unmount 前呼叫以保留最後一次寫入 */
  const flushPending = (): void => {
    for (const d of persistDebounces.values()) d.flush()
  }

  const reset = (): void => {
    for (const d of persistDebounces.values()) d.cancel()
    persistDebounces.clear()
    characterId.value = null
    entries.value = []
    error.value = null
    mutationError.value = null
  }

  return {
    characterId,
    entries,
    loading,
    error,
    mutationError,
    load,
    refetch,
    learn,
    forget,
    togglePrepared,
    toggleFavorite,
    clearMutationError,
    flushPending,
    reset,
  }
})
