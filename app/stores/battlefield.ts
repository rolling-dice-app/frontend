import type {
  AdhocUnitInput,
  BattlefieldAttackEntry,
  BattlefieldDTO,
  BattlefieldFaction,
  BattlefieldMemberSource,
  BattlefieldSessionOption,
  BattlefieldTemplateSource,
  BattlefieldUnit,
  EndBattleKeepFlags,
} from '~/types/business/battlefield'
import type { ConditionKey } from '@rolling-dice-app/core'
import { buildBattlefieldMockSeed } from '~/mocks/battlefield'
import {
  applyDamageToHp,
  applyHealToHp,
  buildMonsterInstanceName,
  combatantsOf,
  nextTurnTarget,
  resetUnitAfterBattle,
  sortCombatantsByInitiative,
} from '~/helpers/battlefield'
import { rollDie } from '~/helpers/dice'
import { createSingleFlight } from '~/utils/single-flight'

/** 進場單位先排最後，擲先攻或拖曳後歸位 */
const SORT_ORDER_LAST = 998
/** 顯示名長度上限（比照 demo；串接階段對齊 core caps） */
const UNIT_NAME_MAX_LENGTH = 30

export interface InitiativeRollResult {
  roll: number
  total: number
}

export interface EnemyInitiativeRollResult extends InitiativeRollResult {
  unitId: string
  name: string
}

/**
 * 即時戰場 store（m7.3）。
 *
 * UI 階段：內部以 `app/mocks/battlefield.ts` seed 的 in-memory 資料模擬後端（重整即還原）。
 * action 簽名對齊未來 API client；TODO(串接階段): 內部改走 api client，簽名與頁面不動。
 *
 * 讀取刻意不做 defensive clone（偏離 CRUD store 慣例）：戰場工作區是高頻互動的狀態機，
 * 頁面以 computed 直讀 store 反應式狀態、所有變更必經 action，clone 會斷開即時更新。
 */
