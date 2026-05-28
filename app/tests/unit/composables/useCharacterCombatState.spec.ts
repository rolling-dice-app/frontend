import { effectScope, ref, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildCombatStateBodyDefaults,
  type CombatResetBody,
  type CombatStateDTO,
  type CombatStateUpdateDTO,
} from '@rolling-dice-app/core'
import { useCharacterCombatState } from '~/composables/domain/useCharacterCombatState'

const CHAR_ID = 'char-001'
const INITIAL_UPDATED_AT = '2026-05-13T00:00:00.000Z'
const REFRESH_UPDATED_AT = '2026-05-13T00:00:00.500Z'

const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
const mockGet = vi.fn<(id: string) => Promise<CombatStateDTO>>()
const mockPatch = vi.fn<(id: string, body: CombatStateUpdateDTO) => Promise<void>>()
const mockShortRest = vi.fn<(id: string, body: CombatResetBody) => Promise<void>>()
const mockLongRest = vi.fn<(id: string, body: CombatResetBody) => Promise<void>>()
const mockResetEndpoint = vi.fn<(id: string, body: CombatResetBody) => Promise<void>>()
const mockApiErrorHandle = vi.fn()

const buildDto = (overrides: Partial<CombatStateDTO> = {}): CombatStateDTO => ({
  characterId: CHAR_ID,
  ...buildCombatStateBodyDefaults(),
  updatedAt: INITIAL_UPDATED_AT,
  ...overrides,
})

/** 預設：GET 回 default DTO，PATCH 回 undefined，第二次 GET（refresh）回較新 updatedAt */
const installDefaultApi = (initial: Partial<CombatStateDTO> = {}): void => {
  let getCount = 0
  mockGet.mockImplementation(async () => {
    getCount += 1
    return getCount === 1
      ? buildDto(initial)
      : buildDto({ ...initial, updatedAt: REFRESH_UPDATED_AT })
  })
  mockPatch.mockResolvedValue(undefined)
  mockShortRest.mockResolvedValue(undefined)
  mockLongRest.mockResolvedValue(undefined)
  mockResetEndpoint.mockResolvedValue(undefined)
}

