import { effectScope, ref, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCharacterCombatState } from '~/composables/domain/useCharacterCombatState'
import { getCombatStateStorageKey } from '~/constants/storage'

const CHAR_ID = 'char-001'

const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.stubGlobal('useToast', () => ({ success: mockToastSuccess, error: mockToastError }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('useCharacterCombatState — 預設與初始狀態', () => {
  it('localStorage 為空時 displayCurrentHp 應顯示 effectiveMaxHp', () => {
    const maxHp = ref(30)
    const { displayCurrentHp, effectiveMaxHp, state } = useCharacterCombatState(CHAR_ID, maxHp)
    expect(state.hp.current).toBeNull()
    expect(state.hp.tempHp).toBe(0)
    expect(state.hp.maxAdjustment).toBe(0)
    expect(effectiveMaxHp.value).toBe(30)
    expect(displayCurrentHp.value).toBe(30)
  })

  it('localStorage 有資料時應載入並 normalize', () => {
    localStorage.setItem(
      getCombatStateStorageKey(CHAR_ID),
      JSON.stringify({
        characterId: CHAR_ID,
        hp: { current: 12, tempHp: 3, maxAdjustment: 5 },
        acAdjustment: 2,
        speedAdjustment: -5,
        savingThrowAdjustments: { strength: 1 },
        updatedAt: '2026-04-26T00:00:00.000Z',
      }),
    )
    const maxHp = ref(30)
    const { state, displayCurrentHp, effectiveMaxHp } = useCharacterCombatState(CHAR_ID, maxHp)
    expect(state.hp.current).toBe(12)
    expect(state.hp.tempHp).toBe(3)
    expect(state.hp.maxAdjustment).toBe(5)
    expect(effectiveMaxHp.value).toBe(35)
    expect(state.acAdjustment).toBe(2)
    expect(state.speedAdjustment).toBe(-5)
    expect(state.savingThrowAdjustments.strength).toBe(1)
    expect(displayCurrentHp.value).toBe(12)
  })

  it('舊資料缺 maxAdjustment 時 normalize 應補 0', () => {
    localStorage.setItem(
      getCombatStateStorageKey(CHAR_ID),
      JSON.stringify({
        characterId: CHAR_ID,
        hp: { current: 10, tempHp: 0 },
        acAdjustment: 0,
        speedAdjustment: 0,
        savingThrowAdjustments: {},
        updatedAt: '2026-04-26T00:00:00.000Z',
      }),
    )
    const { state } = useCharacterCombatState(CHAR_ID, ref(30))
    expect(state.hp.maxAdjustment).toBe(0)
  })
})

describe('useCharacterCombatState — HP 加減', () => {
  it('healHp 不可超過 maxHp', () => {
    const { healHp, displayCurrentHp } = useCharacterCombatState(CHAR_ID, ref(30))
    healHp(50)
    expect(displayCurrentHp.value).toBe(30)
  })

  it('damageHp 不可低於 0', () => {
    const { damageHp, displayCurrentHp } = useCharacterCombatState(CHAR_ID, ref(30))
    damageHp(100)
    expect(displayCurrentHp.value).toBe(0)
  })

  it('damageHp 應先扣 tempHp 再扣 current', () => {
    const { setTempHp, damageHp, state, displayCurrentHp } = useCharacterCombatState(
      CHAR_ID,
      ref(30),
    )
    setTempHp(5)
    damageHp(3)
    expect(state.hp.tempHp).toBe(2)
    expect(displayCurrentHp.value).toBe(30)

    damageHp(4)
    expect(state.hp.tempHp).toBe(0)
    expect(displayCurrentHp.value).toBe(28)
  })

  it('damageHp(0) 與負值應為 no-op', () => {
    const { damageHp, displayCurrentHp } = useCharacterCombatState(CHAR_ID, ref(30))
    damageHp(0)
    damageHp(-5)
    expect(displayCurrentHp.value).toBe(30)
  })

  it('adjustHp 正負應分派到 heal/damage', () => {
    const { adjustHp, damageHp, displayCurrentHp } = useCharacterCombatState(CHAR_ID, ref(30))
    damageHp(10) // 20
    adjustHp(5)
    expect(displayCurrentHp.value).toBe(25)
    adjustHp(-3)
    expect(displayCurrentHp.value).toBe(22)
  })

  it('setTempHp 不可為負', () => {
    const { setTempHp, state } = useCharacterCombatState(CHAR_ID, ref(30))
    setTempHp(-5)
    expect(state.hp.tempHp).toBe(0)
  })

  it('adjustTempHp 累加，下界為 0', () => {
    const { adjustTempHp, state } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustTempHp(5)
    adjustTempHp(2)
    expect(state.hp.tempHp).toBe(7)
    adjustTempHp(-100)
    expect(state.hp.tempHp).toBe(0)
  })
})

describe('useCharacterCombatState — 最大生命調整', () => {
  it('adjustMaxHp 應累加，effectiveMaxHp 反映調整', () => {
    const { adjustMaxHp, effectiveMaxHp, state } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustMaxHp(10)
    expect(state.hp.maxAdjustment).toBe(10)
    expect(effectiveMaxHp.value).toBe(40)
  })

  it('adjustMaxHp 將 effectiveMaxHp 減至負值應 clamp 為最低 1', () => {
    const { adjustMaxHp, effectiveMaxHp } = useCharacterCombatState(CHAR_ID, ref(10))
    adjustMaxHp(-100)
    expect(effectiveMaxHp.value).toBe(1)
  })

  it('調低 maxAdjustment 應同步將 current 夾到上界', () => {
    const { healHp, adjustMaxHp, displayCurrentHp } = useCharacterCombatState(CHAR_ID, ref(30))
    healHp(5) // current 30 -> 35 clamp 30
    expect(displayCurrentHp.value).toBe(30)
    adjustMaxHp(-10) // effective max 20，current 應夾到 20
    expect(displayCurrentHp.value).toBe(20)
  })

  it('healHp 上界使用 effectiveMaxHp', () => {
    const { adjustMaxHp, healHp, displayCurrentHp } = useCharacterCombatState(CHAR_ID, ref(20))
    adjustMaxHp(10) // effective max 30
    healHp(100)
    expect(displayCurrentHp.value).toBe(30)
  })
})

describe('useCharacterCombatState — 臨時調整', () => {
  it('adjustAc / adjustSpeed 累加', () => {
    const { adjustAc, adjustSpeed, state } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustAc(2)
    adjustAc(1)
    adjustSpeed(-5)
    expect(state.acAdjustment).toBe(3)
    expect(state.speedAdjustment).toBe(-5)
  })

  it('adjustSavingThrow 應累加，歸零時清掉 key', () => {
    const { adjustSavingThrow, state } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustSavingThrow('strength', 2)
    adjustSavingThrow('strength', -1)
    expect(state.savingThrowAdjustments.strength).toBe(1)

    adjustSavingThrow('strength', -1)
    expect(state.savingThrowAdjustments.strength).toBeUndefined()
  })

  it('longRest 應清空所有臨時調整與 HP / tempHp / maxAdjustment，並清空指定 id 的 featureUsesSpent', () => {
    const {
      adjustAc,
      adjustSpeed,
      adjustSavingThrow,
      setTempHp,
      damageHp,
      adjustMaxHp,
      adjustFeatureUseSpent,
      longRest,
      state,
    } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustAc(2)
    adjustSpeed(-5)
    adjustSavingThrow('strength', 1)
    setTempHp(5)
    damageHp(10)
    adjustMaxHp(7)
    adjustFeatureUseSpent('feat-1', 1, 3)

    longRest([], ['feat-1'])

    expect(state.acAdjustment).toBe(0)
    expect(state.speedAdjustment).toBe(0)
    expect(state.savingThrowAdjustments).toEqual({})
    expect(state.hp.tempHp).toBe(0)
    expect(state.hp.current).toBeNull()
    expect(state.hp.maxAdjustment).toBe(0)
    expect(state.featureUsesSpent).toEqual({})
  })

  it('longRest 應保留 manual recovery 對應的 featureUsesSpent 條目', () => {
    const { adjustFeatureUseSpent, longRest, state } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustFeatureUseSpent('short-feat', 1, 2)
    adjustFeatureUseSpent('long-feat', 1, 3)
    adjustFeatureUseSpent('manual-feat', 1, 5)

    longRest([], ['short-feat', 'long-feat'])

    expect(state.featureUsesSpent['short-feat']).toBeUndefined()
    expect(state.featureUsesSpent['long-feat']).toBeUndefined()
    expect(state.featureUsesSpent['manual-feat']).toBe(1)
  })

  it('longRest 未傳入 longRestFeatureIds 時不動 featureUsesSpent', () => {
    const { adjustFeatureUseSpent, longRest, state } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustFeatureUseSpent('manual-feat', 2, 5)

    longRest()

    expect(state.featureUsesSpent['manual-feat']).toBe(2)
  })
})

describe('useCharacterCombatState — 休息 toast 通知', () => {
  it('shortRest 有 feature 目標時回傳 true', () => {
    const { adjustFeatureUseSpent, shortRest } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustFeatureUseSpent('feat-1', 1, 2)
    expect(shortRest(['feat-1'])).toBe(true)
  })

  it('shortRest([]) 且無契術可回復時回傳 false 且不變更狀態', () => {
    const { shortRest, state } = useCharacterCombatState(CHAR_ID, ref(30))
    const beforeUpdatedAt = state.updatedAt
    expect(shortRest([])).toBe(false)
    expect(state.updatedAt).toBe(beforeUpdatedAt)
  })
})

describe('useCharacterCombatState — 生命骰', () => {
  it('未調整時 getHitDiceUsed 應回傳 0', () => {
    const { getHitDiceUsed } = useCharacterCombatState(CHAR_ID, ref(30))
    expect(getHitDiceUsed('fighter')).toBe(0)
  })

  it('adjustHitDiceUsed 應夾在 0..level 之間', () => {
    const { adjustHitDiceUsed, getHitDiceUsed } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustHitDiceUsed('fighter', 1, 5)
    expect(getHitDiceUsed('fighter')).toBe(1)
    adjustHitDiceUsed('fighter', 99, 5)
    expect(getHitDiceUsed('fighter')).toBe(5)
    adjustHitDiceUsed('fighter', -99, 5)
    expect(getHitDiceUsed('fighter')).toBe(0)
  })

  it('歸零時應從 record 移除 entry', () => {
    const { adjustHitDiceUsed, setHitDiceUsed, state } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustHitDiceUsed('fighter', 2, 5)
    expect(state.hitDiceUsed.fighter).toBe(2)
    setHitDiceUsed('fighter', 0, 5)
    expect(state.hitDiceUsed.fighter).toBeUndefined()
  })

  it('adjustHitDiceUsed(delta = 0) 應為 no-op', () => {
    const { adjustHitDiceUsed, state } = useCharacterCombatState(CHAR_ID, ref(30))
    const beforeUpdatedAt = state.updatedAt
    adjustHitDiceUsed('fighter', 0, 5)
    expect(state.hitDiceUsed).toEqual({})
    expect(state.updatedAt).toBe(beforeUpdatedAt)
  })

  it('多職業各自獨立追蹤', () => {
    const { adjustHitDiceUsed, getHitDiceUsed } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustHitDiceUsed('fighter', 3, 5)
    adjustHitDiceUsed('wizard', 1, 2)
    expect(getHitDiceUsed('fighter')).toBe(3)
    expect(getHitDiceUsed('wizard')).toBe(1)
  })

  it('longRest 共回復 floor(totalLevel/2) 顆，依骰面由大到小貪婪分配', () => {
    const { adjustHitDiceUsed, longRest, getHitDiceUsed } = useCharacterCombatState(
      CHAR_ID,
      ref(30),
    )
    adjustHitDiceUsed('fighter', 5, 5)
    adjustHitDiceUsed('wizard', 2, 2)
    adjustHitDiceUsed('rogue', 1, 1)
    // totalLevel 8 → pool 4；hitDie: fighter d10 > rogue d8 > wizard d6
    longRest([
      { classKey: 'fighter', level: 5, subclass: null },
      { classKey: 'wizard', level: 2, subclass: null },
      { classKey: 'rogue', level: 1, subclass: null },
    ])
    expect(getHitDiceUsed('fighter')).toBe(1)
    expect(getHitDiceUsed('rogue')).toBe(1)
    expect(getHitDiceUsed('wizard')).toBe(2)
  })

  it('longRest 池有剩時應跨職業繼續分配', () => {
    const { adjustHitDiceUsed, longRest, getHitDiceUsed } = useCharacterCombatState(
      CHAR_ID,
      ref(30),
    )
    adjustHitDiceUsed('fighter', 2, 4)
    adjustHitDiceUsed('wizard', 4, 4)
    // totalLevel 8 → pool 4；fighter 用完 2 後池剩 2 接著回 wizard 2 顆
    longRest([
      { classKey: 'fighter', level: 4, subclass: null },
      { classKey: 'wizard', level: 4, subclass: null },
    ])
    expect(getHitDiceUsed('fighter')).toBe(0)
    expect(getHitDiceUsed('wizard')).toBe(2)
  })

  it('longRest 至少回復 1 顆（總等級 1）', () => {
    const { adjustHitDiceUsed, longRest, getHitDiceUsed } = useCharacterCombatState(
      CHAR_ID,
      ref(30),
    )
    adjustHitDiceUsed('fighter', 1, 1)
    longRest([{ classKey: 'fighter', level: 1, subclass: null }])
    expect(getHitDiceUsed('fighter')).toBe(0)
  })

  it('longRest 對未使用的職業不增條目', () => {
    const { longRest, state } = useCharacterCombatState(CHAR_ID, ref(30))
    longRest([{ classKey: 'fighter', level: 5, subclass: null }])
    expect(state.hitDiceUsed).toEqual({})
  })

  it('shortRest 不影響生命骰使用狀態', () => {
    const { adjustHitDiceUsed, shortRest, getHitDiceUsed } = useCharacterCombatState(
      CHAR_ID,
      ref(30),
    )
    adjustHitDiceUsed('fighter', 2, 5)
    shortRest([])
    expect(getHitDiceUsed('fighter')).toBe(2)
  })
})

describe('useCharacterCombatState — 特性次數', () => {
  it('未調整時 getFeatureUseSpent 應回傳 0、getFeatureUseRemaining 應回傳 max', () => {
    const { getFeatureUseSpent, getFeatureUseRemaining } = useCharacterCombatState(CHAR_ID, ref(30))
    expect(getFeatureUseSpent('feat-1')).toBe(0)
    expect(getFeatureUseRemaining('feat-1', 3)).toBe(3)
  })

  it('adjustFeatureUseSpent 應夾在 0..max 之間', () => {
    const { adjustFeatureUseSpent, getFeatureUseSpent, getFeatureUseRemaining } =
      useCharacterCombatState(CHAR_ID, ref(30))
    adjustFeatureUseSpent('feat-1', 1, 3)
    expect(getFeatureUseSpent('feat-1')).toBe(1)
    expect(getFeatureUseRemaining('feat-1', 3)).toBe(2)
    adjustFeatureUseSpent('feat-1', 10, 3)
    expect(getFeatureUseSpent('feat-1')).toBe(3)
    expect(getFeatureUseRemaining('feat-1', 3)).toBe(0)
    adjustFeatureUseSpent('feat-1', -10, 3)
    expect(getFeatureUseSpent('feat-1')).toBe(0)
    expect(getFeatureUseRemaining('feat-1', 3)).toBe(3)
  })

  it('歸零時應從 record 移除 entry', () => {
    const { adjustFeatureUseSpent, setFeatureUseSpent, state } = useCharacterCombatState(
      CHAR_ID,
      ref(30),
    )
    adjustFeatureUseSpent('feat-1', 1, 3)
    expect(state.featureUsesSpent['feat-1']).toBe(1)
    setFeatureUseSpent('feat-1', 0, 3)
    expect(state.featureUsesSpent['feat-1']).toBeUndefined()
  })

  it('shortRest 僅恢復指定 id 的特性，其他不動', () => {
    const { adjustFeatureUseSpent, shortRest, state } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustFeatureUseSpent('short-feat', 1, 2)
    adjustFeatureUseSpent('long-feat', 1, 1)
    shortRest(['short-feat'])
    expect(state.featureUsesSpent['short-feat']).toBeUndefined()
    expect(state.featureUsesSpent['long-feat']).toBe(1)
  })

  it('shortRest 與 HP / 臨時調整無關', () => {
    const { adjustFeatureUseSpent, adjustAc, damageHp, shortRest, state, displayCurrentHp } =
      useCharacterCombatState(CHAR_ID, ref(30))
    adjustFeatureUseSpent('short-feat', 1, 2)
    adjustAc(2)
    damageHp(5)
    shortRest(['short-feat'])
    expect(state.acAdjustment).toBe(2)
    expect(displayCurrentHp.value).toBe(25)
  })

  it('setFeatureUseSpent 應直接 clamp 至 [0, max]', () => {
    const { setFeatureUseSpent, getFeatureUseSpent } = useCharacterCombatState(CHAR_ID, ref(30))
    setFeatureUseSpent('feat-1', -5, 3)
    expect(getFeatureUseSpent('feat-1')).toBe(0)
    setFeatureUseSpent('feat-1', 99, 3)
    expect(getFeatureUseSpent('feat-1')).toBe(3)
  })

  it('adjustFeatureUseSpent(delta = 0) 應為 no-op', () => {
    const { adjustFeatureUseSpent, state } = useCharacterCombatState(CHAR_ID, ref(30))
    const beforeUpdatedAt = state.updatedAt
    adjustFeatureUseSpent('feat-1', 0, 3)
    expect(state.featureUsesSpent).toEqual({})
    expect(state.updatedAt).toBe(beforeUpdatedAt)
  })

  it('shortRest([]) 應為 no-op，不變更 updatedAt', () => {
    const { adjustFeatureUseSpent, shortRest, state } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustFeatureUseSpent('long-feat', 1, 2)
    const beforeUpdatedAt = state.updatedAt
    vi.advanceTimersByTime(10)
    shortRest([])
    expect(state.featureUsesSpent['long-feat']).toBe(1)
    expect(state.updatedAt).toBe(beforeUpdatedAt)
  })

  it('feature.usage.max 變動下調時 getFeatureUseRemaining 應 clamp 至 0、不出現負值', () => {
    const { setFeatureUseSpent, getFeatureUseRemaining, getFeatureUseSpent } =
      useCharacterCombatState(CHAR_ID, ref(30))
    setFeatureUseSpent('feat-1', 4, 5)
    expect(getFeatureUseSpent('feat-1')).toBe(4)
    expect(getFeatureUseRemaining('feat-1', 5)).toBe(1)
    expect(getFeatureUseRemaining('feat-1', 3)).toBe(0)
  })
})

describe('useCharacterCombatState — 法術位', () => {
  it('未調整時 getSpellSlotUsed / getPactSlotUsed 應回傳 0', () => {
    const { getSpellSlotUsed, getPactSlotUsed } = useCharacterCombatState(CHAR_ID, ref(30))
    expect(getSpellSlotUsed(1)).toBe(0)
    expect(getPactSlotUsed(3)).toBe(0)
  })

  it('adjustSpellSlotUsed 應夾在 0..max 之間', () => {
    const { adjustSpellSlotUsed, getSpellSlotUsed } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustSpellSlotUsed(1, 1, 4)
    expect(getSpellSlotUsed(1)).toBe(1)
    adjustSpellSlotUsed(1, 99, 4)
    expect(getSpellSlotUsed(1)).toBe(4)
    adjustSpellSlotUsed(1, -99, 4)
    expect(getSpellSlotUsed(1)).toBe(0)
  })

  it('adjustPactSlotUsed 應夾在 0..max 之間', () => {
    const { adjustPactSlotUsed, getPactSlotUsed } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustPactSlotUsed(3, 2, 2)
    expect(getPactSlotUsed(3)).toBe(2)
    adjustPactSlotUsed(3, 1, 2)
    expect(getPactSlotUsed(3)).toBe(2)
  })

  it('歸零時應從 record 移除 entry', () => {
    const { adjustSpellSlotUsed, setSpellSlotUsed, state } = useCharacterCombatState(
      CHAR_ID,
      ref(30),
    )
    adjustSpellSlotUsed(1, 2, 4)
    expect(state.spellSlotsUsed[1]).toBe(2)
    setSpellSlotUsed(1, 0, 4)
    expect(state.spellSlotsUsed[1]).toBeUndefined()
  })

  it('一般環位與契術環位互相獨立', () => {
    const { adjustSpellSlotUsed, adjustPactSlotUsed, state } = useCharacterCombatState(
      CHAR_ID,
      ref(30),
    )
    adjustSpellSlotUsed(1, 1, 4)
    adjustPactSlotUsed(3, 1, 2)
    expect(state.spellSlotsUsed).toEqual({ 1: 1 })
    expect(state.pactSlotsUsed).toEqual({ 3: 1 })
  })

  it('shortRest 應清空 pactSlotsUsed 但保留 spellSlotsUsed', () => {
    const { adjustSpellSlotUsed, adjustPactSlotUsed, shortRest, state } = useCharacterCombatState(
      CHAR_ID,
      ref(30),
    )
    adjustSpellSlotUsed(1, 2, 4)
    adjustPactSlotUsed(3, 2, 2)
    shortRest([])
    expect(state.spellSlotsUsed).toEqual({ 1: 2 })
    expect(state.pactSlotsUsed).toEqual({})
  })

  it('shortRest 僅有契術可回復時應觸發回復並回傳 true', () => {
    const { adjustPactSlotUsed, shortRest, state } = useCharacterCombatState(CHAR_ID, ref(30))
    adjustPactSlotUsed(3, 2, 2)
    expect(shortRest([])).toBe(true)
    expect(state.pactSlotsUsed).toEqual({})
  })

  it('longRest 應清空 spellSlotsUsed 與 pactSlotsUsed', () => {
    const { adjustSpellSlotUsed, adjustPactSlotUsed, longRest, state } = useCharacterCombatState(
      CHAR_ID,
      ref(30),
    )
    adjustSpellSlotUsed(1, 2, 4)
    adjustPactSlotUsed(3, 1, 2)
    longRest([])
    expect(state.spellSlotsUsed).toEqual({})
    expect(state.pactSlotsUsed).toEqual({})
  })

  it('normalize 載入舊資料無 spellSlotsUsed / pactSlotsUsed 時應補空物件', () => {
    localStorage.setItem(
      getCombatStateStorageKey(CHAR_ID),
      JSON.stringify({
        characterId: CHAR_ID,
        hp: { current: 12, tempHp: 0, maxAdjustment: 0 },
        acAdjustment: 0,
        speedAdjustment: 0,
        savingThrowAdjustments: {},
        updatedAt: '2026-04-26T00:00:00.000Z',
      }),
    )
    const { state } = useCharacterCombatState(CHAR_ID, ref(30))
    expect(state.spellSlotsUsed).toEqual({})
    expect(state.pactSlotsUsed).toEqual({})
  })
})

describe('useCharacterCombatState — 死亡豁免', () => {
  it('預設 deathSaves 應為 0/0', () => {
    const { state } = useCharacterCombatState(CHAR_ID, ref(30))
    expect(state.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('setDeathSaveSuccess / setDeathSaveFailure 應夾在 [0, 3]', () => {
    const { setDeathSaveSuccess, setDeathSaveFailure, state } = useCharacterCombatState(
      CHAR_ID,
      ref(30),
    )
    setDeathSaveSuccess(2)
    expect(state.deathSaves.successes).toBe(2)
    setDeathSaveSuccess(99)
    expect(state.deathSaves.successes).toBe(3)
    setDeathSaveSuccess(-1)
    expect(state.deathSaves.successes).toBe(0)
    setDeathSaveFailure(5)
    expect(state.deathSaves.failures).toBe(3)
  })

  it('resetDeathSaves 應將兩個欄位歸零', () => {
    const { setDeathSaveSuccess, setDeathSaveFailure, resetDeathSaves, state } =
      useCharacterCombatState(CHAR_ID, ref(30))
    setDeathSaveSuccess(2)
    setDeathSaveFailure(1)
    resetDeathSaves()
    expect(state.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('HP 由 0 恢復為正值時應自動歸零 deathSaves', async () => {
    const { damageHp, healHp, setDeathSaveSuccess, setDeathSaveFailure, state } =
      useCharacterCombatState(CHAR_ID, ref(30))
    damageHp(30)
    expect(state.hp.current).toBe(0)
    setDeathSaveSuccess(2)
    setDeathSaveFailure(1)
    healHp(5)
    await nextTick()
    expect(state.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('HP 持續為 0 時不觸發歸零', async () => {
    const { damageHp, setDeathSaveSuccess, state } = useCharacterCombatState(CHAR_ID, ref(30))
    damageHp(30)
    setDeathSaveSuccess(2)
    damageHp(5)
    await nextTick()
    expect(state.deathSaves.successes).toBe(2)
  })

  it('longRest 應清空 deathSaves', () => {
    const { setDeathSaveSuccess, setDeathSaveFailure, longRest, state } = useCharacterCombatState(
      CHAR_ID,
      ref(30),
    )
    setDeathSaveSuccess(2)
    setDeathSaveFailure(1)
    longRest([])
    expect(state.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('localStorage 載入超出範圍的值應 clamp 至 [0, 3]', () => {
    localStorage.setItem(
      getCombatStateStorageKey(CHAR_ID),
      JSON.stringify({
        characterId: CHAR_ID,
        hp: { current: 0, tempHp: 0, maxAdjustment: 0 },
        deathSaves: { successes: 99, failures: -5 },
        updatedAt: '2026-04-26T00:00:00.000Z',
      }),
    )
    const { state } = useCharacterCombatState(CHAR_ID, ref(30))
    expect(state.deathSaves).toEqual({ successes: 3, failures: 0 })
  })

  it('舊資料無 deathSaves 欄位時應補預設', () => {
    localStorage.setItem(
      getCombatStateStorageKey(CHAR_ID),
      JSON.stringify({
        characterId: CHAR_ID,
        hp: { current: 10, tempHp: 0, maxAdjustment: 0 },
        updatedAt: '2026-04-26T00:00:00.000Z',
      }),
    )
    const { state } = useCharacterCombatState(CHAR_ID, ref(30))
    expect(state.deathSaves).toEqual({ successes: 0, failures: 0 })
  })
})

describe('useCharacterCombatState — 持久化', () => {
  it('狀態變動後 debounce 結束應寫入 localStorage', async () => {
    const { damageHp } = useCharacterCombatState(CHAR_ID, ref(30))
    damageHp(5)
    await nextTick()
    expect(localStorage.getItem(getCombatStateStorageKey(CHAR_ID))).toBeNull()

    vi.advanceTimersByTime(300)
    const stored = JSON.parse(localStorage.getItem(getCombatStateStorageKey(CHAR_ID))!)
    expect(stored.hp.current).toBe(25)
  })

  it('scope 結束時應 flush 尚未寫入的最後一筆變動', async () => {
    const scope = effectScope()
    scope.run(() => {
      const { damageHp } = useCharacterCombatState(CHAR_ID, ref(30))
      damageHp(5)
    })

    // 等 watch callback 排入 setTimeout，但不快進到 debounce 結束
    await nextTick()
    expect(localStorage.getItem(getCombatStateStorageKey(CHAR_ID))).toBeNull()

    scope.stop()
    const stored = JSON.parse(localStorage.getItem(getCombatStateStorageKey(CHAR_ID))!)
    expect(stored.hp.current).toBe(25)
  })

  it('不同 character 使用獨立 key，互不影響', async () => {
    const a = useCharacterCombatState('a', ref(30))
    const b = useCharacterCombatState('b', ref(20))
    a.damageHp(5)
    b.damageHp(2)
    await nextTick()
    vi.advanceTimersByTime(300)

    const storedA = JSON.parse(localStorage.getItem(getCombatStateStorageKey('a'))!)
    const storedB = JSON.parse(localStorage.getItem(getCombatStateStorageKey('b'))!)
    expect(storedA.hp.current).toBe(25)
    expect(storedB.hp.current).toBe(18)
  })

  it('localStorage 寫入失敗時應 toast 一次，後續連續失敗不再 toast', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    const { damageHp } = useCharacterCombatState(CHAR_ID, ref(30))

    damageHp(5)
    await nextTick()
    vi.advanceTimersByTime(300)
    expect(mockToastError).toHaveBeenCalledTimes(1)
    expect(mockToastError).toHaveBeenCalledWith('更新失敗，重整後資料可能遺失')

    damageHp(3)
    await nextTick()
    vi.advanceTimersByTime(300)
    damageHp(2)
    await nextTick()
    vi.advanceTimersByTime(300)
    expect(mockToastError).toHaveBeenCalledTimes(1)
  })

  it('失敗後恢復成功再失敗時應重新 toast', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    const { damageHp } = useCharacterCombatState(CHAR_ID, ref(30))

    damageHp(5)
    await nextTick()
    vi.advanceTimersByTime(300)
    expect(mockToastError).toHaveBeenCalledTimes(1)

    setItemSpy.mockRestore()
    damageHp(3)
    await nextTick()
    vi.advanceTimersByTime(300)

    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    damageHp(2)
    await nextTick()
    vi.advanceTimersByTime(300)
    expect(mockToastError).toHaveBeenCalledTimes(2)
  })
})
