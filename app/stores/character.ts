import { toRaw } from 'vue'
import {
  ABILITY_KEYS,
  type CharacterDTO,
  type CharacterAbilityScores,
  type CharacterCreateDTO,
} from '@rolling-dice-app/core'
import type { CharacterFormState, CharacterUpdateFormState } from '~/types/business/character-form'
import type { CharacterListItem } from '~/types/business/character-list'
import {
  buildCharacterUpdatePatch,
  calculateTotalLevel,
  formStateToCharacterPatch,
} from '~/helpers/character'
import { createSingleFlight } from '~/utils/single-flight'

// toRaw 先解開 reactive proxy：structuredClone 無法 clone Vue 的 reactive Proxy（detailCache 內物件讀出即為 proxy）
const cloneCharacter = (c: CharacterDTO): CharacterDTO => structuredClone(toRaw(c))

const buildCreateInput = (formState: CharacterFormState): CharacterCreateDTO => {
  const patch = formStateToCharacterPatch(formState)
  const abilities = Object.fromEntries(
    ABILITY_KEYS.map((key) => [
      key,
      {
        origin: formState.abilities[key].origin,
        race: formState.abilities[key].race,
        bonusScore: 0,
      },
    ]),
  ) as CharacterAbilityScores
  return { ...patch, abilities }
}

const characterToListItem = ({
  id,
  name,
  classes,
  avatar,
  updatedAt,
  race,
  shareable,
  shareId,
  deletedAt,
  restoredAt,
}: CharacterDTO): CharacterListItem => ({
  id,
  name,
  classes,
  level: calculateTotalLevel(classes),
  avatar,
  updatedAt,
  race,
  shareable,
  shareId,
  deletedAt,
  restoredAt,
})

