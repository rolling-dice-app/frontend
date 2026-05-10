import { describe, expect, it } from 'vitest'
import {
  calculatePassiveScore,
  calculateSavingThrowProficiencies,
  calculateTotalAbilityScores,
  calculateTotalHp,
  calculateTotalInitiative,
  calculateTotalSpeed,
  formStateToCharacterPatch,
  getBaseArmorClass,
  getCharacterTier,
  getSpellSaveDc,
  getTotalArmorClass,
} from '~/helpers/character'
import {
  createDefaultArmorClass,
  type ArmorClassConfig,
  type CharacterAbilityScores,
} from '@rolling-dice-app/core'
import type { CharacterFormStateBase, TotalAbilityScores } from '~/types/business/character-form'

describe('getCharacterTier', () => {
  describe('common 等級 (1–4)', () => {
    it('等級 1 應回傳 common', () => {
      expect(getCharacterTier(1)).toBe('common')
    })

    it('等級 4 應回傳 common（上界）', () => {
      expect(getCharacterTier(4)).toBe('common')
    })
  })

  describe('elite 等級 (5–10)', () => {
    it('等級 5 應回傳 elite（下界）', () => {
      expect(getCharacterTier(5)).toBe('elite')
    })

    it('等級 10 應回傳 elite（上界）', () => {
      expect(getCharacterTier(10)).toBe('elite')
    })
  })

  describe('master 等級 (11–16)', () => {
    it('等級 11 應回傳 master（下界）', () => {
      expect(getCharacterTier(11)).toBe('master')
    })

    it('等級 16 應回傳 master（上界）', () => {
      expect(getCharacterTier(16)).toBe('master')
    })
  })

  describe('legendary 等級 (17–20)', () => {
    it('等級 17 應回傳 legendary（下界）', () => {
      expect(getCharacterTier(17)).toBe('legendary')
    })

    it('等級 20 應回傳 legendary（最高等級）', () => {
      expect(getCharacterTier(20)).toBe('legendary')
    })
  })
})

describe('getBaseArmorClass', () => {
  it('輕甲時，AC = baseValue + 完整 dexModifier', () => {
    expect(getBaseArmorClass(11, 3, 'light')).toBe(14)
  })

  it('無甲時，AC = baseValue + 完整 dexModifier', () => {
    expect(getBaseArmorClass(10, -2, 'none')).toBe(8)
  })

  it('未選擇護甲類型（null）時，AC = baseValue + 完整 dexModifier', () => {
    expect(getBaseArmorClass(10, 3, null)).toBe(13)
  })

  it('中甲時，DEX 調整值應上限為 +2（DEX > 2）', () => {
    expect(getBaseArmorClass(14, 4, 'medium')).toBe(16)
  })

  it('中甲時，DEX 不足 +2 取原值', () => {
    expect(getBaseArmorClass(14, 1, 'medium')).toBe(15)
  })

  it('中甲且 DEX 為負數時，仍以負數計算', () => {
    expect(getBaseArmorClass(14, -1, 'medium')).toBe(13)
  })

  it('重甲時，AC = baseValue（不加 DEX）', () => {
    expect(getBaseArmorClass(16, 3, 'heavy')).toBe(16)
  })

  it('重甲且 DEX 為負數時，AC 仍為 baseValue', () => {
    expect(getBaseArmorClass(18, -1, 'heavy')).toBe(18)
  })
})

describe('getTotalArmorClass', () => {
  const baseScores: TotalAbilityScores = {
    strength: 10,
    dexterity: 16, // modifier +3
    constitution: 14,
    intelligence: 10,
    wisdom: 12, // modifier +1
    charisma: 10,
  }

  it('無護甲設定（預設工廠）：10 + 完整 DEX = 13', () => {
    expect(getTotalArmorClass(createDefaultArmorClass(), baseScores)).toBe(13)
  })

  it('輕甲 11 + 盾牌 2：11 + DEX(+3) + 2 = 16', () => {
    const config: ArmorClassConfig = {
      type: 'light',
      value: 11,
      abilityKey: null,
      shieldValue: 2,
    }
    expect(getTotalArmorClass(config, baseScores)).toBe(16)
  })

  it('中甲 14 搭配 DEX +3：套上 +2 上限 = 16，加盾 2 = 18', () => {
    const config: ArmorClassConfig = {
      type: 'medium',
      value: 14,
      abilityKey: null,
      shieldValue: 2,
    }
    expect(getTotalArmorClass(config, baseScores)).toBe(18)
  })

  it('重甲 18：忽略 DEX，加盾 2 = 20', () => {
    const config: ArmorClassConfig = {
      type: 'heavy',
      value: 18,
      abilityKey: null,
      shieldValue: 2,
    }
    expect(getTotalArmorClass(config, baseScores)).toBe(20)
  })

  it('額外屬性加值（wisdom）：10 + DEX(+3) + WIS(+1) = 14', () => {
    const config: ArmorClassConfig = {
      type: 'none',
      value: 10,
      abilityKey: 'wisdom',
      shieldValue: 0,
    }
    expect(getTotalArmorClass(config, baseScores)).toBe(14)
  })

  it('value 為 null 時，fallback 為 10', () => {
    const config: ArmorClassConfig = {
      type: null,
      value: null,
      abilityKey: null,
      shieldValue: 0,
    }
    expect(getTotalArmorClass(config, baseScores)).toBe(13)
  })
})

