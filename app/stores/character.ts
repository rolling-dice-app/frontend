import {
  ABILITY_KEYS,
  type Character,
  type CharacterAbilityScores,
  type CharacterCreateInput,
  type CharacterSummary,
} from '@rolling-dice-app/core'
import type { CharacterFormState, CharacterUpdateFormState } from '~/types/business/character-form'
import type { CharacterListItem } from '~/types/business/character-list'
import { formStateToCharacterPatch } from '~/helpers/character'

/** 可由外部 patch 的欄位（排除身分識別與建立時間） */
export type CharacterMutablePatch = Partial<Omit<Character, 'id' | 'createdAt'>>

const NOT_SUPPORTED_MESSAGE =
  'character mutation 尚未支援（backend 未實作 update / delete endpoint）'

const cloneCharacter = (c: Character): Character => JSON.parse(JSON.stringify(c)) as Character

const buildCreateInput = (formState: CharacterFormState): CharacterCreateInput => {
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

const summaryToListItem = (summary: CharacterSummary): CharacterListItem => ({
  ...summary,
  race: null,
})

const characterToListItem = (character: Character): CharacterListItem => ({
  id: character.id,
  name: character.name,
  classes: character.classes,
  level: character.classes.reduce((sum, entry) => sum + entry.level, 0),
  avatar: character.avatar,
  updatedAt: character.updatedAt,
  race: character.race,
})

export const useCharacterStore = defineStore('character', () => {
  const list = ref<CharacterListItem[]>([])
  const detailCache = ref(new Map<string, Character>())

  const listLoading = ref(false)
  const listError = ref<unknown>(null)

  const detailLoading = ref(false)
  const detailError = ref<unknown>(null)

  const characters = computed<CharacterListItem[]>(() => list.value)

  const loadList = async (): Promise<void> => {
    listLoading.value = true
    listError.value = null
    try {
      const summaries = await useCharacterApi().listCharacters()
      list.value = summaries.map(summaryToListItem)
    } catch (error) {
      listError.value = error
      throw error
    } finally {
      listLoading.value = false
    }
  }

  const loadDetail = async (id: string): Promise<Character> => {
    detailLoading.value = true
    detailError.value = null
    try {
      const character = await useCharacterApi().getCharacter(id)
      detailCache.value.set(id, character)
      return cloneCharacter(character)
    } catch (error) {
      detailError.value = error
      throw error
    } finally {
      detailLoading.value = false
    }
  }

  const createCharacter = async (formState: CharacterFormState): Promise<Character> => {
    const input = buildCreateInput(formState)
    const created = await useCharacterApi().createCharacter(input)
    detailCache.value.set(created.id, created)
    list.value.push(characterToListItem(created))
    return cloneCharacter(created)
  }

  const getById = (id: string): Character | undefined => {
    const cached = detailCache.value.get(id)
    return cached ? cloneCharacter(cached) : undefined
  }

  const notSupported = (action: string): never => {
    throw new Error(`${action}: ${NOT_SUPPORTED_MESSAGE}`)
  }

  const updateCharacter = (_id: string, _formState: CharacterUpdateFormState): never =>
    notSupported('updateCharacter')

  const removeCharacter = (_id: string): never => notSupported('removeCharacter')

  const patchCharacter = (_id: string, _patch: CharacterMutablePatch): never =>
    notSupported('patchCharacter')

  return {
    characters,
    list,
    detailCache,
    listLoading,
    listError,
    detailLoading,
    detailError,
    loadList,
    loadDetail,
    createCharacter,
    getById,
    updateCharacter,
    removeCharacter,
    patchCharacter,
  }
})
