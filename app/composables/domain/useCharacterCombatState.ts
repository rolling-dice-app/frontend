import type { Ref } from 'vue'
import {
  buildCombatStateBodyDefaults,
  COMBAT_STATE_LIMITS,
  DEATH_SAVE_THRESHOLD,
  type CombatStateDTO,
  type CombatStateUpdateDTO,
  type SpellLevel,
  type AbilityKey,
  type ClassKey,
} from '@rolling-dice-app/core'
import { createPersistPipeline } from '~/utils/persist-pipeline'

const PERSIST_DEBOUNCE_MS = 300
const PERSIST_RETRY_MS = 2000

const createDefaultState = (characterId: string): CombatStateDTO => ({
  characterId,
  ...buildCombatStateBodyDefaults(),
  updatedAt: new Date(0).toISOString(),
})

const clampDeathSave = (value: number): number =>
  Math.min(DEATH_SAVE_THRESHOLD, Math.max(0, Math.floor(value)))

/** 夾在 ±absMax（防 JSONB 塞爆，對齊 core COMBAT_STATE_LIMITS 的 _ABS_MAX 上限） */
const clampAbs = (value: number, absMax: number): number =>
  Math.min(absMax, Math.max(-absMax, value))

/** 將 record[key] 設為 value，等於 defaultValue 時從 record 移除該 key 以保持稀疏 */
function setSparseRecord<K extends string | number, T>(
  record: Partial<Record<K, T>>,
  key: K,
  value: T,
  defaultValue: T,
): Partial<Record<K, T>> {
  const keyStr = String(key)
  const rest = Object.fromEntries(Object.entries(record).filter(([k]) => k !== keyStr)) as Partial<
    Record<K, T>
  >
  return value === defaultValue ? rest : { ...rest, [key]: value }
}

/**
 * 角色速查使用的戰況追蹤狀態：HP / 臨時生命 / AC・速度・豁免的臨時調整。
 * 透過 /characters/:id/combat-state 與 backend 同步；caller 需呼叫 load() 啟動載入。
 */
