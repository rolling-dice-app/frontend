import type { SpellEntryDTO, SpellEntryUpdateBody } from '@rolling-dice-app/core'
import { debounce, type DebouncedFn } from '~/utils/timing'
import { createKeyedSingleFlight, createSingleFlight } from '~/utils/single-flight'
import { createKeyedDirtyGuard, type KeyedDirtySnapshot } from '~/utils/dirty-guard'
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

  /** 每 spellId 一支 debounce；同 spell 的 prepared / favorite 合併 PATCH。 */
  const persistDebounces = new Map<string, DebouncedFn<[]>>()

  /** 每 spellId optimistic mutation 計數；用於 refresh 期間判斷某筆是否「飛行中又被改過」 */
  const dirty = createKeyedDirtyGuard<string>()

  // 同 spellId 的 PATCH+merge pipeline 不並行；飛行中再 run 會排成 trailing 一輪
  const persistFlight = createKeyedSingleFlight(async (spellId: string) => {
    if (!characterId.value) return
    const entry = entries.value.find((e) => e.spellId === spellId)
    if (!entry) return
    const snap = dirty.snapshot()
    const body: SpellEntryUpdateBody = {
      updatedAt: entry.updatedAt,
      isPrepared: entry.isPrepared,
      isFavorite: entry.isFavorite,
    }
    try {
      await characters().spells.patch(characterId.value, spellId, body)
    } catch (err) {
      mutationError.value = err
      logger.error(`persistFlight(${spellId}) PATCH failed:`, err)
    }
    await mergeRefresh(spellId, snap)
  })

  // 整個 list GET 不並行；多 spell PATCH 完成後共享同一輪 trailing refresh
  const refreshFlight = createSingleFlight<SpellEntryDTO[]>(async () => {
    if (!characterId.value) return []
    return await characters().spells.list(characterId.value)
  })

  /**
   * 拉 list 並逐 entry 合併到 entries.value：
   * - 剛 PATCH 的那筆：飛行期間被改過則只接 updatedAt；否則接完整 server entry
   * - 其他 spell：若也在 PATCH 飛行中或自 snap 以來 dirty → 保留 optimistic local
   * - server 有但 local 沒（且 dirty）→ 視為本地 forget 飛行中，不把 server 版接回來
   * - local 有但 server 沒（且 dirty / in-flight）→ 視為本地 learn / 仍在 patch，保留 optimistic
   */
  const mergeRefresh = async (
    justPatchedSpellId: string,
    snap: KeyedDirtySnapshot<string>,
  ): Promise<void> => {
    let list: SpellEntryDTO[]
    try {
      list = await refreshFlight.run()
    } catch (err) {
      logger.error('refreshFlight failed:', err)
      return
    }
    // reset 期間或跨角色切換可能讓 characterId 在 await 後變 null；別把空 list 寫回去
    if (!characterId.value) return
    const localById = new Map(entries.value.map((e) => [e.spellId, e]))
    const seen = new Set<string>()
    const merged: SpellEntryDTO[] = []
    for (const fresh of list) {
      seen.add(fresh.spellId)
      const local = localById.get(fresh.spellId)
      if (!local) {
        if (dirty.changedSince(fresh.spellId, snap)) continue
        merged.push(fresh)
        continue
      }
      if (fresh.spellId === justPatchedSpellId) {
        merged.push(
          dirty.changedSince(fresh.spellId, snap)
            ? { ...local, updatedAt: fresh.updatedAt }
            : fresh,
        )
        continue
      }
      if (persistFlight.isInFlight(fresh.spellId) || dirty.changedSince(fresh.spellId, snap)) {
        merged.push(local)
        continue
      }
      merged.push(fresh)
    }
    for (const [spellId, local] of localById) {
      if (seen.has(spellId)) continue
      if (persistFlight.isInFlight(spellId) || dirty.changedSince(spellId, snap)) {
        merged.push(local)
      }
    }
    entries.value = merged
  }

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
    dirty.bump(spellId)
    return created
  }

  /** 忘記法術；以 catalog spellId 對應後端 DELETE。 */
  const forget = async (spellId: string): Promise<void> => {
    if (!characterId.value) throw new Error('forget: store not loaded')
    const snapshot = entries.value
    entries.value = snapshot.filter((entry) => entry.spellId !== spellId)
    dirty.bump(spellId)
    try {
      await characters().spells.forget(characterId.value, spellId)
    } catch (err) {
      entries.value = snapshot
      throw err
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
    dirty.bump(spellId)
    let d = persistDebounces.get(spellId)
    if (!d) {
      d = debounce(() => void persistFlight.run(spellId), FLAG_DEBOUNCE_MS)
      persistDebounces.set(spellId, d)
    }
    d()
  }

  const togglePrepared = (spellId: string): void => toggleFlag(spellId, 'isPrepared')
  const toggleFavorite = (spellId: string): void => toggleFlag(spellId, 'isFavorite')

  const clearMutationError = (): void => {
    mutationError.value = null
  }

  /** 立即觸發所有 pending 的 toggle PATCH 並等其完成；route-leave 前用以保留最後一次寫入 */
  const flushPending = async (): Promise<void> => {
    for (const d of persistDebounces.values()) d.flush()
    await persistFlight.drain()
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
