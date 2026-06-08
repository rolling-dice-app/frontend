import { describe, expect, it } from 'vitest'
import {
  getSuggestedPactSlots,
  getSuggestedRegularSpellSlots,
  mergeSlots,
  type ClassEntry,
  type ClassKey,
} from '@rolling-dice-app/core'

const entry = (classKey: ClassKey, level: number): ClassEntry => ({
  classKey,
  level,
  subclass: null,
})

describe('getSuggestedRegularSpellSlots', () => {
  describe('全施法者單職業', () => {
    it('法師 5 級 → 1:4, 2:3, 3:2', () => {
      expect(getSuggestedRegularSpellSlots([entry('wizard', 5)])).toEqual({ 1: 4, 2: 3, 3: 2 })
    })

    it('牧師 1 級 → 1:2', () => {
      expect(getSuggestedRegularSpellSlots([entry('cleric', 1)])).toEqual({ 1: 2 })
    })

    it('吟遊詩人 20 級 → 9 環表格滿值', () => {
      expect(getSuggestedRegularSpellSlots([entry('bard', 20)])).toEqual({
        1: 4,
        2: 3,
        3: 3,
        4: 3,
        5: 3,
        6: 2,
        7: 2,
        8: 1,
        9: 1,
      })
    })
  })

  describe('半施法者（向下取整）', () => {
    it('聖武士 1 級 → 無環位（effective 0）', () => {
      expect(getSuggestedRegularSpellSlots([entry('paladin', 1)])).toEqual({})
    })

    it('聖武士 2 級 → effective 1 → 1:2', () => {
      expect(getSuggestedRegularSpellSlots([entry('paladin', 2)])).toEqual({ 1: 2 })
    })

    it('遊俠 5 級 → PHB p.110 半施法者表 → 1:4, 2:2', () => {
      expect(getSuggestedRegularSpellSlots([entry('ranger', 5)])).toEqual({ 1: 4, 2: 2 })
    })
  })

  describe('奇械師（向上取整）', () => {
    it('奇械師 1 級 → effective 1 → 1:2', () => {
      expect(getSuggestedRegularSpellSlots([entry('artificer', 1)])).toEqual({ 1: 2 })
    })

    it('奇械師 2 級 → effective 1 → 1:2', () => {
      expect(getSuggestedRegularSpellSlots([entry('artificer', 2)])).toEqual({ 1: 2 })
    })

    it('奇械師 4 級 → effective 2 → 1:3', () => {
      expect(getSuggestedRegularSpellSlots([entry('artificer', 4)])).toEqual({ 1: 3 })
    })

    it('奇械師 7 級 → ceil(7/2)=4 effective → 1:4, 2:3', () => {
      expect(getSuggestedRegularSpellSlots([entry('artificer', 7)])).toEqual({ 1: 4, 2: 3 })
    })
  })

  describe('1/3 施法子職業（祕法騎士 / 奧法詭術師）', () => {
    it('戰士 9 + 祕法騎士 → effective 3 → 1:4, 2:2', () => {
      expect(
        getSuggestedRegularSpellSlots([
          { classKey: 'fighter', level: 9, subclass: 'eldritchKnight' },
        ]),
      ).toEqual({ 1: 4, 2: 2 })
    })

    it('戰士 9 + 鬥士（非施法子職業）→ {}', () => {
      expect(
        getSuggestedRegularSpellSlots([{ classKey: 'fighter', level: 9, subclass: 'champion' }]),
      ).toEqual({})
    })

    it('戰士 9（無 subclass）→ {}', () => {
      expect(
        getSuggestedRegularSpellSlots([{ classKey: 'fighter', level: 9, subclass: null }]),
      ).toEqual({})
    })

    it('遊蕩者 12 + 奧法詭術師 → effective 4 → 1:4, 2:3', () => {
      expect(
        getSuggestedRegularSpellSlots([
          { classKey: 'rogue', level: 12, subclass: 'arcaneTrickster' },
        ]),
      ).toEqual({ 1: 4, 2: 3 })
    })

    it('法師 5 + 戰士 3（祕法騎士）→ effective 6 → 1:4, 2:3, 3:3', () => {
      expect(
        getSuggestedRegularSpellSlots([
          { classKey: 'wizard', level: 5, subclass: null },
          { classKey: 'fighter', level: 3, subclass: 'eldritchKnight' },
        ]),
      ).toEqual({ 1: 4, 2: 3, 3: 3 })
    })

    it('遊蕩者 3 + 奧法詭術師 → floor(3/3) = 1 → effective 1 → 1:2', () => {
      expect(
        getSuggestedRegularSpellSlots([
          { classKey: 'rogue', level: 3, subclass: 'arcaneTrickster' },
        ]),
      ).toEqual({ 1: 2 })
    })

    it('遊蕩者 2 + 奧法詭術師 → 主職 ceil(2/3) = 1 → effective 1 → 1:2', () => {
      expect(
        getSuggestedRegularSpellSlots([
          { classKey: 'rogue', level: 2, subclass: 'arcaneTrickster' },
        ]),
      ).toEqual({ 1: 2 })
    })
  })

  describe('多職業合併', () => {
    it('牧師 3 + 聖武士 2 → effective 4 → 1:4, 2:3', () => {
      expect(getSuggestedRegularSpellSlots([entry('cleric', 3), entry('paladin', 2)])).toEqual({
        1: 4,
        2: 3,
      })
    })

    it('法師 3 + 牧師 2 → effective 5 → 1:4, 2:3, 3:2', () => {
      expect(getSuggestedRegularSpellSlots([entry('wizard', 3), entry('cleric', 2)])).toEqual({
        1: 4,
        2: 3,
        3: 2,
      })
    })
  })

  describe('契術師不參與一般環位計算', () => {
    it('術士 5 級 → {}（不疊加到一般環位）', () => {
      expect(getSuggestedRegularSpellSlots([entry('warlock', 5)])).toEqual({})
    })

    it('法師 3 + 術士 5 → 一般只看法師 3 → 1:4, 2:2', () => {
      expect(getSuggestedRegularSpellSlots([entry('wizard', 3), entry('warlock', 5)])).toEqual({
        1: 4,
        2: 2,
      })
    })
  })

  describe('非施法職業與邊界', () => {
    it('戰士 5 級 → {}', () => {
      expect(getSuggestedRegularSpellSlots([entry('fighter', 5)])).toEqual({})
    })

    it('空陣列 → {}', () => {
      expect(getSuggestedRegularSpellSlots([])).toEqual({})
    })

    it('等級 0 應略過', () => {
      expect(
        getSuggestedRegularSpellSlots([{ classKey: 'wizard', level: 0, subclass: null }]),
      ).toEqual({})
    })
  })
})