beforeEach(() => {
  vi.useFakeTimers()
  mockGet.mockReset()
  mockPatch.mockReset()
  mockShortRest.mockReset()
  mockLongRest.mockReset()
  mockResetEndpoint.mockReset()
  mockApiErrorHandle.mockReset()
  installDefaultApi()
  vi.stubGlobal('characters', () => ({
    combatState: {
      get: mockGet,
      patch: mockPatch,
      shortRest: mockShortRest,
      longRest: mockLongRest,
      reset: mockResetEndpoint,
    },
  }))
  vi.stubGlobal('useApiErrorToast', () => ({ handle: mockApiErrorHandle }))
  vi.stubGlobal('useToast', () => ({ success: mockToastSuccess, error: mockToastError }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('useCharacterCombatState — 預設與初始狀態', () => {
  it('未呼叫 load() 時 state 為預設值，displayCurrentHp 應顯示 effectiveMaxHp', () => {
    const maxHp = ref(30)
    const { displayCurrentHp, effectiveMaxHp, state, isReady } = useCharacterCombatState(
      CHAR_ID,
      maxHp,
    )
    expect(isReady.value).toBe(false)
    expect(state.hp.current).toBeNull()
    expect(state.hp.tempHp).toBe(0)
    expect(state.hp.maxAdjustment).toBe(0)
    expect(effectiveMaxHp.value).toBe(30)
    expect(displayCurrentHp.value).toBe(30)
  })

  it('load() 回傳 DTO 應寫入 state 並 normalize', async () => {
    installDefaultApi({
      hp: { current: 12, tempHp: 3, maxAdjustment: 5 },
      acAdjustment: 2,
      speedAdjustment: -5,
      savingThrowAdjustments: { strength: 1 },
    })
    const maxHp = ref(30)
    const cs = useCharacterCombatState(CHAR_ID, maxHp)
    await cs.load()
    expect(cs.isReady.value).toBe(true)
    expect(cs.state.hp.current).toBe(12)
    expect(cs.state.hp.tempHp).toBe(3)
    expect(cs.state.hp.maxAdjustment).toBe(5)
    expect(cs.effectiveMaxHp.value).toBe(35)
    expect(cs.state.acAdjustment).toBe(2)
    expect(cs.state.speedAdjustment).toBe(-5)
    expect(cs.state.savingThrowAdjustments.strength).toBe(1)
    expect(cs.displayCurrentHp.value).toBe(12)
  })

  it('load() 失敗時 loadError 應記錄，isReady 維持 false', async () => {
    const err = new Error('network down')
    mockGet.mockRejectedValueOnce(err)
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    expect(cs.loadError.value).toBe(err)
    expect(cs.isReady.value).toBe(false)
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
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    cs.damageHp(30)
    expect(cs.state.hp.current).toBe(0)
    cs.setDeathSaveSuccess(2)
    cs.setDeathSaveFailure(1)
    cs.healHp(5)
    await nextTick()
    expect(cs.state.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('HP 持續為 0 時不觸發歸零', async () => {
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    cs.damageHp(30)
    cs.setDeathSaveSuccess(2)
    cs.damageHp(5)
    await nextTick()
    expect(cs.state.deathSaves.successes).toBe(2)
  })

  it('套用 server DTO 將 HP 從 0 拉回正值時不應誤觸 resetDeathSaves（不可蓋掉 server deathSaves）', async () => {
    // load 第一次 GET 給「HP=0、deathSaves={2,1}」；後續 patch 後 GET 給「HP>0、deathSaves={2,1}」
    let getCount = 0
    mockGet.mockImplementation(async () => {
      getCount += 1
      return getCount === 1
        ? buildDto({
            hp: { current: 0, tempHp: 0, maxAdjustment: 0 },
            deathSaves: { successes: 2, failures: 1 },
          })
        : buildDto({
            hp: { current: 10, tempHp: 0, maxAdjustment: 0 },
            deathSaves: { successes: 2, failures: 1 },
            updatedAt: REFRESH_UPDATED_AT,
          })
    })
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    expect(cs.state.hp.current).toBe(0)
    expect(cs.state.deathSaves).toEqual({ successes: 2, failures: 1 })

    // 觸發任意 mutation → debounce → PATCH → GET 套用第二份 DTO（HP 從 0 → 10）
    cs.adjustAc(1)
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    await nextTick()
    await nextTick()

    // server 帶來的 HP 0→10 不可在 applyServerDto 期間誤觸 watcher 把 deathSaves 清成 0
    expect(cs.state.hp.current).toBe(10)
    expect(cs.state.deathSaves).toEqual({ successes: 2, failures: 1 })
  })
})

describe('useCharacterCombatState — 持久化', () => {
  const PERSIST_DEBOUNCE_MS = 300

  /** 把 mock 已排入的 microtask 跑完並推進 debounce */
  const flushPersist = async (): Promise<void> => {
    await nextTick()
    await vi.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS)
  }

  it('load 之後狀態變動 debounce 結束應 PATCH /combat-state', async () => {
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    mockPatch.mockClear()

    cs.damageHp(5)
    await nextTick()
    expect(mockPatch).not.toHaveBeenCalled()

    await flushPersist()
    expect(mockPatch).toHaveBeenCalledTimes(1)
    const [id, body] = mockPatch.mock.calls[0]!
    expect(id).toBe(CHAR_ID)
    expect(body.updatedAt).toBe(INITIAL_UPDATED_AT)
    expect(body.hp!.current).toBe(25)
  })

  it('未 load 時狀態變動不會 PATCH', async () => {
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    cs.damageHp(5)
    await flushPersist()
    expect(mockPatch).not.toHaveBeenCalled()
  })

  it('load() 完成後沒有 user mutation 時不應觸發 PATCH', async () => {
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    await flushPersist()
    expect(mockPatch).not.toHaveBeenCalled()
    // 只應有 load() 那次 GET，沒有 re-GET
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('PATCH 後 re-GET 寫回 updatedAt 不應再次觸發 PATCH', async () => {
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    mockPatch.mockClear()
    mockGet.mockClear()

    cs.damageHp(5)
    await flushPersist()
    await nextTick()

    // 第一輪：PATCH + 一次 re-GET
    expect(mockPatch).toHaveBeenCalledTimes(1)
    expect(mockGet).toHaveBeenCalledTimes(1)

    // 等 debounce 再過一輪：不應有第二次 PATCH
    await flushPersist()
    expect(mockPatch).toHaveBeenCalledTimes(1)
  })

  it('PATCH 成功後應再 GET 一次以刷新 updatedAt', async () => {
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    expect(cs.state.updatedAt).toBe(INITIAL_UPDATED_AT)

    cs.damageHp(5)
    await flushPersist()
    await nextTick()

    expect(cs.state.updatedAt).toBe(REFRESH_UPDATED_AT)
  })

  it('scope 結束時應只做純清理（不自動 flush）；caller 應顯式呼叫 flushPersist 保存最後一次寫入', async () => {
    const scope = effectScope()
    let captured: ReturnType<typeof useCharacterCombatState> | null = null
    scope.run(() => {
      captured = useCharacterCombatState(CHAR_ID, ref(30))
    })
    await captured!.load()
    mockPatch.mockClear()
    captured!.damageHp(5)

    await nextTick()
    expect(mockPatch).not.toHaveBeenCalled()

    scope.stop()
    await nextTick()
    // dispose 不再 fire-and-forget；pending debounce 應被 cancel
    expect(mockPatch).not.toHaveBeenCalled()
  })

  it('caller 可在 scope 結束前顯式 await flushPersist 保存最後一次寫入', async () => {
    const scope = effectScope()
    let captured: ReturnType<typeof useCharacterCombatState> | null = null
    scope.run(() => {
      captured = useCharacterCombatState(CHAR_ID, ref(30))
    })
    await captured!.load()
    mockPatch.mockClear()
    captured!.damageHp(5)
    await nextTick()
    expect(mockPatch).not.toHaveBeenCalled()

    await captured!.flushPersist()
    expect(mockPatch).toHaveBeenCalledTimes(1)

    scope.stop()
  })

  it('不同 character 各自呼叫對應 id', async () => {
    const a = useCharacterCombatState('a', ref(30))
    const b = useCharacterCombatState('b', ref(20))
    await a.load()
    await b.load()
    mockPatch.mockClear()

    a.damageHp(5)
    b.damageHp(2)
    await flushPersist()

    const ids = mockPatch.mock.calls.map((c) => c[0])
    expect(ids).toContain('a')
    expect(ids).toContain('b')
  })

  it('PATCH 飛行期間 user 再次 mutate 時，GET 不應覆蓋該 mutation', async () => {
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    mockPatch.mockClear()
    mockGet.mockClear()

    // PATCH 與 GET 都用 deferred promise，模擬網路飛行中
    let resolvePatch1: () => void = () => {}
    let resolveGet1: (dto: CombatStateDTO) => void = () => {}
    mockPatch.mockImplementationOnce(
      () =>
        new Promise<void>((res) => {
          resolvePatch1 = res
        }),
    )
    mockGet.mockImplementationOnce(
      () =>
        new Promise<CombatStateDTO>((res) => {
          resolveGet1 = res
        }),
    )

    // 第一次 mutate → 第一次 PATCH 起跑
    cs.damageHp(5)
    await nextTick()
    await vi.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS)
    expect(mockPatch).toHaveBeenCalledTimes(1)
    expect(cs.state.hp.current).toBe(25)

    // PATCH 飛行中，user 又 mutate（hp 25 → 20）
    cs.damageHp(5)
    await nextTick()
    expect(cs.state.hp.current).toBe(20)

    // 解開 PATCH1，GET1 回傳 server 端「只看到第一次 damage」的狀態（hp=25）
    resolvePatch1()
    await nextTick()
    resolveGet1(
      buildDto({ hp: { current: 25, tempHp: 0, maxAdjustment: 0 }, updatedAt: REFRESH_UPDATED_AT }),
    )
    await nextTick()
    await nextTick()

    // user 的第二次 damage 不可被覆蓋；token 仍應更新
    expect(cs.state.hp.current).toBe(20)
    expect(cs.state.updatedAt).toBe(REFRESH_UPDATED_AT)
  })

  const PERSIST_RETRY_MS = 2000

  it('PATCH 首次失敗應自動重試，重試成功不會 apiErrorToast 也不會暴露 mutationError', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    mockPatch.mockClear()
    mockPatch.mockRejectedValueOnce(new Error('boom'))
    mockPatch.mockResolvedValueOnce(undefined)

    cs.damageHp(5)
    await flushPersist()
    await nextTick()

    expect(mockPatch).toHaveBeenCalledTimes(1)
    expect(mockApiErrorHandle).not.toHaveBeenCalled()
    expect(cs.mutationError.value).toBeNull()

    await vi.advanceTimersByTimeAsync(PERSIST_RETRY_MS)
    await nextTick()
    await nextTick()

    expect(mockPatch).toHaveBeenCalledTimes(2)
    expect(mockApiErrorHandle).not.toHaveBeenCalled()
    expect(cs.mutationError.value).toBeNull()
  })

  it('連兩次 PATCH 失敗應暴露 mutationError 並透過 useApiErrorToast 通報', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    mockPatch.mockClear()
    const err = new Error('boom-twice')
    mockPatch.mockRejectedValue(err)

    cs.damageHp(5)
    await flushPersist()
    await nextTick()
    await vi.advanceTimersByTimeAsync(PERSIST_RETRY_MS)
    await nextTick()
    await nextTick()

    expect(mockPatch).toHaveBeenCalledTimes(2)
    expect(mockApiErrorHandle).toHaveBeenCalledTimes(1)
    expect(cs.mutationError.value).toBe(err)
  })

  it('暴露 mutationError 後 user 再次編輯，下一次成功 PATCH 應清空 mutationError', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    mockPatch.mockClear()
    const err = new Error('boom-then-ok')
    mockPatch.mockRejectedValueOnce(err)
    mockPatch.mockRejectedValueOnce(err)

    cs.damageHp(5)
    await flushPersist()
    await nextTick()
    await vi.advanceTimersByTimeAsync(PERSIST_RETRY_MS)
    await nextTick()
    await nextTick()

    expect(cs.mutationError.value).toBe(err)

    mockPatch.mockResolvedValueOnce(undefined)
    cs.damageHp(1)
    await flushPersist()
    await nextTick()
    await nextTick()

    expect(cs.mutationError.value).toBeNull()
  })
})

describe('useCharacterCombatState — 短長休', () => {
  const PERSIST_DEBOUNCE_MS = 300

  const flushPersist = async (): Promise<void> => {
    await nextTick()
    await vi.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS)
  }

  it('shortRest 應呼叫 POST /short-rest 後再 GET 套用 server state', async () => {
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    mockGet.mockClear()
    mockShortRest.mockClear()

    // 模擬 backend 完成 short rest 後 GET 回新狀態
    mockGet.mockResolvedValueOnce(buildDto({ pactSlotsUsed: {}, updatedAt: REFRESH_UPDATED_AT }))

    const ok = await cs.shortRest()

    expect(ok).toBe(true)
    expect(mockShortRest).toHaveBeenCalledExactlyOnceWith(CHAR_ID, {
      expectedUpdatedAt: INITIAL_UPDATED_AT,
    })
    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(cs.state.updatedAt).toBe(REFRESH_UPDATED_AT)
  })

  it('longRest 應呼叫 POST /long-rest 後再 GET 套用 server state', async () => {
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    mockGet.mockClear()
    mockLongRest.mockClear()

    mockGet.mockResolvedValueOnce(
      buildDto({
        hp: { current: null, tempHp: 0, maxAdjustment: 0 },
        updatedAt: REFRESH_UPDATED_AT,
      }),
    )

    const ok = await cs.longRest()

    expect(ok).toBe(true)
    expect(mockLongRest).toHaveBeenCalledExactlyOnceWith(CHAR_ID, {
      expectedUpdatedAt: INITIAL_UPDATED_AT,
    })
    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(cs.state.updatedAt).toBe(REFRESH_UPDATED_AT)
  })

  it('未 load 時 shortRest / longRest 應為 no-op 且回傳 false', async () => {
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    expect(await cs.shortRest()).toBe(false)
    expect(await cs.longRest()).toBe(false)
    expect(mockShortRest).not.toHaveBeenCalled()
    expect(mockLongRest).not.toHaveBeenCalled()
  })

  it('rest 套用 server state 後不應觸發額外 PATCH', async () => {
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    mockPatch.mockClear()

    await cs.shortRest()
    await flushPersist()
    expect(mockPatch).not.toHaveBeenCalled()
  })

  it('rest 前若有 pending PATCH，應被 flush 送出（不可丟失本地未存變更）', async () => {
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    mockPatch.mockClear()
    mockShortRest.mockClear()

    cs.damageHp(5)
    await nextTick()
    // 此時 debounce 尚未 fire，PATCH pending

    await cs.shortRest()

    // PATCH 應在 shortRest endpoint 之前送出，且 body 反映本地新值
    expect(mockPatch).toHaveBeenCalledTimes(1)
    expect(mockShortRest).toHaveBeenCalledTimes(1)
    const patchOrder = mockPatch.mock.invocationCallOrder[0]!
    const restOrder = mockShortRest.mock.invocationCallOrder[0]!
    expect(patchOrder).toBeLessThan(restOrder)
    const [, body] = mockPatch.mock.calls[0]!
    expect(body.hp!.current).toBe(25)
  })

  it('flush 過程中暴露 mutationError 時應略過 rest endpoint（不犧牲本地資料）', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    mockPatch.mockClear()
    mockShortRest.mockClear()
    mockApiErrorHandle.mockClear()

    // PATCH 連續兩次都失敗 → flushPersist 後 mutationError 會被設值
    const err = new Error('patch-down')
    mockPatch.mockRejectedValue(err)

    cs.damageHp(5)
    await nextTick()
    const restPromise = cs.shortRest()
    // 第一次失敗會排 2000ms 重試，flushPersist 會立刻 fire 重試
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(300)
    await vi.advanceTimersByTimeAsync(0)
    const ok = await restPromise

    expect(ok).toBe(false)
    expect(mockShortRest).not.toHaveBeenCalled()
    expect(cs.mutationError.value).toBe(err)
  })

  it('shortRest POST→GET 飛行期間 user 改 state 不應觸發 PATCH（避免覆蓋 server-authoritative 結果）', async () => {
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    mockPatch.mockClear()
    mockShortRest.mockClear()

    let resolveRest: () => void = () => {}
    mockShortRest.mockImplementationOnce(() => new Promise<void>((res) => (resolveRest = res)))
    mockGet.mockResolvedValueOnce(
      buildDto({
        hp: { current: 30, tempHp: 0, maxAdjustment: 0 },
        updatedAt: REFRESH_UPDATED_AT,
      }),
    )

    const restPromise = cs.shortRest()
    await nextTick()

    // POST 飛行中 user 又改 HP；persist watch 應被 isReady=false 擋住
    cs.damageHp(7)
    await nextTick()
    await vi.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS)
    await nextTick()
    expect(mockPatch).not.toHaveBeenCalled()

    resolveRest()
    await restPromise
    await nextTick()

    // server-authoritative 結果生效，且 rest 後 isReady 應已恢復可用
    expect(cs.state.hp.current).toBe(30)
    expect(mockPatch).not.toHaveBeenCalled()

    // rest 後 user 再 mutate 應正常觸發 PATCH（驗證 isReady 已還原）
    cs.damageHp(3)
    await nextTick()
    await vi.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS)
    await nextTick()
    expect(mockPatch).toHaveBeenCalledTimes(1)
  })

  it('shortRest POST 失敗時應透過 useApiErrorToast 通報並回傳 false', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    mockShortRest.mockRejectedValueOnce(new Error('boom'))

    const ok = await cs.shortRest()

    expect(ok).toBe(false)
    expect(mockApiErrorHandle).toHaveBeenCalled()
  })
})

