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

  /** 每個 (spellId, flag) 一支 debounce，避免不同 toggle 互相 cancel。 */
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

  /** 將 (spellId, flag) 的當前 local 值持久化；失敗時 refetch 取回 server truth。 */
  const persistFlag = async (spellId: string, flag: ToggleFlag): Promise<void> => {
    if (!characterId.value) return
    const entry = entries.value.find((e) => e.spellId === spellId)
    if (!entry) return
    try {
      const body: SpellEntryUpdateBody = { updatedAt: entry.updatedAt, [flag]: entry[flag] }
      await characters().spells.patch(characterId.value, spellId, body)
      await refetch()
    } catch (err) {
      mutationError.value = err
      logger.error(`persistFlag(${spellId}, ${flag}) failed:`, err)
      // 不丟出：debounce 把 promise 丟掉了；錯誤由 mutationError ref 傳給 consumer
      await refetch().catch(() => {})
    }
  }

  /** 立刻翻 flag（視覺 optimistic），trailing 200ms 後才送 PATCH，避免連點 spam DB。 */
  const toggleFlag = (spellId: string, flag: ToggleFlag): void => {
    const index = entries.value.findIndex((entry) => entry.spellId === spellId)
    if (index === -1) return
    const current = entries.value[index]!
    entries.value = entries.value.map((entry, i) =>
      i === index ? { ...entry, [flag]: !current[flag] } : entry,
    )
    const key = `${spellId}:${flag}`
    let d = persistDebounces.get(key)
    if (!d) {
      d = debounce(() => void persistFlag(spellId, flag), FLAG_DEBOUNCE_MS)
      persistDebounces.set(key, d)
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
