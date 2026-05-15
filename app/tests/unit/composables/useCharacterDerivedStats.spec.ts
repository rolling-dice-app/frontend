import { reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import { useCharacterDerivedStats } from '~/composables/domain/useCharacterDerivedStats'
import type { CharacterUpdateFormState } from '~/types/business/character-form'

function createFormState(
  overrides: Partial<CharacterUpdateFormState> = {},
): CharacterUpdateFormState {
  return reactive<CharacterUpdateFormState>({
    id: 'test-001',
    name: '測試角色',
    gender: 'male',
    race: 'human',
    subrace: null,
    alignment: 'trueNeutral',
    classes: [{ classKey: 'fighter', level: 3, subclass: null }],
    abilities: {
      strength: { origin: 15, race: 0, bonusScore: 0 },
      dexterity: { origin: 14, race: 0, bonusScore: 0 }, // +2
      constitution: { origin: 14, race: 0, bonusScore: 0 }, // +2
      intelligence: { origin: 10, race: 0, bonusScore: 0 },
      wisdom: { origin: 12, race: 0, bonusScore: 0 }, // +1
      charisma: { origin: 10, race: 0, bonusScore: 0 },
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
    ...overrides,
  })
}

describe('useCharacterDerivedStats', () => {
  it('totalAbilityScores 應加總 basicScore + bonusScore', () => {
    const formState = createFormState({
      abilities: {
        strength: { origin: 15, race: 0, bonusScore: 2 },
        dexterity: { origin: 14, race: 0, bonusScore: 0 },
        constitution: { origin: 13, race: 0, bonusScore: 1 },
        intelligence: { origin: 12, race: 0, bonusScore: 0 },
        wisdom: { origin: 10, race: 0, bonusScore: 0 },
        charisma: { origin: 8, race: 0, bonusScore: 0 },
      },
    })
    const { totalAbilityScores } = useCharacterDerivedStats(formState)
    expect(totalAbilityScores.value.strength).toBe(17)
    expect(totalAbilityScores.value.constitution).toBe(14)
  })

  it('totalLevel 應為所有職業等級之和', () => {
    const formState = createFormState({
      classes: [
        { classKey: 'fighter', level: 5, subclass: null },
        { classKey: 'wizard', level: 3, subclass: null },
      ],
    })
    const { totalLevel } = useCharacterDerivedStats(formState)
    expect(totalLevel.value).toBe(8)
  })

  it('proficiencyBonus 應依 totalLevel 計算', () => {
    // fighter lv 3 → PB +2
    const formState = createFormState()
    const { proficiencyBonus } = useCharacterDerivedStats(formState)
    expect(proficiencyBonus.value).toBe(2)
  })

  it('totalHp 應依 CON mod + 主職業第 1 級滿骰計算', () => {
    // fighter lv3, CON +2 → 10 + 6 + 6 = 22 class HP + 6 CON = 28
    const formState = createFormState()
    const { totalHp } = useCharacterDerivedStats(formState)
    expect(totalHp.value).toBe(28)
  })

  it('totalArmorClass 應反映 armorClass 設定 + DEX', () => {
    // none 10 + DEX(+2) = 12
    const formState = createFormState()
    const { totalArmorClass } = useCharacterDerivedStats(formState)
    expect(totalArmorClass.value).toBe(12)
  })

  it('totalInitiative 應為 DEX mod + initiativeBonus', () => {
    const formState = createFormState({ initiativeBonus: 3 })
    const { totalInitiative } = useCharacterDerivedStats(formState)
    expect(totalInitiative.value).toBe(2 + 3)
  })

  it('totalSpeed 應為 30 + speedBonus', () => {
    const formState = createFormState({ speedBonus: 10 })
    const { totalSpeed } = useCharacterDerivedStats(formState)
    expect(totalSpeed.value).toBe(40)
  })

  it('totalPassivePerception 應依感知 + 熟練 + 額外加值計算', () => {
    // perception none, WIS +1, PB +2, 無全能高手 → perceptionBonus = 1
    // passive = 10 + 1 + 0 = 11
    const formState = createFormState()
    const { totalPassivePerception } = useCharacterDerivedStats(formState)
    expect(totalPassivePerception.value).toBe(11)
  })

  it('表單欄位變動時，衍生值應重新計算（reactivity）', () => {
    const formState = createFormState()
    const { totalHp } = useCharacterDerivedStats(formState)
    expect(totalHp.value).toBe(28)

    formState.customHpBonus = 5
    expect(totalHp.value).toBe(33)

    formState.isTough = true
    expect(totalHp.value).toBe(33 + 6) // fighter lv3 tough: 3×2=6
  })

  it('classes 新增未選擇職業的空 row 時，不影響 totalHp', () => {
    const formState = createFormState()
    const { totalHp } = useCharacterDerivedStats(formState)
    const before = totalHp.value
    formState.classes.push({ classKey: null, level: 1, subclass: null })
    expect(totalHp.value).toBe(before)
  })
})
