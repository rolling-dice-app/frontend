import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockCharacter, createMockFormState } from '~/tests/fixtures/character'
import { CHARACTERS_STORAGE_KEY } from '~/constants/storage'
import { useCharacterStore } from '~/stores/character'
import type { Character } from '@rolling-dice-app/types'
import type { CharacterUpdateFormState } from '~/types/business/character-form'

const MOCK_CHARACTER = createMockCharacter({ isTough: true })

const MOCK_FORM_STATE = createMockFormState({
  name: '新角色',
  gender: 'female',
  race: 'elf',
  alignment: 'chaoticGood',
  professions: [{ profession: 'wizard', level: 3, subprofession: null }],
  abilities: {
    strength: { origin: 8, race: 0 },
    dexterity: { origin: 14, race: 0 },
    constitution: { origin: 12, race: 0 },
    intelligence: { origin: 15, race: 0 },
    wisdom: { origin: 13, race: 0 },
    charisma: { origin: 10, race: 0 },
  },
  skills: { arcana: 'proficient' },
  background: '學者',
})

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useCharacterStore — 初始化', () => {
  it('localStorage 為空時 characters 應為空陣列（非 dev 環境不載入 mock fallback）', () => {
    const store = useCharacterStore()
    expect(store.characters).toEqual([])
  })

  it('localStorage 有資料時應從 storage 載入，不覆寫', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    expect(store.characters).toHaveLength(1)
    expect(store.characters[0]!.id).toBe('test-001')
  })
})

describe('useCharacterStore — getById', () => {
  it('存在的 id 應回傳對應的 Character', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const result = store.getById('test-001')
    expect(result).toBeDefined()
    expect(result?.name).toBe('測試角色')
  })

  it('不存在的 id 應回傳 undefined', () => {
    const store = useCharacterStore()
    expect(store.getById('non-existent-id')).toBeUndefined()
  })
})

describe('useCharacterStore — addCharacter', () => {
  it('新增後 characters 長度應 +1', () => {
    const store = useCharacterStore()
    const before = store.characters.length
    store.addCharacter(MOCK_FORM_STATE)
    expect(store.characters).toHaveLength(before + 1)
  })

  it('新增後應可透過 getById 查到新角色', () => {
    const store = useCharacterStore()
    const created = store.addCharacter(MOCK_FORM_STATE)
    expect(created).not.toBeNull()
    expect(store.getById(created!.id)).toBeDefined()
    expect(store.getById(created!.id)?.name).toBe('新角色')
  })

  it('新增後應自動生成 id 與 createdAt', () => {
    const store = useCharacterStore()
    const created = store.addCharacter(MOCK_FORM_STATE)
    expect(created!.id).toBeTruthy()
    expect(created!.createdAt).toBeTruthy()
  })

  it('新增後 professions 應正確儲存', () => {
    const store = useCharacterStore()
    const created = store.addCharacter(MOCK_FORM_STATE)
    expect(created!.professions).toEqual([{ profession: 'wizard', level: 3, subprofession: null }])
  })

  it('新增後應同步寫入 localStorage', () => {
    const store = useCharacterStore()
    const created = store.addCharacter(MOCK_FORM_STATE)
    const stored = JSON.parse(localStorage.getItem(CHARACTERS_STORAGE_KEY)!)
    expect(stored.some((c: Character) => c.id === created!.id)).toBe(true)
  })

  it('isTough 為 true 時應寫入角色資料', () => {
    const store = useCharacterStore()
    const created = store.addCharacter({ ...MOCK_FORM_STATE, isTough: true })
    expect(created!.isTough).toBe(true)
  })

  it('isTough 為 false 時應寫入 false', () => {
    const store = useCharacterStore()
    const created = store.addCharacter({ ...MOCK_FORM_STATE, isTough: false })
    expect(created!.isTough).toBe(false)
  })

  it('新增後 speedBonus / initiativeBonus / passivePerceptionBonus / passiveInsightBonus 應初始化為 0、initiativeAbilityKey 為 null', () => {
    const store = useCharacterStore()
    const created = store.addCharacter(MOCK_FORM_STATE)
    expect(created!.speedBonus).toBe(0)
    expect(created!.initiativeBonus).toBe(0)
    expect(created!.passivePerceptionBonus).toBe(0)
    expect(created!.passiveInsightBonus).toBe(0)
    expect(created!.initiativeAbilityKey).toBeNull()
  })

  it('新增後 savingThrowExtras 應為空陣列', () => {
    const store = useCharacterStore()
    const created = store.addCharacter(MOCK_FORM_STATE)
    expect(created!.savingThrowExtras).toEqual([])
  })

  it('新增後 spells 應為空陣列', () => {
    const store = useCharacterStore()
    const created = store.addCharacter(MOCK_FORM_STATE)
    expect(created!.spells).toEqual([])
  })

  it('寫入 localStorage 失敗時應回傳 null 且 characters 長度不變', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    const store = useCharacterStore()
    const before = store.characters.length
    const result = store.addCharacter(MOCK_FORM_STATE)
    expect(result).toBeNull()
    expect(store.characters).toHaveLength(before)
  })
})

