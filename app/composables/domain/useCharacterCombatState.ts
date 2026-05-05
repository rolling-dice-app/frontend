import type { Ref } from 'vue'
import { PROFESSION_CONFIG } from '~/constants/dnd'
import { getCombatStateStorageKey } from '~/constants/storage'
import { calculateTotalLevel } from '~/helpers/character'
import type {
  CombatState,
  ProfessionEntry,
  SpellLevel,
  AbilityKey,
  ProfessionKey,
} from '@rolling-dice-app/types'

const PERSIST_DEBOUNCE_MS = 300

function createDefaultState(characterId: string): CombatState {
  return {
    characterId,
    hp: { current: null, tempHp: 0, maxAdjustment: 0 },
    acAdjustment: 0,
    speedAdjustment: 0,
    savingThrowAdjustments: {},
    featureUsesSpent: {},
    hitDiceUsed: {},
    spellSlotsUsed: {},
    pactSlotsUsed: {},
    deathSaves: { successes: 0, failures: 0 },
    updatedAt: new Date().toISOString(),
  }
}

function clampDeathSaveCount(value: number | undefined): number {
  return Math.min(3, Math.max(0, Math.floor(value ?? 0)))
}

function normalizeState(stored: Partial<CombatState>, characterId: string): CombatState {
  const fallback = createDefaultState(characterId)
  return {
    characterId,
    hp: {
      current: stored.hp?.current ?? null,
      tempHp: Math.max(0, stored.hp?.tempHp ?? 0),
      maxAdjustment: stored.hp?.maxAdjustment ?? 0,
    },
    acAdjustment: stored.acAdjustment ?? 0,
    speedAdjustment: stored.speedAdjustment ?? 0,
    savingThrowAdjustments: { ...stored.savingThrowAdjustments },
    featureUsesSpent: { ...stored.featureUsesSpent },
    hitDiceUsed: { ...stored.hitDiceUsed },
    spellSlotsUsed: { ...stored.spellSlotsUsed },
    pactSlotsUsed: { ...stored.pactSlotsUsed },
    deathSaves: {
      successes: clampDeathSaveCount(stored.deathSaves?.successes),
      failures: clampDeathSaveCount(stored.deathSaves?.failures),
    },
    updatedAt: stored.updatedAt ?? fallback.updatedAt,
  }
}

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

function sumUsedSlots(used: Partial<Record<SpellLevel, number>>): number {
  return Object.values(used).reduce((sum, n) => sum + (n ?? 0), 0)
}

/** 長休：總回復額為 floor(totalLevel/2)（至少 1），依骰面由大到小貪婪分配 */
function recoverHitDice(
  used: Partial<Record<ProfessionKey, number>>,
  professions: readonly ProfessionEntry[],
): Partial<Record<ProfessionKey, number>> {
  const totalLevel = calculateTotalLevel(professions)
  if (totalLevel === 0) return {}

  const sorted = [...professions].sort(
    (a, b) => PROFESSION_CONFIG[b.profession].hitDie - PROFESSION_CONFIG[a.profession].hitDie,
  )

  let pool = Math.max(1, Math.floor(totalLevel / 2))
  const result: Partial<Record<ProfessionKey, number>> = {}

  for (const entry of sorted) {
    const currentlyUsed = used[entry.profession] ?? 0
    if (currentlyUsed === 0) continue
    const recover = pool > 0 ? Math.min(currentlyUsed, pool) : 0
    pool -= recover
    const remaining = currentlyUsed - recover
    if (remaining > 0) {
      result[entry.profession] = remaining
    }
  }

  return result
}

/**
 * 角色速查使用的戰況追蹤狀態：HP / 臨時生命 / AC・速度・豁免的臨時調整。
 * 以獨立 localStorage key 儲存，重整後可還原；與 Character 主資料完全隔離。
 */