export function useCharacterCombatState(characterId: string, baseMaxHp: Ref<number>) {
  const apiErrorToast = useApiErrorToast()
  const state = reactive<CombatStateDTO>(createDefaultState(characterId))

  const isLoading = ref(false)
  const loadError = ref<unknown>(null)
  const isReady = ref(false)
  const isResting = ref(false)
  const isResetting = ref(false)

  /** 經調整後的最大生命；不可低於 1 */
  const effectiveMaxHp = computed(() => Math.max(1, baseMaxHp.value + state.hp.maxAdjustment))

  function clampHp(value: number): number {
    return Math.min(Math.max(0, value), effectiveMaxHp.value)
  }

  // ─── Load / sync ──────────────────────────────────────────────────────

  /** 套用 server 回傳的 DTO；期間 isReady=false 讓 watch 略過、避免觸發多餘 PATCH */
  const applyServerDto = async (dto: CombatStateDTO): Promise<void> => {
    isReady.value = false
    Object.assign(state, dto)
    await nextTick()
    isReady.value = true
  }

  const load = async (): Promise<void> => {
    isLoading.value = true
    loadError.value = null
    try {
      const dto = await characters().combatState.get(characterId)
      await applyServerDto(dto)
    } catch (err) {
      loadError.value = err
    } finally {
      isLoading.value = false
    }
  }

  // ─── HP ───────────────────────────────────────────────────────────────

  /** 顯示用當前 HP；尚未追蹤時回傳 effectiveMaxHp */
  const displayCurrentHp = computed(() =>
    state.hp.current === null ? effectiveMaxHp.value : state.hp.current,
  )

  function adjustHp(delta: number): void {
    if (delta === 0) return
    if (delta > 0) healHp(delta)
    else damageHp(-delta)
  }

  function damageHp(amount: number): void {
    if (amount <= 0) return
    let remaining = amount
    if (state.hp.tempHp > 0) {
      const absorbed = Math.min(state.hp.tempHp, remaining)
      state.hp.tempHp -= absorbed
      remaining -= absorbed
    }
    if (remaining > 0) {
      state.hp.current = clampHp(displayCurrentHp.value - remaining)
    }
  }

  function healHp(amount: number): void {
    if (amount <= 0) return
    state.hp.current = clampHp(displayCurrentHp.value + amount)
  }

  function setTempHp(value: number): void {
    state.hp.tempHp = Math.max(0, value)
  }

  function adjustTempHp(delta: number): void {
    state.hp.tempHp = Math.max(0, state.hp.tempHp + delta)
  }

  function adjustMaxHp(delta: number): void {
    state.hp.maxAdjustment += delta
    if (state.hp.current !== null) {
      state.hp.current = clampHp(state.hp.current)
    }
  }

  function resetHp(): void {
    state.hp.current = null
    state.hp.tempHp = 0
    state.hp.maxAdjustment = 0
  }

  // ─── Death saves ──────────────────────────────────────────────────────

  function setDeathSaveSuccess(value: number): void {
    state.deathSaves.successes = clampDeathSave(value)
  }

  function setDeathSaveFailure(value: number): void {
    state.deathSaves.failures = clampDeathSave(value)
  }

  function resetDeathSaves(): void {
    state.deathSaves.successes = 0
    state.deathSaves.failures = 0
  }

  watch(
    displayCurrentHp,
    (next, prev) => {
      if (!isReady.value) return
      if (prev === 0 && next > 0) {
        resetDeathSaves()
      }
    },
    { flush: 'sync' },
  )

  // ─── Adjustments ──────────────────────────────────────────────────────

  function adjustAc(delta: number): void {
    state.acAdjustment = clampAbs(
      state.acAdjustment + delta,
      COMBAT_STATE_LIMITS.AC_ADJUSTMENT_ABS_MAX,
    )
  }

  function adjustSpeed(delta: number): void {
    state.speedAdjustment = clampAbs(
      state.speedAdjustment + delta,
      COMBAT_STATE_LIMITS.SPEED_ADJUSTMENT_ABS_MAX,
    )
  }

  function adjustSavingThrow(key: AbilityKey, delta: number): void {
    const current = state.savingThrowAdjustments[key] ?? 0
    const next = clampAbs(current + delta, COMBAT_STATE_LIMITS.SAVING_THROW_ADJUSTMENT_ABS_MAX)
    state.savingThrowAdjustments = setSparseRecord(state.savingThrowAdjustments, key, next, 0)
  }

  // ─── Feature uses ─────────────────────────────────────────────────────

  /** 取得指定特性已使用次數，未追蹤時回傳 0 */
  function getFeatureUseSpent(featureId: string): number {
    return state.featureUsesSpent[featureId] ?? 0
  }

  /** 取得指定特性剩餘次數（max - spent，clamp 至 [0, max]）；UI 顯示用 */
  function getFeatureUseRemaining(featureId: string, max: number): number {
    return Math.min(max, Math.max(0, max - getFeatureUseSpent(featureId)))
  }

  /** 直接設定指定特性已使用次數，clamp 至 [0, max]；spent = 0 時從 record 移除 */
  function setFeatureUseSpent(featureId: string, value: number, max: number): void {
    const clamped = Math.min(Math.max(0, value), max)
    state.featureUsesSpent = setSparseRecord(state.featureUsesSpent, featureId, clamped, 0)
  }

  /** 對指定特性已使用次數 +/- delta，clamp 至 [0, max] */
  function adjustFeatureUseSpent(featureId: string, delta: number, max: number): void {
    if (delta === 0) return
    setFeatureUseSpent(featureId, getFeatureUseSpent(featureId) + delta, max)
  }

  // ─── Hit dice ─────────────────────────────────────────────────────────

  /** 取得指定職業已使用生命骰數，未追蹤時回傳 0 */
  function getHitDiceUsed(classKey: ClassKey): number {
    return state.hitDiceUsed[classKey] ?? 0
  }

  /** 設定指定職業已使用生命骰數，clamp 至 [0, level] */
  function setHitDiceUsed(classKey: ClassKey, value: number, level: number): void {
    const clamped = Math.min(Math.max(0, value), level)
    state.hitDiceUsed = setSparseRecord(state.hitDiceUsed, classKey, clamped, 0)
  }

  /** 調整指定職業已使用生命骰數，clamp 至 [0, level] */
  function adjustHitDiceUsed(classKey: ClassKey, delta: number, level: number): void {
    if (delta === 0) return
    setHitDiceUsed(classKey, getHitDiceUsed(classKey) + delta, level)
  }

  // ─── Spell slots ──────────────────────────────────────────────────────

  function getSpellSlotUsed(level: SpellLevel): number {
    return state.spellSlotsUsed[level] ?? 0
  }

  function setSpellSlotUsed(level: SpellLevel, value: number, max: number): void {
    const clamped = Math.min(Math.max(0, value), Math.max(0, max))
    state.spellSlotsUsed = setSparseRecord(state.spellSlotsUsed, level, clamped, 0)
  }

  function adjustSpellSlotUsed(level: SpellLevel, delta: number, max: number): void {
    if (delta === 0) return
    setSpellSlotUsed(level, getSpellSlotUsed(level) + delta, max)
  }

  function getPactSlotUsed(level: SpellLevel): number {
    return state.pactSlotsUsed[level] ?? 0
  }

  function setPactSlotUsed(level: SpellLevel, value: number, max: number): void {
    const clamped = Math.min(Math.max(0, value), Math.max(0, max))
    state.pactSlotsUsed = setSparseRecord(state.pactSlotsUsed, level, clamped, 0)
  }

  function adjustPactSlotUsed(level: SpellLevel, delta: number, max: number): void {
    if (delta === 0) return
    setPactSlotUsed(level, getPactSlotUsed(level) + delta, max)
  }

  // ─── Rests ────────────────────────────────────────────────────────────

  /** 短休：先 flush 任何 pending PATCH 避免 server re-GET 蓋掉本地未存變更，再呼叫 backend 並套用結果 */
  const shortRest = async (): Promise<boolean> => {
    if (!isReady.value || isResting.value) return false
    await flushPersist()
    if (mutationError.value) return false
    isResting.value = true
    // POST→GET 飛行期間 user 改 state 也會被 GET 結果覆蓋；isReady=false 攔截 persist watch 避免送出無效 PATCH
    isReady.value = false
    try {
      await characters().combatState.shortRest(characterId, {
        expectedUpdatedAt: state.updatedAt,
      })
      const dto = await characters().combatState.get(characterId)
      await applyServerDto(dto)
      return true
    } catch (err) {
      apiErrorToast.handle(err)
      return false
    } finally {
      isReady.value = true
      isResting.value = false
    }
  }

  /** 長休：先 flush 任何 pending PATCH 避免 server re-GET 蓋掉本地未存變更，再呼叫 backend 並套用結果 */
  const longRest = async (): Promise<boolean> => {
    if (!isReady.value || isResting.value) return false
    await flushPersist()
    if (mutationError.value) return false
    isResting.value = true
    isReady.value = false
    try {
      await characters().combatState.longRest(characterId, { expectedUpdatedAt: state.updatedAt })
      const dto = await characters().combatState.get(characterId)
      await applyServerDto(dto)
      return true
    } catch (err) {
      apiErrorToast.handle(err)
      return false
    } finally {
      isReady.value = true
      isResting.value = false
    }
  }

  /** 重置戰況追蹤資料：呼叫 backend 清空後 re-GET 套用 server state；回傳是否成功 */
  const combatReset = async (): Promise<boolean> => {
    if (!isReady.value || isResetting.value) return false
    // reset 會清空全部，故丟棄尚未發射的 pending 編輯（cancel 而非 flush）；
    // 但仍需等任何飛行中的 PATCH 結束，否則其 commit 會推進 server updatedAt 使 reset 樂觀鎖 409。
    await persist.cancelAndSettle(characterId)
    mutationError.value = null
    isResetting.value = true
    isReady.value = false
    try {
      await characters().combatState.reset(characterId, { expectedUpdatedAt: state.updatedAt })
      const dto = await characters().combatState.get(characterId)
      await applyServerDto(dto)
      return true
    } catch (err) {
      apiErrorToast.handle(err)
      return false
    } finally {
      isReady.value = true
      isResetting.value = false
    }
  }

  // ─── Persist（編排走 utils/persist-pipeline，此處只提供四個注入點） ──────

  /** 自動重試仍失敗後曝露給 UI 的最後一次錯誤；成功的 PATCH 會清空 */
  const mutationError = ref<unknown>(null)

  // 單一資源，故 key 固定為 characterId。
  // Contract 假設：backend PATCH /combat-state 為純 setter — 不做 server-side clamp / normalize /
  // 衍生欄位。否則 tokenOnly 分支只接 updatedAt 的策略會讓 local 與 server 在 user 飛行中又動的
  // 欄位上偏離。
  const persist = createPersistPipeline<string>({
    debounceMs: PERSIST_DEBOUNCE_MS,
    retryMs: PERSIST_RETRY_MS,

    send: async () => {
      const body: CombatStateUpdateDTO = {
        updatedAt: state.updatedAt,
        hp: { ...state.hp },
        acAdjustment: state.acAdjustment,
        speedAdjustment: state.speedAdjustment,
        savingThrowAdjustments: { ...state.savingThrowAdjustments },
        featureUsesSpent: { ...state.featureUsesSpent },
        hitDiceUsed: { ...state.hitDiceUsed },
        spellSlotsUsed: { ...state.spellSlotsUsed },
        pactSlotsUsed: { ...state.pactSlotsUsed },
        deathSaves: { ...state.deathSaves },
      }
      await characters().combatState.patch(characterId, body)
    },

    refetch: async (_key, { tokenOnly }) => {
      const fresh = await characters().combatState.get(characterId)
      // 飛行期間 user 又動了 state；只接新 token，data 留給下一輪 persist 帶出
      if (tokenOnly) state.updatedAt = fresh.updatedAt
      else await applyServerDto(fresh)
    },

    classifySendError: async (_key, err) => {
      if (apiErrorCodeOf(err) === 'STALE_COMBAT_STATE_VERSION') {
        // 資料已被其他來源改過：帶著作廢 token 重試只會再撞一次，改以 server 為準覆蓋本地
        await recoverFromServer()
        return 'expose'
      }
      return 'retry'
    },

    onError: (_key, err) => {
      mutationError.value = err
      apiErrorToast.handle(err)
    },
    onSuccess: () => {
      mutationError.value = null
    },
  })

  /** 409 stale 回復：re-GET 覆蓋本地未存編輯，讓後續 PATCH 帶得到有效 token */
  const recoverFromServer = async (): Promise<void> => {
    try {
      const fresh = await characters().combatState.get(characterId)
      await applyServerDto(fresh)
    } catch {
      // 連 GET 都失敗：保持現狀，下次變更或 load() 會再試
    }
  }

  /** 把 pending debounce / 失敗重試立刻送出並等飛行中的請求結束；rest 前用以避免本地未存變更被覆蓋 */
  const flushPersist = (): Promise<void> => persist.flush(characterId)

  watch(
    () => ({
      hp: state.hp,
      acAdjustment: state.acAdjustment,
      speedAdjustment: state.speedAdjustment,
      savingThrowAdjustments: state.savingThrowAdjustments,
      featureUsesSpent: state.featureUsesSpent,
      hitDiceUsed: state.hitDiceUsed,
      spellSlotsUsed: state.spellSlotsUsed,
      pactSlotsUsed: state.pactSlotsUsed,
      deathSaves: state.deathSaves,
    }),
    () => {
      if (!isReady.value) return
      persist.schedule(characterId)
    },
    { deep: true },
  )

  // scope dispose 只做純清理；保存最後一次寫入交由 caller 在 route leave 等可 await 的時機呼叫 flushPersist。
  if (getCurrentScope()) {
    onScopeDispose(() => {
      persist.cancel(characterId)
    })
  }

  return {
    state: readonly(state),
    isLoading,
    loadError,
    mutationError: readonly(mutationError),
    isReady,
    isResting,
    isResetting,
    load,
    retry: load,
    effectiveMaxHp,
    displayCurrentHp,
    adjustHp,
    damageHp,
    healHp,
    setTempHp,
    adjustTempHp,
    adjustMaxHp,
    resetHp,
    adjustAc,
    adjustSpeed,
    adjustSavingThrow,
    getFeatureUseSpent,
    getFeatureUseRemaining,
    setFeatureUseSpent,
    adjustFeatureUseSpent,
    getHitDiceUsed,
    setHitDiceUsed,
    adjustHitDiceUsed,
    getSpellSlotUsed,
    setSpellSlotUsed,
    adjustSpellSlotUsed,
    getPactSlotUsed,
    setPactSlotUsed,
    adjustPactSlotUsed,
    setDeathSaveSuccess,
    setDeathSaveFailure,
    resetDeathSaves,
    shortRest,
    longRest,
    combatReset,
    flushPersist,
  }
}