describe('useCharacterStore — removeCharacter', () => {
  it('刪除成功時應回傳 true，且該角色不應出現在 characters 中', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const result = store.removeCharacter('test-001')
    expect(result).toBe(true)
    expect(store.getById('test-001')).toBeUndefined()
  })

  it('刪除後應同步更新 localStorage', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    store.removeCharacter('test-001')
    const stored = JSON.parse(localStorage.getItem(CHARACTERS_STORAGE_KEY)!)
    expect(stored.some((c: Character) => c.id === 'test-001')).toBe(false)
  })

  it('刪除不存在的 id 時應回傳 false 且 characters 長度保持不變', () => {
    const store = useCharacterStore()
    const before = store.characters.length
    const result = store.removeCharacter('non-existent-id')
    expect(result).toBe(false)
    expect(store.characters).toHaveLength(before)
  })

  it('寫入 localStorage 失敗時應回傳 false 且角色仍保留在原位置', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const before = [...store.characters]
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    const result = store.removeCharacter('test-001')
    expect(result).toBe(false)
    expect(store.characters).toEqual(before)
  })
})

const MOCK_UPDATE_FORM_STATE: CharacterUpdateFormState = {
  id: 'test-001',
  name: '更新後角色',
  gender: 'female',
  race: 'elf',
  subrace: null,
  alignment: 'chaoticGood',
  professions: [
    { profession: 'wizard', level: 5, subprofession: null },
    { profession: 'cleric', level: 3, subprofession: null },
  ],
  abilities: {
    strength: { origin: 15, race: 0, bonusScore: 2 },
    dexterity: { origin: 14, race: 0, bonusScore: 0 },
    constitution: { origin: 13, race: 0, bonusScore: 1 },
    intelligence: { origin: 12, race: 0, bonusScore: 0 },
    wisdom: { origin: 10, race: 0, bonusScore: 0 },
    charisma: { origin: 8, race: 0, bonusScore: 0 },
  },
  savingThrowExtras: [],
  skills: { arcana: 'proficient', religion: 'proficient' },
  background: '學者',
  isJackOfAllTrades: true,
  isTough: false,
  faith: '密斯特拉',
  age: 120,
  height: '165cm',
  weight: '50kg',
  appearance: '銀白長髮',
  story: '來自遠方的精靈法師',
  languages: '通用語, 精靈語',
  tools: '書法工具',
  weaponProficiencies: null,
  armorProficiencies: null,
  armorClass: { type: 'none', value: 10, abilityKey: null, shieldValue: 0 },
  speedBonus: 0,
  initiativeBonus: 0,
  initiativeAbilityKey: null,
  passivePerceptionBonus: 0,
  passiveInsightBonus: 0,
  customHpBonus: 0,
  attacks: [],
  spellcastingAbilities: [],
  customSpellcastingBonuses: {},
  spells: [],
  spellSlotsDelta: {},
  pactSlotsDelta: {},
  features: [],
  items: [],
  currency: { cp: 0, sp: 0, gp: 0, pp: 0 },
}

