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

const cloneCharacter = (c: CharacterDTO): CharacterDTO =>
  JSON.parse(JSON.stringify(c)) as CharacterDTO

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

  const loadList = async (): Promise<CharacterListItem[]> => {
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
  }

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

  const getById = (id: string): CharacterDTO | undefined => {
    const cached = detailCache.value.get(id)
    return cached ? cloneCharacter(cached) : undefined
  }

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

  /** 切換公開分享；樂觀更新列表與 detailCache，失敗回滾。 */
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
    updateCharacter,
    refreshCharacterAfterAvatar,
    setCharacterShareable,
    removeCharacter,
    restoreCharacter,
  }
})