describe('createDefaultArmorClass', () => {
  it('應回傳 type=none, value=10, abilityKey=null, shield=0', () => {
    expect(createDefaultArmorClass()).toEqual({
      type: 'none',
      value: 10,
      abilityKey: null,
      shieldValue: 0,
    })
  })

  it('多次呼叫應回傳獨立物件，互不影響', () => {
    const a = createDefaultArmorClass()
    const b = createDefaultArmorClass()
    a.value = 20
    expect(b.value).toBe(10)
  })
})

describe('calculateSavingThrowProficiencies', () => {
  it('主職業為 fighter 時，回傳 strength + constitution', () => {
    expect(
      calculateSavingThrowProficiencies([{ classKey: 'fighter', level: 3, subclass: null }]),
    ).toEqual(['strength', 'constitution'])
  })

  it('多職業時，以第一個職業為主職業決定豁免熟練', () => {
    expect(
      calculateSavingThrowProficiencies([
        { classKey: 'wizard', level: 5, subclass: null },
        { classKey: 'fighter', level: 3, subclass: null },
      ]),
    ).toEqual(['intelligence', 'wisdom'])
  })

  it('空陣列時，回傳空陣列', () => {
    expect(calculateSavingThrowProficiencies([])).toEqual([])
  })

  it('回傳陣列為新的陣列（不與 CLASS_CONFIG 共享參照）', () => {
    const result = calculateSavingThrowProficiencies([
      { classKey: 'wizard', level: 1, subclass: null },
    ])
    result.push('charisma')
    // 第二次呼叫仍為原始結果，代表回傳陣列是獨立副本
    expect(
      calculateSavingThrowProficiencies([{ classKey: 'wizard', level: 1, subclass: null }]),
    ).toEqual(['intelligence', 'wisdom'])
  })
})