describe('useCharacterStore — updateCharacter', () => {
  it('更新後角色名稱與欄位應反映新值', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const updated = store.updateCharacter('test-001', MOCK_UPDATE_FORM_STATE)
    expect(updated).toBeDefined()
    expect(updated!.name).toBe('更新後角色')
    expect(updated!.gender).toBe('female')
    expect(updated!.race).toBe('elf')
    expect(updated!.faith).toBe('密斯特拉')
    expect(updated!.age).toBe(120)
  })

  it('更新後 professions 應正確儲存', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const updated = store.updateCharacter('test-001', MOCK_UPDATE_FORM_STATE)
    expect(updated!.professions).toEqual([
      { profession: 'wizard', level: 5, subprofession: null },
      { profession: 'cleric', level: 3, subprofession: null },
    ])
  })

  it('更新後 abilities 應保留 origin / race / bonusScore', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const updated = store.updateCharacter('test-001', MOCK_UPDATE_FORM_STATE)
    expect(updated!.abilities.strength).toEqual({ origin: 15, race: 0, bonusScore: 2 })
    expect(updated!.abilities.constitution).toEqual({ origin: 13, race: 0, bonusScore: 1 })
  })

  it('更新後 spellcastingAbilities 應正確儲存', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const updated = store.updateCharacter('test-001', {
      ...MOCK_UPDATE_FORM_STATE,
      spellcastingAbilities: ['intelligence', 'charisma'],
    })
    expect(updated!.spellcastingAbilities).toEqual(['intelligence', 'charisma'])
  })

  it('更新後 customSpellcastingBonuses 應正確儲存', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const updated = store.updateCharacter('test-001', {
      ...MOCK_UPDATE_FORM_STATE,
      customSpellcastingBonuses: { intelligence: 2, charisma: -1 },
    })
    expect(updated!.customSpellcastingBonuses).toEqual({ intelligence: 2, charisma: -1 })
  })

  it('更新後應保留原始 id 與 createdAt', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const updated = store.updateCharacter('test-001', MOCK_UPDATE_FORM_STATE)
    expect(updated!.id).toBe('test-001')
    expect(updated!.createdAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('更新後應同步寫入 localStorage', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    store.updateCharacter('test-001', MOCK_UPDATE_FORM_STATE)
    const stored = JSON.parse(localStorage.getItem(CHARACTERS_STORAGE_KEY)!)
    expect(stored[0].name).toBe('更新後角色')
  })

  it('更新不存在的 id 時應回傳 null 且 characters 不變', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const before = store.characters.length
    const result = store.updateCharacter('non-existent-id', MOCK_UPDATE_FORM_STATE)
    expect(result).toBeNull()
    expect(store.characters).toHaveLength(before)
  })

  it('寫入 localStorage 失敗時應回傳 null 且保留原本角色資料', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    const result = store.updateCharacter('test-001', MOCK_UPDATE_FORM_STATE)
    expect(result).toBeNull()
    expect(store.getById('test-001')?.name).toBe('測試角色')
  })

  it('更新後 speedBonus / initiativeBonus / passive*Bonus / initiativeAbilityKey 應從 formState 寫入', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const updated = store.updateCharacter('test-001', {
      ...MOCK_UPDATE_FORM_STATE,
      speedBonus: 10,
      initiativeBonus: 3,
      initiativeAbilityKey: 'wisdom',
      passivePerceptionBonus: 2,
      passiveInsightBonus: 4,
    })
    expect(updated!.speedBonus).toBe(10)
    expect(updated!.initiativeBonus).toBe(3)
    expect(updated!.initiativeAbilityKey).toBe('wisdom')
    expect(updated!.passivePerceptionBonus).toBe(2)
    expect(updated!.passiveInsightBonus).toBe(4)
  })

  it('formState 的 speedBonus 等為 0 時應寫入 0、initiativeAbilityKey 為 null', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const updated = store.updateCharacter('test-001', MOCK_UPDATE_FORM_STATE)
    expect(updated!.speedBonus).toBe(0)
    expect(updated!.initiativeBonus).toBe(0)
    expect(updated!.passivePerceptionBonus).toBe(0)
    expect(updated!.passiveInsightBonus).toBe(0)
    expect(updated!.initiativeAbilityKey).toBeNull()
  })

  it('空字串的 optional 欄位更新後應為 null', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const updated = store.updateCharacter('test-001', {
      ...MOCK_UPDATE_FORM_STATE,
      faith: '',
      age: null,
      height: '',
    })
    expect(updated!.faith).toBeNull()
    expect(updated!.age).toBeNull()
    expect(updated!.height).toBeNull()
  })

  it('savingThrowExtras 中非 baseline 的項目應完整保留', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const updated = store.updateCharacter('test-001', {
      ...MOCK_UPDATE_FORM_STATE,
      savingThrowExtras: ['constitution', 'charisma'],
    })
    expect(updated!.savingThrowExtras).toEqual(['constitution', 'charisma'])
  })

  it('savingThrowExtras 與 baseline 重疊的項目應被去除，避免主職業切換後殘留', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const updated = store.updateCharacter('test-001', {
      ...MOCK_UPDATE_FORM_STATE,
      savingThrowExtras: ['intelligence', 'charisma'],
    })
    expect(updated!.savingThrowExtras).toEqual(['charisma'])
  })

  it('spells 完整由 formState 寫入（含 isPrepared / isFavorite flag）', () => {
    const A = 'spell-a'
    const B = 'spell-b'
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const updated = store.updateCharacter('test-001', {
      ...MOCK_UPDATE_FORM_STATE,
      spells: [
        { id: A, isPrepared: true, isFavorite: false },
        { id: B, isPrepared: false, isFavorite: true },
      ],
    })
    expect(updated!.spells).toEqual([
      { id: A, isPrepared: true, isFavorite: false },
      { id: B, isPrepared: false, isFavorite: true },
    ])
  })

  it('updateCharacter 不會與 store 內部 reactive 共享 spells 參考', () => {
    localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify([MOCK_CHARACTER]))
    const store = useCharacterStore()
    const updated = store.updateCharacter('test-001', {
      ...MOCK_UPDATE_FORM_STATE,
      spells: [{ id: 's1', isPrepared: false, isFavorite: false }],
    })
    updated!.spells[0]!.isPrepared = true
    expect(store.getById('test-001')!.spells[0]!.isPrepared).toBe(false)
  })
})
