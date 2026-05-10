import type { CharacterDTO } from '@rolling-dice-app/core'
import type {
  AttackDraft,
  CharacterFormState,
  CharacterUpdateFormState,
} from '~/types/business/character-form'
import { useCharacterStore } from '~/stores/character'

/**
 * 將 character 直接灌進 store 的 detailCache + list（取代過去用 localStorage 注入的方式）。
 * 必須先 setActivePinia 後呼叫。
 */
export function seedCharacterInStore(character: CharacterDTO): void {
  const store = useCharacterStore()
  store.detailCache.set(character.id, character)
  store.list.push({
    id: character.id,
    name: character.name,
    classes: character.classes,
    level: character.classes.reduce((sum, entry) => sum + entry.level, 0),
    avatar: character.avatar,
    updatedAt: character.updatedAt,
    race: character.race,
  })
}

export function createMockCharacter(overrides: Partial<CharacterDTO> = {}): CharacterDTO {
  return {
    id: 'test-001',
    name: '測試角色',
    gender: 'male',
    race: 'human',
    subrace: null,
    alignment: 'trueNeutral',
    classes: [{ classKey: 'fighter', level: 5, subclass: null }],
    abilities: {
      strength: { origin: 15, race: 0, bonusScore: 0 },
      dexterity: { origin: 14, race: 0, bonusScore: 0 },
      constitution: { origin: 13, race: 0, bonusScore: 0 },
      intelligence: { origin: 12, race: 0, bonusScore: 0 },
      wisdom: { origin: 10, race: 0, bonusScore: 0 },
      charisma: { origin: 8, race: 0, bonusScore: 0 },
    },
    savingThrowExtras: [],
    skills: { athletics: 'proficient' },
    background: '士兵',
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    customHpBonus: 0,
    speedBonus: 0,
    initiativeBonus: 0,
    initiativeAbilityKey: null,
    passivePerceptionBonus: 0,
    passiveInsightBonus: 0,
    armorClass: { type: 'none', value: 10, abilityKey: null, shieldValue: 0 },
    attacks: [],
    spellcastingAbilities: [],
    customSpellcastingBonuses: {},
    spells: [],
    spellSlotsDelta: {},
    pactSlotsDelta: {},
    features: [],
    items: [],
    currency: { cp: 0, sp: 0, gp: 0, pp: 0 },
    ...overrides,
  }
}

export function createMockFormState(
  overrides: Partial<CharacterFormState> = {},
): CharacterFormState {
  return {
    name: '新角色',
    gender: null,
    race: null,
    subrace: null,
    alignment: null,
    classes: [{ classKey: 'fighter', level: 1, subclass: null }],
    abilities: {
      strength: { origin: 8, race: 0 },
      dexterity: { origin: 8, race: 0 },
      constitution: { origin: 8, race: 0 },
      intelligence: { origin: 8, race: 0 },
      wisdom: { origin: 8, race: 0 },
      charisma: { origin: 8, race: 0 },
    },
    abilityMethod: 'custom',
    dicePool: [],
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
    ...overrides,
  }
}

export function createMockUpdateFormState(
  overrides: Partial<CharacterUpdateFormState> = {},
): CharacterUpdateFormState {
  return {
    id: 'test-001',
    name: '測試角色',
    gender: null,
    race: null,
    subrace: null,
    alignment: null,
    classes: [{ classKey: 'fighter', level: 5, subclass: null }],
    abilities: {
      strength: { origin: 15, race: 0, bonusScore: 0 },
      dexterity: { origin: 14, race: 0, bonusScore: 0 },
      constitution: { origin: 13, race: 0, bonusScore: 0 },
      intelligence: { origin: 12, race: 0, bonusScore: 0 },
      wisdom: { origin: 10, race: 0, bonusScore: 0 },
      charisma: { origin: 8, race: 0, bonusScore: 0 },
    },
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
    customHpBonus: 0,
    speedBonus: 0,
    initiativeBonus: 0,
    initiativeAbilityKey: null,
    passivePerceptionBonus: 0,
    passiveInsightBonus: 0,
    armorClass: { type: 'none', value: 10, abilityKey: null, shieldValue: 0 },
    attacks: [],
    spellcastingAbilities: [],
    customSpellcastingBonuses: {},
    spells: [],
    spellSlotsDelta: {},
    pactSlotsDelta: {},
    features: [],
    items: [],
    currency: { cp: 0, sp: 0, gp: 0, pp: 0 },
    ...overrides,
  }
}

export function createAttackDraft(overrides: Partial<AttackDraft> = {}): AttackDraft {
  return {
    name: '',
    abilityKey: null,
    damageDice: [],
    extraHitBonus: null,
    applyAbilityToDamage: true,
    comment: null,
    ...overrides,
  }
}