export const useCharacterStore = defineStore('character', () => {
  const list = ref<CharacterListItem[]>([])
  const detailCache = ref(new Map<string, CharacterDTO>())

  const listLoading = ref(false)
  const listError = ref<unknown>(null)
  const listLoaded = ref(false)

  const detailLoading = ref(false)
  const detailError = ref<unknown>(null)

  // active / trashed 分流依 deletedAt 單一欄位（後端權威）。restoredAt 不參與分流。
  const activeList = computed<CharacterListItem[]>(() =>
    list.value.filter((c) => c.deletedAt === null),
  )
  const trashedList = computed<CharacterListItem[]>(() =>
    list.value.filter((c) => c.deletedAt !== null),
  )

  // 角色數是否達方案上限；只計 active（trash 不計入 cap），limits 來自 /auth/me 未就緒時不視為達上限。
  const isAtCharacterLimit = computed(() => {
    const limits = useAuthStore().limits
    return limits != null && activeList.value.length >= limits.maxActiveCharacters
  })

  // 單飛：並發的 loadList（如多個 middleware / 頁面同時觸發）共享同一輪 GET，
  // 避免先發後到的舊結果覆蓋較新結果。
  const listFlight = createSingleFlight(async (): Promise<CharacterListItem[]> => {
    listLoading.value = true
    listError.value = null
    try {
      const items = await characters().list()
      list.value = items
      listLoaded.value = true
      return items
    } catch (error) {
      listError.value = error
      throw error
    } finally {
      listLoading.value = false
    }
  })
  const loadList = (): Promise<CharacterListItem[]> => listFlight.run()

  /** 確保列表已載入一次；已載入則 no-op，避免 SPA 內導航重複打 API。 */
  const ensureListLoaded = async (): Promise<void> => {
    if (listLoaded.value) return
    await loadList()
  }

  const loadDetail = async (id: string): Promise<CharacterDTO> => {
    detailLoading.value = true
    detailError.value = null
    try {
      const character = await characters().get(id)
      detailCache.value.set(id, character)
      return cloneCharacter(character)
    } catch (error) {
      detailError.value = error
      throw error
    } finally {
      detailLoading.value = false
    }
  }

  const createCharacter = async (formState: CharacterFormState): Promise<CharacterDTO> => {
    const input = buildCreateInput(formState)
    const created = await characters().create(input)
    detailCache.value.set(created.id, created)
    list.value.push(characterToListItem(created))
    return cloneCharacter(created)
  }

  /** 對外讀取：回傳防禦性 clone，呼叫端可安全改寫。 */
  const getById = (id: string): CharacterDTO | undefined => {
    const cached = detailCache.value.get(id)
    return cached ? cloneCharacter(cached) : undefined
  }

  /** 內部 / 跨 store 讀取：回傳 detailCache 內的引用，不 clone（避免高頻 computed 重複深拷貝）。呼叫端不得改寫。 */
  const peekById = (id: string): CharacterDTO | undefined => detailCache.value.get(id)

  const updateCharacter = async (
    id: string,
    formState: CharacterUpdateFormState,
  ): Promise<CharacterDTO> => {
    const original = detailCache.value.get(id)
    if (!original) throw new Error('updateCharacter: character not loaded')

    const patch = buildCharacterUpdatePatch(original, formState)
    if (Object.keys(patch).length <= 1) return cloneCharacter(original)

    const api = characters()
    await api.update(id, patch)
    const next = await api.get(id)
    detailCache.value.set(id, next)
    const nextItem = characterToListItem(next)
    const idx = list.value.findIndex((c) => c.id === id)
    if (idx >= 0) list.value[idx] = nextItem
    return cloneCharacter(next)
  }

  /** avatar 原子變更後重抓角色，同步 detailCache（含新 updatedAt）與列表縮圖。 */
  const refreshCharacterAfterAvatar = async (id: string): Promise<void> => {
    const next = await characters().get(id)
    detailCache.value.set(id, next)
    const item = list.value.find((c) => c.id === id)
    if (item) {
      item.avatar = next.avatar
      item.updatedAt = next.updatedAt
    }
  }

  /** 切換公開分享；樂觀更新列表（失敗回滾），detailCache 於成功後同步。 */
  const setCharacterShareable = async (id: string, shareable: boolean): Promise<void> => {
    const item = list.value.find((c) => c.id === id)
    const prev = item?.shareable
    if (item) item.shareable = shareable
    try {
      await characters().share(id, shareable)
      const cached = detailCache.value.get(id)
      if (cached) cached.shareable = shareable
    } catch (error) {
      if (item && prev !== undefined) item.shareable = prev
      throw error
    }
  }

  // soft-delete：呼叫成功後刷列表，由後端回的 deletedAt 把該筆推進 trashedList。
  const removeCharacter = async (id: string): Promise<void> => {
    await characters().remove(id)
    detailCache.value.delete(id)
    await loadList()
  }

  // 還原 trash 內角色為 active；錯誤往上拋給呼叫端做 toast 分流（plan-limit 滿等）。
  const restoreCharacter = async (id: string): Promise<void> => {
    await characters().restore(id)
    detailCache.value.delete(id)
    await loadList()
  }

  /** 清空所有 session-bound state；登出 / 換帳號 / 401 時由 auth store 統一呼叫，避免 A 帳號資料殘留給 B。 */
  const reset = (): void => {
    list.value = []
    detailCache.value = new Map()
    listLoaded.value = false
    listLoading.value = false
    listError.value = null
    detailLoading.value = false
    detailError.value = null
  }

  return {
    characters: activeList,
    trashedCharacters: trashedList,
    isAtCharacterLimit,
    list,
    detailCache,
    listLoading,
    listError,
    listLoaded,
    detailLoading,
    detailError,
    loadList,
    ensureListLoaded,
    loadDetail,
    createCharacter,
    getById,
    peekById,
    updateCharacter,
    refreshCharacterAfterAvatar,
    setCharacterShareable,
    removeCharacter,
    restoreCharacter,
    reset,
  }
})