describe('getSuggestedPactSlots', () => {
  it('術士 1 級 → 1:1', () => {
    expect(getSuggestedPactSlots([entry('warlock', 1)])).toEqual({ 1: 1 })
  })

  it('術士 5 級 → 3:2', () => {
    expect(getSuggestedPactSlots([entry('warlock', 5)])).toEqual({ 3: 2 })
  })

  it('術士 11 級 → 5:3', () => {
    expect(getSuggestedPactSlots([entry('warlock', 11)])).toEqual({ 5: 3 })
  })

  it('術士 17 級 → 5:4', () => {
    expect(getSuggestedPactSlots([entry('warlock', 17)])).toEqual({ 5: 4 })
  })

  it('非契術師職業 → {}', () => {
    expect(getSuggestedPactSlots([entry('wizard', 5)])).toEqual({})
  })

  it('法師 3 + 術士 5 → 只看術士 5 → 3:2', () => {
    expect(getSuggestedPactSlots([entry('wizard', 3), entry('warlock', 5)])).toEqual({ 3: 2 })
  })

  it('空陣列 → {}', () => {
    expect(getSuggestedPactSlots([])).toEqual({})
  })

  it('等級 0 應略過', () => {
    expect(getSuggestedPactSlots([{ classKey: 'warlock', level: 0, subclass: null }])).toEqual({})
  })
})

describe('mergeSlots', () => {
  it('純 base 無 delta 時等同 base', () => {
    expect(mergeSlots({ 1: 4, 2: 3 }, {})).toEqual({ 1: 4, 2: 3 })
  })

  it('delta 應疊加到對應環級', () => {
    expect(mergeSlots({ 1: 4, 2: 3 }, { 1: 1, 2: -1 })).toEqual({ 1: 5, 2: 2 })
  })

  it('delta 使結果為 0 時應移除該環', () => {
    expect(mergeSlots({ 1: 2 }, { 1: -2 })).toEqual({})
  })

  it('delta 使結果為負時應 clamp 為 0 並移除', () => {
    expect(mergeSlots({ 1: 1 }, { 1: -5 })).toEqual({})
  })

  it('delta 使結果超過 9 時應 clamp 為 9', () => {
    expect(mergeSlots({ 5: 1 }, { 5: 20 })).toEqual({ 5: 9 })
  })

  it('base 為空時 delta 仍可獨立加入新環級', () => {
    expect(mergeSlots({}, { 3: 2 })).toEqual({ 3: 2 })
  })

  it('空輸入應回傳空物件', () => {
    expect(mergeSlots({}, {})).toEqual({})
  })
})
