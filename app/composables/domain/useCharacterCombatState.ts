import type { Ref } from 'vue'
import {
  buildCombatStateBodyDefaults,
  DEATH_SAVE_THRESHOLD,
  type CombatStateDTO,
  type CombatStateUpdateDTO,
  type SpellLevel,
  type AbilityKey,
  type ClassKey,
} from '@rolling-dice-app/core'

const PERSIST_DEBOUNCE_MS = 300

const createDefaultState = (characterId: string): CombatStateDTO => ({
  characterId,
  ...buildCombatStateBodyDefaults(),
  updatedAt: new Date(0).toISOString(),
})

const clampDeathSave = (value: number): number =>
  Math.min(DEATH_SAVE_THRESHOLD, Math.max(0, Math.floor(value)))

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
      if (prev === 0 && next > 0) {
        resetDeathSaves()
      }
    },
    { flush: 'sync' },
  )

  // ─── Adjustments ──────────────────────────────────────────────────────

  function adjustAc(delta: number): void {
    state.acAdjustment += delta
  }

  function adjustSpeed(delta: number): void {
    state.speedAdjustment += delta
  }

  function adjustSavingThrow(key: AbilityKey, delta: number): void {
    const current = state.savingThrowAdjustments[key] ?? 0
    state.savingThrowAdjustments = setSparseRecord(
      state.savingThrowAdjustments,
      key,
      current + delta,
      0,
    )
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

  /** 短休：呼叫 backend 計算恢復邏輯，完成後 re-GET 套用 server state；回傳是否成功 */
  const shortRest = async (): Promise<boolean> => {
    if (!isReady.value) return false
    persist.cancel()
    try {
      await characters().combatState.shortRest(characterId)
      const dto = await characters().combatState.get(characterId)
      await applyServerDto(dto)
      return true
    } catch (err) {
      apiErrorToast.handle(err)
      return false
    }
  }

  /** 長休：呼叫 backend 計算恢復邏輯（含 hit die 貪婪、HP 回滿等），完成後 re-GET 套用；回傳是否成功 */
  const longRest = async (): Promise<boolean> => {
    if (!isReady.value) return false
    persist.cancel()
    try {
      await characters().combatState.longRest(characterId)
      const dto = await characters().combatState.get(characterId)
      await applyServerDto(dto)
      return true
    } catch (err) {
      apiErrorToast.handle(err)
      return false
    }
  }

  // ─── Persist ──────────────────────────────────────────────────────────

  let inFlight = false
  /** 在 PATCH 飛行期間是否又被 user 動過；用來避免 GET response 覆蓋掉同時間的新改動 */
  let dirtyDuringPatch = false
  const persist = debounce(() => {
    void runPersist()
  }, PERSIST_DEBOUNCE_MS)

  async function runPersist(): Promise<void> {
    if (inFlight) {
      persist()
      return
    }
    inFlight = true
    dirtyDuringPatch = false
    try {
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
      const fresh = await characters().combatState.get(characterId)
      if (dirtyDuringPatch) {
        // 飛行期間 user 又動了 state；只接新 token，data 留給下一輪 persist 帶出
        state.updatedAt = fresh.updatedAt
      } else {
        await applyServerDto(fresh)
      }
    } catch (err) {
      apiErrorToast.handle(err)
    } finally {
      inFlight = false
    }
  }

  // 不把 state.updatedAt 納入 dep；server re-GET 寫回 updatedAt 不可觸發 persist。
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
      dirtyDuringPatch = true
      persist()
    },
    { deep: true },
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      persist.flush()
    })
  }

  return {
    state: readonly(state),
    isLoading,
    loadError,
    isReady,
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
  }
}
