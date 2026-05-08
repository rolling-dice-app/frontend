import {
  createDefaultArmorClass,
  createDefaultInventory,
  type Character,
  type AbilityKey,
} from '@rolling-dice-app/core'
import type { CharacterFormState, CharacterUpdateFormState } from '~/types/business/character-form'
import { ABILITY_KEYS } from '~/constants/dnd'
import { CHARACTERS_STORAGE_KEY } from '~/constants/storage'
import { calculateSavingThrowProficiencies, formStateToCharacterPatch } from '~/helpers/character'
import { MOCK_CHARACTERS } from '~/mocks/characters'

/** 可由外部 patch 的欄位（排除身分識別與建立時間） */
export type CharacterMutablePatch = Partial<Omit<Character, 'id' | 'createdAt'>>

/** 對 Character 做深拷貝，斷開與 store 內部 reactive proxy 的關聯。 */
function cloneCharacter(c: Character): Character {
  return JSON.parse(JSON.stringify(c)) as Character
}

function loadFromStorage(): Character[] {
  return (
    getLocalStorage<Character[]>(CHARACTERS_STORAGE_KEY) ??
    (import.meta.dev ? MOCK_CHARACTERS.map(cloneCharacter) : [])
  )
}

function saveToStorage(characters: Character[]): boolean {
  return setLocalStorage(CHARACTERS_STORAGE_KEY, characters)
}

export const useCharacterStore = defineStore('character', () => {
  const characters = ref<Character[]>(loadFromStorage())

  function getById(id: string): Character | undefined {
    const found = characters.value.find((c) => c.id === id)
    return found ? cloneCharacter(found) : undefined
  }

  function addCharacter(formState: CharacterFormState): Character | null {
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
    ) as Record<AbilityKey, { origin: number; race: number; bonusScore: number }>

    const now = new Date().toISOString()
    const character: Character = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...patch,
      abilities,
      savingThrowExtras: [],
      avatar: null,
      customHpBonus: 0,
      speedBonus: 0,
      initiativeBonus: 0,
      initiativeAbilityKey: null,
      passivePerceptionBonus: 0,
      passiveInsightBonus: 0,
      armorClass: createDefaultArmorClass(),
      attacks: [],
      spellcastingAbilities: [],
      customSpellcastingBonuses: {},
      spells: [],
      spellSlotsDelta: {},
      pactSlotsDelta: {},
      features: [],
      ...createDefaultInventory(),
    }
    characters.value.push(character)
    if (!saveToStorage(characters.value)) {
      characters.value.pop()
      return null
    }
    return cloneCharacter(character)
  }

  function removeCharacter(id: string): boolean {
    const index = characters.value.findIndex((c) => c.id === id)
    if (index === -1) return false
    const previous = characters.value[index]!
    characters.value.splice(index, 1)
    if (!saveToStorage(characters.value)) {
      characters.value.splice(index, 0, previous)
      return false
    }
    return true
  }

  function updateCharacter(id: string, formState: CharacterUpdateFormState): Character | null {
    const index = characters.value.findIndex((c) => c.id === id)
    if (index === -1) return null

    const previous = characters.value[index]!
    const patch = formStateToCharacterPatch(formState)
    const baselineSavingThrows = calculateSavingThrowProficiencies(patch.classes)
    const baselineSet = new Set(baselineSavingThrows)
    const savingThrowExtras = formState.savingThrowExtras.filter((key) => !baselineSet.has(key))

    const updated: Character = {
      ...previous,
      ...patch,
      updatedAt: new Date().toISOString(),
      abilities: JSON.parse(JSON.stringify(formState.abilities)),
      savingThrowExtras,
      customHpBonus: formState.customHpBonus,
      speedBonus: formState.speedBonus,
      initiativeBonus: formState.initiativeBonus,
      initiativeAbilityKey: formState.initiativeAbilityKey,
      passivePerceptionBonus: formState.passivePerceptionBonus,
      passiveInsightBonus: formState.passiveInsightBonus,
      armorClass: JSON.parse(JSON.stringify(formState.armorClass)),
      attacks: JSON.parse(JSON.stringify(formState.attacks)),
      spellcastingAbilities: [...formState.spellcastingAbilities],
      customSpellcastingBonuses: { ...formState.customSpellcastingBonuses },
      spells: formState.spells.map((entry) => ({ ...entry })),
      spellSlotsDelta: { ...formState.spellSlotsDelta },
      pactSlotsDelta: { ...formState.pactSlotsDelta },
      features: JSON.parse(JSON.stringify(formState.features)),
      items: JSON.parse(JSON.stringify(formState.items)),
      currency: { ...formState.currency },
    }

    characters.value[index] = updated
    if (!saveToStorage(characters.value)) {
      characters.value[index] = previous
      return null
    }
    return cloneCharacter(updated)
  }

  /**
   * 對指定角色合併寫入欄位並持久化。
   */
  function patchCharacter(id: string, patch: CharacterMutablePatch): boolean {
    const index = characters.value.findIndex((c) => c.id === id)
    if (index === -1) return false
    const previous = characters.value[index]!
    characters.value[index] = {
      ...previous,
      ...(JSON.parse(JSON.stringify(patch)) as CharacterMutablePatch),
      updatedAt: new Date().toISOString(),
    }
    if (!saveToStorage(characters.value)) {
      characters.value[index] = previous
      return false
    }
    return true
  }

  /** 重設角色為預設 MOCK_CHARACTERS 並寫回 localStorage（僅供開發階段使用）。 */
  function resetCharacters(): void {
    if (!import.meta.dev) return
    characters.value = MOCK_CHARACTERS.map(cloneCharacter)
    saveToStorage(characters.value)
    useAdventureStore().removeAll()
  }

  return {
    characters,
    getById,
    addCharacter,
    updateCharacter,
    patchCharacter,
    removeCharacter,
    resetCharacters,
  }
})