describe('useCharacterCombatState — combatReset', () => {
  const PERSIST_DEBOUNCE_MS = 300
  const PERSIST_RETRY_MS = 2000

  it('combatReset 應呼叫 POST /reset 後再 GET 套用 server state', async () => {
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()
    mockGet.mockClear()
    mockResetEndpoint.mockClear()
    mockGet.mockResolvedValueOnce(buildDto({ updatedAt: REFRESH_UPDATED_AT }))

    const ok = await cs.combatReset()

    expect(ok).toBe(true)
    expect(mockResetEndpoint).toHaveBeenCalledExactlyOnceWith(CHAR_ID, {
      expectedUpdatedAt: INITIAL_UPDATED_AT,
    })
    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(cs.state.updatedAt).toBe(REFRESH_UPDATED_AT)
  })

  it('reset 應清掉先前 PATCH 失敗排定的 retry timer，避免 stale PATCH 在 reset 後 fire', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()

    // 先製造一次失敗 → retryScheduled=true、retryTimer 排定 2000ms 後重試
    mockPatch.mockRejectedValueOnce(new Error('boom'))
    cs.damageHp(5)
    await nextTick()
    await vi.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS)
    await nextTick()
    expect(mockPatch).toHaveBeenCalledTimes(1)

    mockPatch.mockClear()
    mockResetEndpoint.mockClear()

    await cs.combatReset()

    // 推進到原本 retry 應該 fire 的時間；新增的 cleanup 應已 clear timer，PATCH 不應再被呼叫
    await vi.advanceTimersByTimeAsync(PERSIST_RETRY_MS)
    await nextTick()
    expect(mockPatch).not.toHaveBeenCalled()
  })

  it('reset 後 mutationError 應被清空', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const cs = useCharacterCombatState(CHAR_ID, ref(30))
    await cs.load()

    const err = new Error('twice')
    mockPatch.mockRejectedValue(err)
    cs.damageHp(5)
    await nextTick()
    await vi.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS)
    await nextTick()
    await vi.advanceTimersByTimeAsync(PERSIST_RETRY_MS)
    await nextTick()
    expect(cs.mutationError.value).toBe(err)

    mockPatch.mockReset()
    mockPatch.mockResolvedValue(undefined)

    await cs.combatReset()
    expect(cs.mutationError.value).toBeNull()
  })
})