export const useBattlefieldStore = defineStore('battlefield', () => {
  const battlefieldCache = ref(new Map<string, BattlefieldDTO>())
  const sessionSeeds = ref<
    {
      option: Omit<BattlefieldSessionOption, 'battlefieldId'>
      members: BattlefieldMemberSource[]
    }[]
  >([])
  const templates = ref<BattlefieldTemplateSource[]>([])

  const listLoading = ref(false)
  const listError = ref<unknown>(null)
  const listLoaded = ref(false)

  const detailLoading = ref(false)
  const detailError = ref<unknown>(null)

  /** 入口頁團務選項；battlefieldId 由 cache 即時推導（建立／刪除後自動同步） */
  const sessionOptions = computed<BattlefieldSessionOption[]>(() =>
    sessionSeeds.value.map((s) => ({
      ...s.option,
      battlefieldId:
        [...battlefieldCache.value.values()].find((bf) => bf.sessionId === s.option.sessionId)
          ?.id ?? null,
    })),
  )

  // ── mock 資料層（串接後整段移除） ──────────────────────────────────────────
  let seeded = false
  let mockIdCounter = 0
  const nextMockId = (prefix: string): string => `${prefix}-${++mockIdCounter}`

  /** 攻擊快照：deep clone 並重生行內 id（與來源互不同步、不回寫） */
  const snapshotAttacks = (attacks: BattlefieldAttackEntry[]): BattlefieldAttackEntry[] =>
    attacks.map((entry) => ({
      ...entry,
      id: nextMockId('bfa'),
      damageDice: entry.damageDice.map((line) => ({ ...line, id: nextMockId('bfd') })),
    }))

  /** 首次存取時把 seed clone 進 cache，模擬後端既有資料 */
  const ensureSeeded = (): void => {
    if (seeded) return
    seeded = true
    const seed = buildBattlefieldMockSeed()
    sessionSeeds.value = seed.sessions
    templates.value = seed.templates
    for (const bf of seed.battlefields) battlefieldCache.value.set(bf.id, bf)
  }

  const touch = (bf: BattlefieldDTO): void => {
    bf.updatedAt = new Date().toISOString()
  }

  // ── 內部查找 ───────────────────────────────────────────────────────────────
  const requireBattlefield = (battlefieldId: string): BattlefieldDTO => {
    const bf = battlefieldCache.value.get(battlefieldId)
    if (!bf) throw new Error(`battlefield not loaded: ${battlefieldId}`)
    return bf
  }

  const requireUnit = (bf: BattlefieldDTO, unitId: string): BattlefieldUnit => {
    const found = bf.units.find((u) => u.id === unitId)
    if (!found) throw new Error(`battlefield unit not found: ${unitId}`)
    return found
  }

  /** 依先攻重排參戰單位的 sortOrder（穩定、null 最後） */
  const resortByInitiative = (bf: BattlefieldDTO): void => {
    sortCombatantsByInitiative(combatantsOf(bf.units)).forEach((u, index) => {
      u.sortOrder = index
    })
  }

  // ── 資源 ───────────────────────────────────────────────────────────────────
  const listFlight = createSingleFlight(async (): Promise<BattlefieldSessionOption[]> => {
    listLoading.value = true
    listError.value = null
    try {
      ensureSeeded()
      listLoaded.value = true
      return sessionOptions.value
    } catch (error) {
      listError.value = error
      throw error
    } finally {
      listLoading.value = false
    }
  })
  const loadSessionOptions = (): Promise<BattlefieldSessionOption[]> => listFlight.run()

  /** 回傳 null 表示戰場不存在（頁面顯示 NotFound）。TODO(串接階段): 改以 404 FetchError 分流。 */
  const loadBattlefield = async (battlefieldId: string): Promise<BattlefieldDTO | null> => {
    detailLoading.value = true
    detailError.value = null
    try {
      ensureSeeded()
      return battlefieldCache.value.get(battlefieldId) ?? null
    } catch (error) {
      detailError.value = error
      throw error
    } finally {
      detailLoading.value = false
    }
  }

  /** 對外讀取：回傳 cache 內反應式物件（不 clone，見 store doc comment） */
  const getBattlefieldById = (battlefieldId: string): BattlefieldDTO | undefined =>
    battlefieldCache.value.get(battlefieldId)

  const createBattlefield = async (sessionId: string): Promise<BattlefieldDTO> => {
    ensureSeeded()
    const existing = [...battlefieldCache.value.values()].find((bf) => bf.sessionId === sessionId)
    if (existing) return existing
    const now = new Date().toISOString()
    const created: BattlefieldDTO = {
      id: nextMockId('bf'),
      sessionId,
      battleSequence: 1,
      round: 1,
      activeUnitId: null,
      inProgress: true,
      units: [],
      createdAt: now,
      updatedAt: now,
    }
    battlefieldCache.value.set(created.id, created)
    return created
  }

  /** hard-delete：刪除即團務結束，無結算（設計定稿第十二節） */
  const deleteBattlefield = async (battlefieldId: string): Promise<void> => {
    ensureSeeded()
    battlefieldCache.value.delete(battlefieldId)
  }

  /** 團務出席成員（快照來源）；戰場經 sessionId 回查 */
  const getMemberSources = (battlefieldId: string): BattlefieldMemberSource[] => {
    const bf = battlefieldCache.value.get(battlefieldId)
    if (!bf) return []
    return sessionSeeds.value.find((s) => s.option.sessionId === bf.sessionId)?.members ?? []
  }

  // ── 單位 ───────────────────────────────────────────────────────────────────
  /** 帶入出席成員：滿 HP 快照、直接參戰（已拍板）；已帶入者 no-op 回傳既有單位 */
  const importMember = (battlefieldId: string, shareId: string): BattlefieldUnit | null => {
    const bf = requireBattlefield(battlefieldId)
    const existing = bf.units.find((u) => u.kind === 'character' && u.shareId === shareId)
    if (existing) return existing
    const source = getMemberSources(battlefieldId).find((m) => m.shareId === shareId)
    if (!source || !source.available) return null
    const created: BattlefieldUnit = {
      id: nextMockId('bfu'),
      kind: 'character',
      shareId: source.shareId,
      templateId: null,
      faction: 'player',
      name: source.name,
      title: '',
      race: source.race,
      classes: source.classes.map((entry) => ({ ...entry })),
      maxHp: source.maxHp,
      baseMaxHp: source.maxHp,
      currentHp: source.maxHp,
      tempHp: 0,
      baseAc: source.ac,
      currentAc: source.ac,
      speed: source.speed,
      speedAdjustment: 0,
      initiativeBonus: source.totalInitiative,
      initiative: null,
      sortOrder: SORT_ORDER_LAST,
      conditions: [],
      inCombat: true,
      deathSaves: { successes: 0, failures: 0 },
      attacks: snapshotAttacks(source.attacks),
      skills: { ...source.skills },
    }
    bf.units.push(created)
    resortByInitiative(bf)
    if (bf.activeUnitId == null) bf.activeUnitId = created.id
    touch(bf)
    return created
  }

  /** 從怪物模板建立實例並直接參戰（已拍板取消兩段式）；自動編號 */
  const addMonsterInstance = (
    battlefieldId: string,
    templateId: string,
  ): BattlefieldUnit | null => {
    const bf = requireBattlefield(battlefieldId)
    const template = templates.value.find((tpl) => tpl.id === templateId)
    if (!template) return null
    const siblings = bf.units.filter((u) => u.templateId === templateId)
    const created: BattlefieldUnit = {
      id: nextMockId('bfu'),
      kind: 'monster',
      shareId: null,
      templateId: template.id,
      faction: 'enemy',
      name: buildMonsterInstanceName(
        template.name,
        siblings.length,
        bf.units.map((u) => u.name),
      ),
      title: template.challengeRating != null ? `CR ${template.challengeRating}` : '',
      race: null,
      classes: [],
      maxHp: template.hp,
      baseMaxHp: template.hp,
      currentHp: template.hp,
      tempHp: 0,
      baseAc: template.ac,
      currentAc: template.ac,
      speed: template.speed,
      speedAdjustment: 0,
      initiativeBonus: template.initiativeBonus,
      initiative: null,
      sortOrder: SORT_ORDER_LAST,
      conditions: [],
      inCombat: true,
      deathSaves: { successes: 0, failures: 0 },
      attacks: snapshotAttacks(template.attacks),
      skills: { ...template.skills },
    }
    bf.units.push(created)
    resortByInitiative(bf)
    if (bf.activeUnitId == null) bf.activeUnitId = created.id
    touch(bf)
    return created
  }

  /** 手動臨時單位（進 MVP，已拍板）：純手填、預設中立 */
  const createAdhocUnit = (
    battlefieldId: string,
    input: AdhocUnitInput,
    joinCombat: boolean,
  ): BattlefieldUnit => {
    const bf = requireBattlefield(battlefieldId)
    const maxHp = Math.max(1, input.maxHp)
    const ac = Math.max(0, input.ac)
    const created: BattlefieldUnit = {
      id: nextMockId('bfu'),
      kind: 'adhoc',
      shareId: null,
      templateId: null,
      faction: 'neutral',
      name: input.name.trim().slice(0, UNIT_NAME_MAX_LENGTH),
      title: '',
      race: null,
      classes: [],
      maxHp,
      baseMaxHp: maxHp,
      currentHp: maxHp,
      tempHp: 0,
      baseAc: ac,
      currentAc: ac,
      speed: Math.max(0, input.speed),
      speedAdjustment: 0,
      initiativeBonus: input.initiativeBonus,
      initiative: null,
      sortOrder: SORT_ORDER_LAST,
      conditions: [],
      inCombat: joinCombat,
      deathSaves: { successes: 0, failures: 0 },
      attacks: [],
      skills: {},
    }
    bf.units.push(created)
    if (joinCombat) {
      resortByInitiative(bf)
      if (bf.activeUnitId == null) bf.activeUnitId = created.id
    }
    touch(bf)
    return created
  }

  const enterCombat = (battlefieldId: string, unitId: string): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    if (target.inCombat) return
    target.inCombat = true
    target.sortOrder = SORT_ORDER_LAST
    resortByInitiative(bf)
    if (bf.activeUnitId == null) bf.activeUnitId = target.id
    touch(bf)
  }

  const leaveCombat = (battlefieldId: string, unitId: string): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    if (!target.inCombat) return
    // 行動中單位退場：先把行動權交給下一位；軌上只剩自己則清空
    if (bf.activeUnitId === unitId) {
      const ordered = combatantsOf(bf.units).map((u) => u.id)
      const step = nextTurnTarget(ordered, unitId, 1)
      bf.activeUnitId = step.activeUnitId === unitId ? null : step.activeUnitId
      bf.round = Math.max(1, bf.round + step.roundDelta)
    }
    target.inCombat = false
    touch(bf)
  }

  const removeUnit = (battlefieldId: string, unitId: string): void => {
    const bf = requireBattlefield(battlefieldId)
    if (bf.activeUnitId === unitId) bf.activeUnitId = null
    bf.units = bf.units.filter((u) => u.id !== unitId)
    touch(bf)
  }

  const renameUnit = (battlefieldId: string, unitId: string, name: string): void => {
    const bf = requireBattlefield(battlefieldId)
    const trimmed = name.trim().slice(0, UNIT_NAME_MAX_LENGTH)
    if (!trimmed) return
    requireUnit(bf, unitId).name = trimmed
    touch(bf)
  }

  const setFaction = (battlefieldId: string, unitId: string, faction: BattlefieldFaction): void => {
    const bf = requireBattlefield(battlefieldId)
    requireUnit(bf, unitId).faction = faction
    touch(bf)
  }

  // ── 狀態（conditions） ─────────────────────────────────────────────────────
  const addCondition = (
    battlefieldId: string,
    unitId: string,
    key: ConditionKey,
    note: string | null,
  ): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    const trimmed = note?.trim() ?? ''
    target.conditions.push({ id: nextMockId('bfc'), key, note: trimmed === '' ? null : trimmed })
    touch(bf)
  }

  const removeCondition = (battlefieldId: string, unitId: string, conditionId: string): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    target.conditions = target.conditions.filter((c) => c.id !== conditionId)
    touch(bf)
  }

  // ── 數值 ───────────────────────────────────────────────────────────────────
  /** HP ≥ 1 時死亡豁免歸零（比照 combat）；掛在所有可能改動 currentHp 的 action 尾端 */
  const clearDeathSavesIfUp = (target: BattlefieldUnit): void => {
    if (target.currentHp >= 1) target.deathSaves = { successes: 0, failures: 0 }
  }

  /** @returns 本次操作是否使單位倒下（HP 降到 0） */
  const applyDamage = (battlefieldId: string, unitId: string, amount: number): boolean => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    const wasUp = target.currentHp > 0
    const pools = applyDamageToHp(target, amount)
    target.currentHp = pools.currentHp
    target.tempHp = pools.tempHp
    clearDeathSavesIfUp(target)
    touch(bf)
    return wasUp && target.currentHp === 0
  }

  const applyHeal = (battlefieldId: string, unitId: string, amount: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    target.currentHp = applyHealToHp(target, amount).currentHp
    clearDeathSavesIfUp(target)
    touch(bf)
  }

  // ── 死亡豁免 ───────────────────────────────────────────────────────────────
  /** 僅 HP 0 時可計數（不變量守在 store，防多入口漏接）；值 clamp 0..3 */
  const setDeathSaveSuccesses = (battlefieldId: string, unitId: string, value: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    if (target.currentHp !== 0) return
    target.deathSaves.successes = Math.max(0, Math.min(3, value))
    touch(bf)
  }

  const setDeathSaveFailures = (battlefieldId: string, unitId: string, value: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    if (target.currentHp !== 0) return
    target.deathSaves.failures = Math.max(0, Math.min(3, value))
    touch(bf)
  }

  const adjustTempHp = (battlefieldId: string, unitId: string, delta: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    target.tempHp = Math.max(0, target.tempHp + delta)
    touch(bf)
  }

  /** 最大 HP 調整：上調同步加當前 HP（視為上限提升的即時增益）、下調只 clamp */
  const adjustMaxHp = (battlefieldId: string, unitId: string, delta: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    const previous = target.maxHp
    target.maxHp = Math.max(1, target.maxHp + delta)
    const grown = target.maxHp - previous
    if (grown > 0) target.currentHp += grown
    target.currentHp = Math.min(Math.max(target.currentHp, 0), target.maxHp)
    clearDeathSavesIfUp(target)
    touch(bf)
  }

  const adjustAc = (battlefieldId: string, unitId: string, delta: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    target.currentAc = Math.max(0, target.currentAc + delta)
    touch(bf)
  }

  /** 速度調整（疊加於 speed 快照）；快照未知（null）不可調，夾 ±99（契約 UNIT_SPEED_ADJUSTMENT_ABS_MAX） */
  const adjustSpeed = (battlefieldId: string, unitId: string, delta: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    if (target.speed == null) return
    target.speedAdjustment = Math.max(-99, Math.min(99, target.speedAdjustment + delta))
    touch(bf)
  }

  const setInitiative = (battlefieldId: string, unitId: string, value: number | null): void => {
    const bf = requireBattlefield(battlefieldId)
    requireUnit(bf, unitId).initiative = value
    resortByInitiative(bf)
    touch(bf)
  }

  const adjustInitiative = (battlefieldId: string, unitId: string, delta: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    target.initiative = (target.initiative ?? 0) + delta
    resortByInitiative(bf)
    touch(bf)
  }

  /** 擲先攻：1d20 + 加值，回傳骰面與總值供 toast 顯示 */
  const rollInitiative = (battlefieldId: string, unitId: string): InitiativeRollResult => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    const roll = rollDie(20)
    target.initiative = roll + target.initiativeBonus
    resortByInitiative(bf)
    touch(bf)
    return { roll, total: target.initiative }
  }

  /** 全部在場敵人重骰先攻；回傳逐筆結果（空陣列 = 沒有在場敵人），供 toast 與戰鬥紀錄 */
  const rollAllEnemyInitiatives = (battlefieldId: string): EnemyInitiativeRollResult[] => {
    const bf = requireBattlefield(battlefieldId)
    const enemies = combatantsOf(bf.units).filter((u) => u.faction === 'enemy')
    const results = enemies.map((enemy) => {
      const roll = rollDie(20)
      enemy.initiative = roll + enemy.initiativeBonus
      return { unitId: enemy.id, name: enemy.name, roll, total: enemy.initiative }
    })
    if (results.length > 0) {
      resortByInitiative(bf)
      touch(bf)
    }
    return results
  }

  // ── 回合 ───────────────────────────────────────────────────────────────────
  const sortByInitiative = (battlefieldId: string): void => {
    const bf = requireBattlefield(battlefieldId)
    resortByInitiative(bf)
    touch(bf)
  }

  /** 拖曳／上下移後的手動順序：以 id 陣列重寫參戰單位 sortOrder */
  const reorderUnits = (battlefieldId: string, orderedIds: string[]): void => {
    const bf = requireBattlefield(battlefieldId)
    orderedIds.forEach((unitId, index) => {
      const target = bf.units.find((u) => u.id === unitId)
      if (target) target.sortOrder = index
    })
    touch(bf)
  }

  const moveUnit = (battlefieldId: string, unitId: string, dir: 1 | -1): void => {
    const bf = requireBattlefield(battlefieldId)
    const ordered = combatantsOf(bf.units)
    const index = ordered.findIndex((u) => u.id === unitId)
    const other = index >= 0 ? ordered[index + dir] : undefined
    const current = ordered[index]
    if (!current || !other) return
    const swap = current.sortOrder
    current.sortOrder = other.sortOrder
    other.sortOrder = swap
    touch(bf)
  }

  /** @returns 進入新一輪時回傳新 round，否則 null（供 toast） */
  const stepTurn = (battlefieldId: string, dir: 1 | -1): number | null => {
    const bf = requireBattlefield(battlefieldId)
    const ordered = combatantsOf(bf.units).map((u) => u.id)
    const step = nextTurnTarget(ordered, bf.activeUnitId, dir)
    bf.activeUnitId = step.activeUnitId
    touch(bf)
    if (step.roundDelta === 0) return null
    bf.round = Math.max(1, bf.round + step.roundDelta)
    return step.roundDelta > 0 ? bf.round : null
  }

  const setActiveUnit = (battlefieldId: string, unitId: string): void => {
    const bf = requireBattlefield(battlefieldId)
    bf.activeUnitId = unitId
    bf.inProgress = true
    touch(bf)
  }

  /** 重置戰場：清全員先攻與行動者、回合回到 1；單位與 HP 不動 */
  const resetBattle = (battlefieldId: string): void => {
    const bf = requireBattlefield(battlefieldId)
    for (const u of combatantsOf(bf.units)) u.initiative = null
    bf.round = 1
    bf.activeUnitId = null
    bf.inProgress = true
    touch(bf)
  }

  // ── 戰鬥段落 ───────────────────────────────────────────────────────────────
  /** 結束本次戰鬥：必清項固定、保留項依彈窗勾選（helpers/resetUnitAfterBattle） */
  const endBattle = (battlefieldId: string, flags: EndBattleKeepFlags): void => {
    const bf = requireBattlefield(battlefieldId)
    bf.units = bf.units.map((u) => resetUnitAfterBattle(u, flags))
    bf.activeUnitId = null
    bf.inProgress = false
    touch(bf)
  }

  /** @returns 新的場次序號（供 toast） */
  const startNextBattle = (battlefieldId: string): number => {
    const bf = requireBattlefield(battlefieldId)
    bf.battleSequence += 1
    bf.round = 1
    bf.activeUnitId = null
    bf.inProgress = true
    touch(bf)
    return bf.battleSequence
  }

  /** 清空所有 session-bound state；登出 / 換帳號 / 401 時由 auth store 統一呼叫。 */
  const reset = (): void => {
    battlefieldCache.value = new Map()
    sessionSeeds.value = []
    templates.value = []
    listLoading.value = false
    listError.value = null
    listLoaded.value = false
    detailLoading.value = false
    detailError.value = null
    seeded = false
    mockIdCounter = 0
  }

  return {
    battlefieldCache,
    sessionOptions,
    templates,
    listLoading,
    listError,
    listLoaded,
    detailLoading,
    detailError,
    loadSessionOptions,
    loadBattlefield,
    getBattlefieldById,
    createBattlefield,
    deleteBattlefield,
    getMemberSources,
    importMember,
    addMonsterInstance,
    createAdhocUnit,
    enterCombat,
    leaveCombat,
    removeUnit,
    renameUnit,
    setFaction,
    addCondition,
    removeCondition,
    applyDamage,
    applyHeal,
    setDeathSaveSuccesses,
    setDeathSaveFailures,
    adjustTempHp,
    adjustMaxHp,
    adjustAc,
    adjustSpeed,
    setInitiative,
    adjustInitiative,
    rollInitiative,
    rollAllEnemyInitiatives,
    sortByInitiative,
    reorderUnits,
    moveUnit,
    stepTurn,
    setActiveUnit,
    resetBattle,
    endBattle,
    startNextBattle,
    reset,
  }
})