describe('formStateToCharacterPatch', () => {
  function createBaseFormState(
    overrides: Partial<CharacterFormStateBase> = {},
  ): CharacterFormStateBase {
    return {
      name: '測試角色',
      gender: 'male',
      race: 'human',
      subrace: null,
      alignment: 'trueNeutral',
      classes: [{ classKey: 'fighter', level: 3, subclass: null }],
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

  it('基本 happy path：欄位原樣帶入，classes 不變', () => {
    const form = createBaseFormState({
      name: '法師小明',
      classes: [{ classKey: 'wizard', level: 5, subclass: null }],
      faith: '無神論',
      age: 25,
    })
    const patch = formStateToCharacterPatch(form)
    expect(patch.name).toBe('法師小明')
    expect(patch.classes).toEqual([{ classKey: 'wizard', level: 5, subclass: null }])
    expect(patch.faith).toBe('無神論')
    expect(patch.age).toBe(25)
  })

  it('gender 為 null 時原樣帶入（不再 fallback 到 nonBinary）', () => {
    const form = createBaseFormState({ gender: null })
    const patch = formStateToCharacterPatch(form)
    expect(patch.gender).toBeNull()
  })

  it('classes 含 null 條目時應過濾掉 null', () => {
    const form = createBaseFormState({
      classes: [
        { classKey: 'fighter', level: 3, subclass: null },
        { classKey: null, level: 2, subclass: null },
        { classKey: 'wizard', level: 1, subclass: null },
      ],
    })
    const patch = formStateToCharacterPatch(form)
    expect(patch.classes).toEqual([
      { classKey: 'fighter', level: 3, subclass: null },
      { classKey: 'wizard', level: 1, subclass: null },
    ])
  })

  it('classes 含 subclass key 時應原樣保留', () => {
    const form = createBaseFormState({
      classes: [
        { classKey: 'fighter', level: 5, subclass: 'battleMaster' },
        { classKey: 'wizard', level: 3, subclass: null },
      ],
    })
    const patch = formStateToCharacterPatch(form)
    expect(patch.classes).toEqual([
      { classKey: 'fighter', level: 5, subclass: 'battleMaster' },
      { classKey: 'wizard', level: 3, subclass: null },
    ])
  })

  it('classes 全為 null 時，classes 為空陣列', () => {
    const form = createBaseFormState({
      classes: [
        { classKey: null, level: 1, subclass: null },
        { classKey: null, level: 2, subclass: null },
      ],
    })
    const patch = formStateToCharacterPatch(form)
    expect(patch.classes).toEqual([])
  })

  it('所有可選文字欄位為 null 時，patch 欄位保持 null', () => {
    const form = createBaseFormState()
    const patch = formStateToCharacterPatch(form)
    expect(patch.background).toBeNull()
    expect(patch.faith).toBeNull()
    expect(patch.height).toBeNull()
    expect(patch.weight).toBeNull()
    expect(patch.appearance).toBeNull()
    expect(patch.story).toBeNull()
    expect(patch.languages).toBeNull()
    expect(patch.tools).toBeNull()
    expect(patch.weaponProficiencies).toBeNull()
    expect(patch.armorProficiencies).toBeNull()
    expect(patch.avatar).toBeNull()
  })

  it('avatar URL 原樣帶入 patch', () => {
    const url = 'https://avatars.example.com/avatars/u1/abc.webp'
    const form = createBaseFormState({ avatar: url })
    const patch = formStateToCharacterPatch(form)
    expect(patch.avatar).toBe(url)
  })

  it('age 為 0 時應保留為 0，不視為 null', () => {
    const form = createBaseFormState({ age: 0 })
    const patch = formStateToCharacterPatch(form)
    expect(patch.age).toBe(0)
  })

  it('skills 物件應為淺層複製（與原 form state 不共享參照）', () => {
    const skills = { acrobatics: 'proficient' as const }
    const form = createBaseFormState({ skills })
    const patch = formStateToCharacterPatch(form)
    expect(patch.skills).toEqual(skills)
    expect(patch.skills).not.toBe(skills)
  })
})

describe('calculateTotalAbilityScores', () => {
  it('每項屬性應加總 basicScore + bonusScore', () => {
    const abilities: CharacterAbilityScores = {
      strength: { origin: 15, race: 0, bonusScore: 2 },
      dexterity: { origin: 14, race: 0, bonusScore: 0 },
      constitution: { origin: 13, race: 0, bonusScore: 1 },
      intelligence: { origin: 12, race: 0, bonusScore: 0 },
      wisdom: { origin: 10, race: 0, bonusScore: 0 },
      charisma: { origin: 8, race: 0, bonusScore: 0 },
    }
    expect(calculateTotalAbilityScores(abilities)).toEqual({
      strength: 17,
      dexterity: 14,
      constitution: 14,
      intelligence: 12,
      wisdom: 10,
      charisma: 8,
    })
  })
})

describe('calculateTotalHp', () => {
  it('單職業：主職業第 1 級滿骰 + 每等 CON', () => {
    // fighter hitDie=10, level 3, conMod +2
    // class HP: 10 + avg(6) × 2 = 22；CON 加值：2 × 3 = 6；total = 28
    expect(
      calculateTotalHp({
        classes: [{ classKey: 'fighter', level: 3, subclass: null }],
        conModifier: 2,
        isTough: false,
        customHpBonus: 0,
      }),
    ).toBe(28)
  })

  it('多職業：僅第一個職業第 1 級滿骰，後續職業全走平均值', () => {
    // fighter (primary) lv2: 10 + avg(6)×1 = 16；CON 2×2=4
    // wizard lv1: avg(4)×1 = 4；CON 2×1=2
    // total = 16 + 4 + 4 + 2 = 26
    expect(
      calculateTotalHp({
        classes: [
          { classKey: 'fighter', level: 2, subclass: null },
          { classKey: 'wizard', level: 1, subclass: null },
        ],
        conModifier: 2,
        isTough: false,
        customHpBonus: 0,
      }),
    ).toBe(26)
  })

  it('健壯時每等加 2 HP', () => {
    // fighter lv3 = 22 class HP + 6 CON = 28；tough: 3×2=6 → 34
    expect(
      calculateTotalHp({
        classes: [{ classKey: 'fighter', level: 3, subclass: null }],
        conModifier: 2,
        isTough: true,
        customHpBonus: 0,
      }),
    ).toBe(34)
  })

  it('customHpBonus 加值應直接疊加', () => {
    expect(
      calculateTotalHp({
        classes: [{ classKey: 'fighter', level: 1, subclass: null }],
        conModifier: 1,
        isTough: false,
        customHpBonus: 5,
      }),
    ).toBe(10 + 1 + 5)
  })

  it('classes 為空時，僅回傳 customHpBonus（無健壯加值）', () => {
    expect(calculateTotalHp({ classes: [], conModifier: 3, isTough: true, customHpBonus: 7 })).toBe(
      7,
    )
  })
})

describe('calculateTotalSpeed', () => {
  it('speedBonus 為 0 時，回傳基礎 30', () => {
    expect(calculateTotalSpeed(0)).toBe(30)
  })

  it('speedBonus 為正數時，加上基礎 30', () => {
    expect(calculateTotalSpeed(10)).toBe(40)
  })

  it('speedBonus 為負數時，從基礎 30 扣除', () => {
    expect(calculateTotalSpeed(-5)).toBe(25)
  })
})

describe('calculateTotalInitiative', () => {
  it('bonus 與 extraAbilityModifier 為 0 時，僅回傳 dexModifier', () => {
    expect(
      calculateTotalInitiative({ dexModifier: 3, extraAbilityModifier: 0, initiativeBonus: 0 }),
    ).toBe(3)
  })

  it('bonus 為正數時，與 dexModifier 相加', () => {
    expect(
      calculateTotalInitiative({ dexModifier: 3, extraAbilityModifier: 0, initiativeBonus: 2 }),
    ).toBe(5)
  })

  it('dexModifier 為負數、bonus 為正數時可抵消', () => {
    expect(
      calculateTotalInitiative({ dexModifier: -1, extraAbilityModifier: 0, initiativeBonus: 1 }),
    ).toBe(0)
  })

  it('extraAbilityModifier 不為 0 時，疊加於 dexModifier 之上', () => {
    expect(
      calculateTotalInitiative({ dexModifier: 3, extraAbilityModifier: 2, initiativeBonus: 0 }),
    ).toBe(5)
  })

  it('三者同時非零時皆累加', () => {
    expect(
      calculateTotalInitiative({ dexModifier: 3, extraAbilityModifier: 2, initiativeBonus: 1 }),
    ).toBe(6)
  })
})

describe('calculatePassiveScore', () => {
  it('未熟練 + 非全能高手，回傳 10 + abilityModifier + extraBonus', () => {
    expect(
      calculatePassiveScore({
        abilityModifier: 2,
        skillLevel: 'none',
        proficiencyBonus: 3,
        isJackOfAllTrades: false,
        extraBonus: 0,
      }),
    ).toBe(12)
  })

  it('未熟練 + 全能高手，加 floor(proficiencyBonus / 2)', () => {
    expect(
      calculatePassiveScore({
        abilityModifier: 2,
        skillLevel: 'none',
        proficiencyBonus: 3,
        isJackOfAllTrades: true,
        extraBonus: 0,
      }),
    ).toBe(10 + 2 + 1)
  })

  it('熟練時，加 proficiencyBonus（全能高手不影響）', () => {
    expect(
      calculatePassiveScore({
        abilityModifier: 2,
        skillLevel: 'proficient',
        proficiencyBonus: 3,
        isJackOfAllTrades: true,
        extraBonus: 0,
      }),
    ).toBe(10 + 2 + 3)
  })

  it('專精時，加 proficiencyBonus × 2', () => {
    expect(
      calculatePassiveScore({
        abilityModifier: 2,
        skillLevel: 'expertise',
        proficiencyBonus: 3,
        isJackOfAllTrades: false,
        extraBonus: 0,
      }),
    ).toBe(10 + 2 + 6)
  })

  it('extraBonus 為正數時，疊加於 10 + skillBonus 之上', () => {
    expect(
      calculatePassiveScore({
        abilityModifier: 2,
        skillLevel: 'proficient',
        proficiencyBonus: 3,
        isJackOfAllTrades: false,
        extraBonus: 4,
      }),
    ).toBe(10 + 2 + 3 + 4)
  })
})

describe('getSpellSaveDc', () => {
  it('標準情境：8 + 熟練 + 屬性調整', () => {
    expect(
      getSpellSaveDc({
        abilityModifier: 0,
        proficiencyBonus: 2,
        customBonus: 0,
      }),
    ).toBe(10)
  })

  it('正屬性 + 自定義加值都正確套入', () => {
    expect(
      getSpellSaveDc({
        abilityModifier: 5,
        proficiencyBonus: 6,
        customBonus: 1,
      }),
    ).toBe(20)
  })

  it('負屬性調整也正確扣減', () => {
    expect(
      getSpellSaveDc({
        abilityModifier: -1,
        proficiencyBonus: 2,
        customBonus: 0,
      }),
    ).toBe(9)
  })

  it('自定義加值可為負', () => {
    expect(
      getSpellSaveDc({
        abilityModifier: 3,
        proficiencyBonus: 3,
        customBonus: -2,
      }),
    ).toBe(12)
  })
})