export function useCharacterCombatState(characterId: string, baseMaxHp: Ref<number>) {
  const storageKey = getCombatStateStorageKey(characterId)
  const stored = getLocalStorage<CombatState>(storageKey)
  const state = reactive<CombatState>(
    stored ? normalizeState(stored, characterId) : createDefaultState(characterId),
  )

  /** 經調整後的最大生命；不可低於 1 */
  const effectiveMaxHp = computed(() => Math.max(1, baseMaxHp.value + state.hp.maxAdjustment))

  function clampHp(value: number): number {
    return Math.min(Math.max(0, value), effectiveMaxHp.value)
  }

  function touch(): void {
    state.updatedAt = new Date().toISOString()
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
    touch()
  }

  function healHp(amount: number): void {
    if (amount <= 0) return
    state.hp.current = clampHp(displayCurrentHp.value + amount)
    touch()
  }

  function setTempHp(value: number): void {
    state.hp.tempHp = Math.max(0, value)
    touch()
  }

  function adjustTempHp(delta: number): void {
    state.hp.tempHp = Math.max(0, state.hp.tempHp + delta)
    touch()
  }

  function adjustMaxHp(delta: number): void {
    state.hp.maxAdjustment += delta
    if (state.hp.current !== null) {
      state.hp.current = clampHp(state.hp.current)
    }
    touch()
  }

  function resetHp(): void {
    state.hp.current = null
    state.hp.tempHp = 0
    state.hp.maxAdjustment = 0
    touch()
  }

  // ─── Death saves ──────────────────────────────────────────────────────

  function setDeathSaveSuccess(value: number): void {
    state.deathSaves.successes = clampDeathSaveCount(value)
    touch()
  }

  function setDeathSaveFailure(value: number): void {
    state.deathSaves.failures = clampDeathSaveCount(value)
    touch()
  }

  function resetDeathSaves(): void {
    state.deathSaves.successes = 0
    state.deathSaves.failures = 0
    touch()
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
    touch()
  }

  function adjustSpeed(delta: number): void {
    state.speedAdjustment += delta
    touch()
  }

  function adjustSavingThrow(key: AbilityKey, delta: number): void {
    const current = state.savingThrowAdjustments[key] ?? 0
    state.savingThrowAdjustments = setSparseRecord(
      state.savingThrowAdjustments,
      key,
      current + delta,
      0,
    )
    touch()
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
    touch()
  }

  /** 對指定特性已使用次數 +/- delta，clamp 至 [0, max] */
  function adjustFeatureUseSpent(featureId: string, delta: number, max: number): void {
    if (delta === 0) return
    setFeatureUseSpent(featureId, getFeatureUseSpent(featureId) + delta, max)
  }

  // ─── Hit dice ─────────────────────────────────────────────────────────

  /** 取得指定職業已使用生命骰數，未追蹤時回傳 0 */
  function getHitDiceUsed(profession: ProfessionKey): number {
    return state.hitDiceUsed[profession] ?? 0
  }

  /** 設定指定職業已使用生命骰數，clamp 至 [0, level] */
  function setHitDiceUsed(profession: ProfessionKey, value: number, level: number): void {
    const clamped = Math.min(Math.max(0, value), level)
    state.hitDiceUsed = setSparseRecord(state.hitDiceUsed, profession, clamped, 0)
    touch()
  }

  /** 調整指定職業已使用生命骰數，clamp 至 [0, level] */
  function adjustHitDiceUsed(profession: ProfessionKey, delta: number, level: number): void {
    if (delta === 0) return
    setHitDiceUsed(profession, getHitDiceUsed(profession) + delta, level)
  }

  // ─── Spell slots ──────────────────────────────────────────────────────

  function getSpellSlotUsed(level: SpellLevel): number {
    return state.spellSlotsUsed[level] ?? 0
  }

  function setSpellSlotUsed(level: SpellLevel, value: number, max: number): void {
    const clamped = Math.min(Math.max(0, value), Math.max(0, max))
    state.spellSlotsUsed = setSparseRecord(state.spellSlotsUsed, level, clamped, 0)
    touch()
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
    touch()
  }

  function adjustPactSlotUsed(level: SpellLevel, delta: number, max: number): void {
    if (delta === 0) return
    setPactSlotUsed(level, getPactSlotUsed(level) + delta, max)
  }

  // ─── Rests ────────────────────────────────────────────────────────────

  /**
   * 短休：恢復傳入 id 對應的特性次數與全部契術環位，HP 與其他臨時調整不變。
   * 回傳是否有實際變更，供呼叫端決定是否顯示完成訊息。
   */
  function shortRest(shortRestFeatureIds: string[]): boolean {
    const targets = new Set(shortRestFeatureIds)
    const hasPactToRecover = sumUsedSlots(state.pactSlotsUsed) > 0

    if (targets.size === 0 && !hasPactToRecover) return false

    if (targets.size > 0) {
      state.featureUsesSpent = Object.fromEntries(
        Object.entries(state.featureUsesSpent).filter(([k]) => !targets.has(k)),
      ) as Partial<Record<string, number>>
    }
    if (hasPactToRecover) {
      state.pactSlotsUsed = {}
    }
    touch()
    return true
  }

  /**
   * 長休：HP 回滿、清空臨時調整、清空指定 id 對應的特性次數與所有法術位，
   * 依「大骰面優先」貪婪回復生命骰。傳入的 longRestFeatureIds 應涵蓋
   * recovery 為 shortRest 或 longRest 的特性；recovery 為 manual 的特性
   * 由 caller 排除即可保留次數。
   */
  function longRest(
    professions: readonly ProfessionEntry[] = [],
    longRestFeatureIds: readonly string[] = [],
  ): void {
    state.hp.current = null
    state.hp.tempHp = 0
    state.hp.maxAdjustment = 0
    state.acAdjustment = 0
    state.speedAdjustment = 0
    state.savingThrowAdjustments = {}
    if (longRestFeatureIds.length > 0) {
      const targets = new Set(longRestFeatureIds)
      state.featureUsesSpent = Object.fromEntries(
        Object.entries(state.featureUsesSpent).filter(([k]) => !targets.has(k)),
      ) as Partial<Record<string, number>>
    }
    state.hitDiceUsed = recoverHitDice(state.hitDiceUsed, professions)
    state.spellSlotsUsed = {}
    state.pactSlotsUsed = {}
    state.deathSaves.successes = 0
    state.deathSaves.failures = 0
    touch()
  }

  // ─── Persist ──────────────────────────────────────────────────────────

  let hasNotifiedFailure = false
  const persist = debounce((snapshot: CombatState) => {
    if (setLocalStorage(storageKey, snapshot)) {
      hasNotifiedFailure = false
    } else if (!hasNotifiedFailure) {
      hasNotifiedFailure = true
      useToast().error('更新失敗，重整後資料可能遺失')
    }
  }, PERSIST_DEBOUNCE_MS)

  watch(
    () => state,
    (current) => persist(JSON.parse(JSON.stringify(current)) as CombatState),
    { deep: true },
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      persist.flush()
    })
  }

  return {
    state: readonly(state),
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
