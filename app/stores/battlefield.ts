import {
  BATTLEFIELD_LIMITS,
  CHARACTER_TEXT_LIMITS,
  VALIDATION_LIMITS,
} from '@rolling-dice-app/core'
import type {
  BattlefieldAttackEntry,
  BattlefieldDTO,
  BattlefieldFaction,
  BattlefieldSessionOption,
  BattlefieldUnit,
  BattlefieldUpdateBody,
  ConditionKey,
  DmSessionLogDTO,
  DmSessionMemberInput,
} from '@rolling-dice-app/core'
import type {
  AddMonsterInstanceResult,
  AdhocUnitInput,
  BattlefieldMemberSource,
  BattlefieldTemplateSource,
  ImportMemberResult,
} from '~/types/business/battlefield'
import {
  applyDamageToHp,
  applyHealToHp,
  buildMonsterInstanceName,
  combatantsOf,
  effectiveMaxHp,
  nextTurnTarget,
  resetUnitAfterBattle,
  resetUnitToSnapshotBaseline,
  sortCombatantsByInitiative,
} from '~/helpers/battlefield'
import { buildBattlefieldMemberSource } from '~/helpers/battlefield-snapshot'
import { toDmSessionMemberInputs } from '~/helpers/dm-session'
import { rollDie } from '~/helpers/dice'
import { useMonsterTemplateStore } from '~/stores/monster-template'
import { createKeyedDirtyGuard } from '~/utils/dirty-guard'
import { createSingleFlight } from '~/utils/single-flight'
import { debounce, type DebouncedFn } from '~/utils/timing'

const PERSIST_DEBOUNCE_MS = 300
const PERSIST_RETRY_MS = 2000

/** 夾在 ±absMax（防爆 caps 前端預擋，對齊 core BATTLEFIELD_LIMITS） */
const clampAbs = (value: number, absMax: number): number =>
  Math.min(absMax, Math.max(-absMax, value))

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
 * 資料層走 /battlefields API：讀取 GET 進 cache、所有變更 action 本地算好結果後經
 * debounce PATCH（整份 updatable 投影＋updatedAt 樂觀鎖）→ re-GET 收斂 pipeline 持久化；
 * 高頻調整（HP／先攻等）合併送出，離散結構操作額外立即 flush。
 * 錯誤策略：409 stale 不重試、以 server 為準覆蓋本地；其他失敗自動重試一次後曝露
 * `persistError`（toast 由頁面處理，store 不碰 UI）。
 *
 * 讀取刻意不做 defensive clone（偏離 CRUD store 慣例）：戰場工作區是高頻互動的狀態機，
 * 頁面以 computed 直讀 store 反應式狀態、所有變更必經 action，clone 會斷開即時更新。
 */
export const useBattlefieldStore = defineStore('battlefield', () => {
  const battlefieldCache = ref(new Map<string, BattlefieldDTO>())
  const sessionOptionList = ref<BattlefieldSessionOption[]>([])
  /** 出席成員快照來源；keyed by battlefieldId，由 loadMemberSources hydrate */
  const memberSourcesCache = ref(new Map<string, BattlefieldMemberSource[]>())
  /** 團務紀錄 cache（成員移除／重新連結回寫用；updatedAt 為 log 的樂觀鎖 token） */
  const sessionLogCache = ref(new Map<string, DmSessionLogDTO>())

  const listLoading = ref(false)
  const listError = ref<unknown>(null)
  const listLoaded = ref(false)

  const detailLoading = ref(false)
  const detailError = ref<unknown>(null)

  const membersLoading = ref(false)
  const membersError = ref<unknown>(null)

  /** 自動重試仍失敗（或 409 stale）後曝露給頁面的最後一次持久化錯誤 */
  const persistError = ref<unknown>(null)

  const sessionOptions = computed<BattlefieldSessionOption[]>(() => sessionOptionList.value)

  /** 怪物模板來源：monster-template store 列表的輕量投影（速度／先攻於加入時抓詳情快照） */
  const templates = computed<BattlefieldTemplateSource[]>(() =>
    useMonsterTemplateStore().list.map((t) => ({
      id: t.id,
      name: t.name,
      challengeRating: t.challengeRating,
      hp: t.hp,
      ac: t.ac,
    })),
  )

  /** 攻擊快照：deep clone 並重生行內 id（與來源互不同步、不回寫） */
  const snapshotAttacks = (attacks: BattlefieldAttackEntry[]): BattlefieldAttackEntry[] =>
    attacks.map((entry) => ({
      ...entry,
      id: crypto.randomUUID(),
      damageDice: entry.damageDice.map((line) => ({ ...line, id: crypto.randomUUID() })),
    }))

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

  const atUnitCap = (bf: BattlefieldDTO): boolean =>
    bf.units.length >= VALIDATION_LIMITS.maxUnitsPerBattlefield

  /** 入場給號：排在現有參戰單位之後 */
  const nextSortOrder = (bf: BattlefieldDTO): number =>
    Math.min(combatantsOf(bf.units).length, BATTLEFIELD_LIMITS.UNIT_SORT_ORDER_MAX)

  /** 依先攻重排參戰單位的 sortOrder；只有工具列「依先攻重排」會用到 */
  const resortByInitiative = (bf: BattlefieldDTO): void => {
    sortCombatantsByInitiative(combatantsOf(bf.units)).forEach((u, index) => {
      u.sortOrder = index
    })
  }

  // ── 持久化 pipeline（debounce PATCH → re-GET；比照 useCharacterCombatState） ─
  interface PersistState {
    debounced: DebouncedFn<[]>
    /** 當前飛行中的 PATCH+GET；同步指派以確保 flush 路徑能立刻 await */
    inFlight: Promise<void> | null
    /** 此輪失敗是否已用掉自動重試額度；成功後重置 */
    retryScheduled: boolean
    retryTimer: ReturnType<typeof setTimeout> | null
  }
  const persistStates = new Map<string, PersistState>()
  /** PATCH 飛行期間是否又被 user 動過；避免 re-GET 覆蓋掉同時間的新改動 */
  const dirty = createKeyedDirtyGuard<string>()

  const persistStateOf = (battlefieldId: string): PersistState => {
    let state = persistStates.get(battlefieldId)
    if (!state) {
      state = {
        debounced: debounce(() => {
          void runPersist(battlefieldId)
        }, PERSIST_DEBOUNCE_MS),
        inFlight: null,
        retryScheduled: false,
        retryTimer: null,
      }
      persistStates.set(battlefieldId, state)
    }
    return state
  }

  const clearRetry = (state: PersistState): void => {
    if (state.retryTimer) {
      clearTimeout(state.retryTimer)
      state.retryTimer = null
    }
    state.retryScheduled = false
  }

  /** 取消某戰場所有排程中的持久化（刪除／登出時用；不等待飛行中的 PATCH） */
  const cancelPersist = (battlefieldId: string): void => {
    const state = persistStates.get(battlefieldId)
    if (!state) return
    state.debounced.cancel()
    clearRetry(state)
    persistStates.delete(battlefieldId)
  }

  /** 所有變更 action 的統一出口：標記 dirty 並排入 debounce 送出 */
  const schedulePersist = (battlefieldId: string): void => {
    dirty.bump(battlefieldId)
    persistStateOf(battlefieldId).debounced()
  }

  const runPersist = async (battlefieldId: string): Promise<void> => {
    const state = persistStateOf(battlefieldId)
    if (state.inFlight) {
      // 飛行中再觸發：排成 trailing 一輪，帶最新 state 送出
      state.debounced()
      return
    }
    if (state.retryTimer) {
      clearTimeout(state.retryTimer)
      state.retryTimer = null
    }
    state.inFlight = doPersist(battlefieldId, state)
    try {
      await state.inFlight
    } finally {
      state.inFlight = null
    }
  }

  const doPersist = async (battlefieldId: string, state: PersistState): Promise<void> => {
    const bf = battlefieldCache.value.get(battlefieldId)
    if (!bf) return
    const snapshot = dirty.snapshot()
    try {
      // `toRaw` 只剝一層：任何以 units.map / units.filter 重建過的陣列，元素仍是
      // reactive proxy（如 endBattle / removeUnit），而 structuredClone 對 proxy
      // 直接丟 DataCloneError，會讓整條持久化靜默失敗。DTO 契約本就是純 JSON，
      // 故改用 JSON round-trip 取脫勾快照，與 proxy 深度無關。
      const raw = JSON.parse(JSON.stringify(bf)) as BattlefieldDTO
      const body: BattlefieldUpdateBody = {
        updatedAt: raw.updatedAt,
        battleSequence: raw.battleSequence,
        round: raw.round,
        activeUnitId: raw.activeUnitId,
        // inProgress 已棄用（core @deprecated）：不再寫入，值留在 server 最後一次的狀態
        units: raw.units,
      }
      const api = battlefields()
      await api.update(battlefieldId, body)
      // PATCH 204 無 body，重抓拿新 updatedAt（樂觀鎖 token）
      const fresh = await api.get(battlefieldId)
      const current = battlefieldCache.value.get(battlefieldId)
      if (!current) return
      if (dirty.changedSince(battlefieldId, snapshot)) {
        // 飛行期間 user 又動了 state；只接新 token，data 留給下一輪 persist 帶出
        current.updatedAt = fresh.updatedAt
      } else {
        battlefieldCache.value.set(battlefieldId, fresh)
      }
      persistError.value = null
      state.retryScheduled = false
    } catch (err) {
      const code = apiErrorCodeOf(err)
      if (code === 'STALE_BATTLEFIELD_VERSION') {
        // 資料已被其他來源改過：丟棄未送出的本地編輯，以 server 為準（單 DM MVP 決議）
        state.debounced.cancel()
        clearRetry(state)
        await recoverFromServer(battlefieldId)
        persistError.value = err
        return
      }
      if (isFetchError(err) && err.statusCode === 404) {
        // 戰場已在他端刪除：清 cache，頁面落 NotFound 分支
        state.debounced.cancel()
        clearRetry(state)
        battlefieldCache.value.delete(battlefieldId)
        return
      }
      if (!state.retryScheduled) {
        state.retryScheduled = true
        state.retryTimer = setTimeout(() => {
          state.retryTimer = null
          void runPersist(battlefieldId)
        }, PERSIST_RETRY_MS)
      } else {
        // 重試已失敗：保留本地編輯（下次變更會再觸發 persist），曝露錯誤給頁面 toast
        persistError.value = err
      }
    }
  }

  /** 409 stale 回復：re-GET 覆蓋本地；期間戰場若已消失（404）則清 cache */
  const recoverFromServer = async (battlefieldId: string): Promise<void> => {
    try {
      const fresh = await battlefields().get(battlefieldId)
      battlefieldCache.value.set(battlefieldId, fresh)
    } catch (err) {
      if (isFetchError(err) && err.statusCode === 404) battlefieldCache.value.delete(battlefieldId)
    }
  }

  /** 把 pending debounce／失敗重試立刻送出並等所有飛行中的 PATCH 結束；route-leave 前呼叫 */
  const flushPersist = async (battlefieldId: string): Promise<void> => {
    const state = persistStates.get(battlefieldId)
    if (!state) return
    while (true) {
      state.debounced.flush()
      if (state.inFlight) {
        try {
          await state.inFlight
        } catch {
          // 失敗已由 doPersist 內處理（排重試／persistError），不再向外拋
        }
        continue
      }
      if (state.retryTimer) {
        clearTimeout(state.retryTimer)
        state.retryTimer = null
        void runPersist(battlefieldId)
        continue
      }
      return
    }
  }

  // ── 資源 ───────────────────────────────────────────────────────────────────
  const listFlight = createSingleFlight(async (): Promise<BattlefieldSessionOption[]> => {
    listLoading.value = true
    listError.value = null
    try {
      const options = await battlefields().sessionOptions()
      sessionOptionList.value = options
      listLoaded.value = true
      return options
    } catch (error) {
      listError.value = error
      throw error
    } finally {
      listLoading.value = false
    }
  })
  const loadSessionOptions = (): Promise<BattlefieldSessionOption[]> => listFlight.run()

  /** 回傳 null 表示戰場不存在（404，頁面顯示 NotFound）；其他錯誤設 detailError 後上拋 */
  const loadBattlefield = async (battlefieldId: string): Promise<BattlefieldDTO | null> => {
    detailLoading.value = true
    detailError.value = null
    try {
      const bf = await battlefields().get(battlefieldId)
      battlefieldCache.value.set(battlefieldId, bf)
      return bf
    } catch (error) {
      if (isFetchError(error) && error.statusCode === 404) return null
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
    const created = await battlefields().create({ sessionId })
    battlefieldCache.value.set(created.id, created)
    const option = sessionOptionList.value.find((o) => o.sessionId === sessionId)
    if (option) option.battlefieldId = created.id
    return created
  }

  /** hard-delete：刪除即團務結束，無結算（設計定稿第十二節）；404 視為已刪成功 */
  const deleteBattlefield = async (battlefieldId: string): Promise<void> => {
    cancelPersist(battlefieldId)
    try {
      await battlefields().remove(battlefieldId)
    } catch (err) {
      if (!(isFetchError(err) && err.statusCode === 404)) throw err
    }
    battlefieldCache.value.delete(battlefieldId)
    memberSourcesCache.value.delete(battlefieldId)
    sessionLogCache.value.delete(battlefieldId)
    const option = sessionOptionList.value.find((o) => o.battlefieldId === battlefieldId)
    if (option) option.battlefieldId = null
  }

  // ── 出席成員（快照來源）與名單修復 ─────────────────────────────────────────
  const getMemberSources = (battlefieldId: string): BattlefieldMemberSource[] =>
    memberSourcesCache.value.get(battlefieldId) ?? []

  /**
   * Hydrate 出席成員快照來源：經 DTO 的 containerId 取團務紀錄出席名單，逐員抓
   * share profile 跑衍生管線。未連結 PC 的純 PL 條目跳過；單筆抓取失敗降級為
   * 不可用（available: false），不整批失敗。
   */
  const loadMemberSources = async (battlefieldId: string): Promise<void> => {
    const bf = requireBattlefield(battlefieldId)
    membersLoading.value = true
    membersError.value = null
    try {
      const log = await dmSessionContainers().getLog(bf.containerId, bf.sessionId)
      sessionLogCache.value.set(battlefieldId, log)
      const linked = log.members.flatMap((member) =>
        member.character ? [{ member, preview: member.character }] : [],
      )
      const sources = await Promise.all(
        linked.map(async ({ member, preview }): Promise<BattlefieldMemberSource> => {
          if (preview.available) {
            try {
              const shared = await share().getCharacter(preview.shareId)
              return buildBattlefieldMemberSource(member, preview.shareId, shared.character)
            } catch {
              // 解析後、抓取前 share 被關閉／角色被刪：降級為不可用
            }
          }
          return {
            memberId: member.id,
            shareId: preview.shareId,
            playerName: member.playerName,
            available: false,
          }
        }),
      )
      memberSourcesCache.value.set(battlefieldId, sources)
    } catch (error) {
      membersError.value = error
      throw error
    } finally {
      membersLoading.value = false
    }
  }

  /** 送出團務出席名單 PATCH 後重跑 hydrate（成功要新 token／名單，失敗也刷新 stale token） */
  const patchSessionMembers = async (
    battlefieldId: string,
    mutate: (members: DmSessionMemberInput[]) => DmSessionMemberInput[],
  ): Promise<void> => {
    const bf = requireBattlefield(battlefieldId)
    const log = sessionLogCache.value.get(battlefieldId)
    if (!log) throw new Error(`session log not loaded: ${battlefieldId}`)
    // 失效連結收斂為 null（helpers/dm-session 慣例）：帶失效 shareId 會被 backend 當新連結 422 拒絕
    const members = mutate(toDmSessionMemberInputs(log.members, { collapseUnavailable: true }))
    try {
      await dmSessionContainers().updateLog(bf.containerId, bf.sessionId, {
        updatedAt: log.updatedAt,
        members,
      })
    } finally {
      await loadMemberSources(battlefieldId).catch(() => {
        // 刷新失敗已記錄於 membersError；不掩蓋 PATCH 本身的錯誤
      })
    }
  }

  /** 自團務出席名單移除成員（快照失效的修復動作之一）；走 m7.2 log PATCH，非戰場 endpoint */
  const removeSessionMember = (battlefieldId: string, memberId: string): Promise<void> =>
    patchSessionMembers(battlefieldId, (members) => members.filter((m) => m.id !== memberId))

  /** 重新連結成員的角色卡 shareId；backend 驗證有效性（失效回 422） */
  const relinkSessionMember = (
    battlefieldId: string,
    memberId: string,
    shareId: string,
  ): Promise<void> =>
    patchSessionMembers(battlefieldId, (members) =>
      members.map((m) => (m.id === memberId ? { ...m, characterShareId: shareId } : m)),
    )

  // ── 單位 ───────────────────────────────────────────────────────────────────
  /**
   * 帶入出席成員：滿 HP 快照、直接參戰（已拍板）；已帶入者 no-op 回傳既有單位。
   * 失敗以 reason 區分，呼叫端才給得出對應提示（原本各種失敗都塌成 null，UI 全靜默）。
   */
  const importMember = (battlefieldId: string, shareId: string): ImportMemberResult => {
    const bf = requireBattlefield(battlefieldId)
    const existing = bf.units.find((u) => u.kind === 'character' && u.shareId === shareId)
    if (existing) return { ok: true, unit: existing }
    if (atUnitCap(bf)) return { ok: false, reason: 'cap' }
    const source = getMemberSources(battlefieldId).find((m) => m.shareId === shareId)
    if (!source || !source.available) return { ok: false, reason: 'memberUnavailable' }
    const created: BattlefieldUnit = {
      id: crypto.randomUUID(),
      kind: 'character',
      shareId: source.shareId,
      templateId: null,
      faction: 'player',
      name: source.name,
      challengeRating: null,
      race: source.race,
      classes: source.classes.map((entry) => ({ ...entry })),
      maxHp: source.maxHp,
      hp: { current: source.maxHp, tempHp: 0, maxAdjustment: 0 },
      deathSaves: { successes: 0, failures: 0 },
      ac: source.ac,
      acAdjustment: 0,
      speed: source.speed,
      speedAdjustment: 0,
      attacks: snapshotAttacks(source.attacks),
      skills: { ...source.skills },
      initiativeBonus: source.totalInitiative,
      initiative: null,
      sortOrder: nextSortOrder(bf),
      conditions: [],
      inCombat: true,
    }
    bf.units.push(created)
    if (bf.activeUnitId == null) bf.activeUnitId = created.id
    schedulePersist(battlefieldId)
    void flushPersist(battlefieldId)
    return { ok: true, unit: created }
  }

  /**
   * 從怪物模板建立實例並直接參戰（已拍板取消兩段式）；自動編號。模板詳情不在 cache 時補抓一筆。
   * 「模板載入失敗」與「達單位上限」以 reason 區分：前者要走 apiErrorToast，後者是上限提示。
   */
  const addMonsterInstance = async (
    battlefieldId: string,
    templateId: string,
  ): Promise<AddMonsterInstanceResult> => {
    const monsterTemplateStore = useMonsterTemplateStore()
    let template = monsterTemplateStore.getById(templateId)
    if (!template) {
      try {
        template = await monsterTemplateStore.loadDetail(templateId)
      } catch (error) {
        return { ok: false, reason: 'templateLoadFailed', error }
      }
    }
    const bf = requireBattlefield(battlefieldId)
    if (atUnitCap(bf)) return { ok: false, reason: 'cap' }
    const siblings = bf.units.filter((u) => u.templateId === templateId)
    const created: BattlefieldUnit = {
      id: crypto.randomUUID(),
      kind: 'monster',
      shareId: null,
      templateId: template.id,
      faction: 'enemy',
      name: buildMonsterInstanceName(
        template.name,
        siblings.length,
        bf.units.map((u) => u.name),
      ),
      challengeRating: template.challengeRating,
      race: null,
      classes: [],
      maxHp: template.hp,
      hp: { current: template.hp, tempHp: 0, maxAdjustment: 0 },
      deathSaves: { successes: 0, failures: 0 },
      ac: template.ac,
      acAdjustment: 0,
      speed: template.speed,
      speedAdjustment: 0,
      attacks: snapshotAttacks(template.attacks),
      skills: { ...template.skills },
      initiativeBonus: template.initiativeBonus,
      initiative: null,
      sortOrder: nextSortOrder(bf),
      conditions: [],
      inCombat: true,
    }
    bf.units.push(created)
    if (bf.activeUnitId == null) bf.activeUnitId = created.id
    schedulePersist(battlefieldId)
    void flushPersist(battlefieldId)
    return { ok: true, unit: created }
  }

  /** 手動臨時單位（進 MVP，已拍板）：純手填、預設中立；達單位上限回 null */
  const createAdhocUnit = (
    battlefieldId: string,
    input: AdhocUnitInput,
    joinCombat: boolean,
  ): BattlefieldUnit | null => {
    const bf = requireBattlefield(battlefieldId)
    if (atUnitCap(bf)) return null
    const maxHp = Math.min(Math.max(1, input.maxHp), BATTLEFIELD_LIMITS.UNIT_HP_MAX)
    const ac = Math.min(Math.max(0, input.ac), BATTLEFIELD_LIMITS.UNIT_AC_MAX)
    const created: BattlefieldUnit = {
      id: crypto.randomUUID(),
      kind: 'adhoc',
      shareId: null,
      templateId: null,
      faction: 'neutral',
      name: input.name.trim().slice(0, CHARACTER_TEXT_LIMITS.SHORT),
      challengeRating: null,
      race: null,
      classes: [],
      maxHp,
      hp: { current: maxHp, tempHp: 0, maxAdjustment: 0 },
      deathSaves: { successes: 0, failures: 0 },
      ac,
      acAdjustment: 0,
      speed: Math.min(Math.max(0, input.speed), BATTLEFIELD_LIMITS.UNIT_SPEED_MAX),
      speedAdjustment: 0,
      attacks: [],
      skills: {},
      initiativeBonus: clampAbs(
        input.initiativeBonus,
        BATTLEFIELD_LIMITS.UNIT_INITIATIVE_BONUS_ABS_MAX,
      ),
      initiative: null,
      sortOrder: nextSortOrder(bf),
      conditions: [],
      inCombat: joinCombat,
    }
    bf.units.push(created)
    if (joinCombat && bf.activeUnitId == null) bf.activeUnitId = created.id
    schedulePersist(battlefieldId)
    void flushPersist(battlefieldId)
    return created
  }

  const enterCombat = (battlefieldId: string, unitId: string): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    if (target.inCombat) return
    target.sortOrder = nextSortOrder(bf)
    target.inCombat = true
    if (bf.activeUnitId == null) bf.activeUnitId = target.id
    schedulePersist(battlefieldId)
    void flushPersist(battlefieldId)
  }

  const leaveCombat = (battlefieldId: string, unitId: string): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    if (!target.inCombat) return
    // 行動中單位退場：先把行動權交給下一位；軌上只剩自己則清空
    if (bf.activeUnitId === unitId) {
      const ordered = combatantsOf(bf.units).map((u) => u.id)
      // 只交棒，不動輪次（輪次只由「上一位／下一位」更新）
      const step = nextTurnTarget(ordered, unitId, 1)
      bf.activeUnitId = step.activeUnitId === unitId ? null : step.activeUnitId
    }
    target.inCombat = false
    schedulePersist(battlefieldId)
    void flushPersist(battlefieldId)
  }

  const removeUnit = (battlefieldId: string, unitId: string): void => {
    const bf = requireBattlefield(battlefieldId)
    if (bf.activeUnitId === unitId) bf.activeUnitId = null
    bf.units = bf.units.filter((u) => u.id !== unitId)
    schedulePersist(battlefieldId)
    void flushPersist(battlefieldId)
  }

  const renameUnit = (battlefieldId: string, unitId: string, name: string): void => {
    const bf = requireBattlefield(battlefieldId)
    const trimmed = name.trim().slice(0, CHARACTER_TEXT_LIMITS.SHORT)
    if (!trimmed) return
    requireUnit(bf, unitId).name = trimmed
    schedulePersist(battlefieldId)
  }

  const setFaction = (battlefieldId: string, unitId: string, faction: BattlefieldFaction): void => {
    const bf = requireBattlefield(battlefieldId)
    requireUnit(bf, unitId).faction = faction
    schedulePersist(battlefieldId)
  }

  // ── 狀態（conditions） ─────────────────────────────────────────────────────
  /** 達單筆狀態上限（15）時 no-op；UI 端同步以 VALIDATION_LIMITS 停用套用鈕 */
  const addCondition = (
    battlefieldId: string,
    unitId: string,
    key: ConditionKey,
    note: string | null,
  ): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    if (target.conditions.length >= VALIDATION_LIMITS.maxConditionsPerBattlefieldUnit) return
    const trimmed = note?.trim() ?? ''
    target.conditions.push({
      id: crypto.randomUUID(),
      key,
      note: trimmed === '' ? null : trimmed.slice(0, CHARACTER_TEXT_LIMITS.SHORT),
    })
    schedulePersist(battlefieldId)
  }

  const removeCondition = (battlefieldId: string, unitId: string, conditionId: string): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    target.conditions = target.conditions.filter((c) => c.id !== conditionId)
    schedulePersist(battlefieldId)
  }

  // ── 數值 ───────────────────────────────────────────────────────────────────
  /** HP ≥ 1 時死亡豁免歸零（比照 combat）；掛在所有可能改動當前 HP 的 action 尾端 */
  const clearDeathSavesIfUp = (target: BattlefieldUnit): void => {
    if (target.hp.current >= 1) target.deathSaves = { successes: 0, failures: 0 }
  }

  /** @returns 本次操作是否使單位倒下（HP 降到 0） */
  const applyDamage = (battlefieldId: string, unitId: string, amount: number): boolean => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    const wasUp = target.hp.current > 0
    target.hp = applyDamageToHp(target, amount)
    clearDeathSavesIfUp(target)
    schedulePersist(battlefieldId)
    return wasUp && target.hp.current === 0
  }

  const applyHeal = (battlefieldId: string, unitId: string, amount: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    target.hp = applyHealToHp(target, amount)
    clearDeathSavesIfUp(target)
    schedulePersist(battlefieldId)
  }

  // ── 死亡豁免 ───────────────────────────────────────────────────────────────
  /** 僅 HP 0 時可計數（不變量守在 store，防多入口漏接）；值 clamp 0..3 */
  const setDeathSaveSuccesses = (battlefieldId: string, unitId: string, value: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    if (target.hp.current !== 0) return
    target.deathSaves.successes = Math.max(0, Math.min(3, value))
    schedulePersist(battlefieldId)
  }

  const setDeathSaveFailures = (battlefieldId: string, unitId: string, value: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    if (target.hp.current !== 0) return
    target.deathSaves.failures = Math.max(0, Math.min(3, value))
    schedulePersist(battlefieldId)
  }

  const adjustTempHp = (battlefieldId: string, unitId: string, delta: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    target.hp.tempHp = Math.min(
      Math.max(0, target.hp.tempHp + delta),
      BATTLEFIELD_LIMITS.UNIT_HP_MAX,
    )
    schedulePersist(battlefieldId)
  }

  /** 最大 HP 調整（走 hp.maxAdjustment，快照 maxHp 不動）：上調同步加當前 HP、下調只 clamp */
  const adjustMaxHp = (battlefieldId: string, unitId: string, delta: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    const previous = effectiveMaxHp(target)
    // 夾 ±cap，且有效最大 HP 不可低於 1
    target.hp.maxAdjustment = Math.max(
      Math.max(-BATTLEFIELD_LIMITS.UNIT_HP_MAX_ADJUSTMENT_ABS_MAX, 1 - target.maxHp),
      Math.min(BATTLEFIELD_LIMITS.UNIT_HP_MAX_ADJUSTMENT_ABS_MAX, target.hp.maxAdjustment + delta),
    )
    const next = effectiveMaxHp(target)
    const grown = next - previous
    if (grown > 0) target.hp.current += grown
    target.hp.current = Math.min(Math.max(target.hp.current, 0), next)
    clearDeathSavesIfUp(target)
    schedulePersist(battlefieldId)
  }

  const adjustAc = (battlefieldId: string, unitId: string, delta: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    target.acAdjustment = clampAbs(
      target.acAdjustment + delta,
      BATTLEFIELD_LIMITS.UNIT_AC_ADJUSTMENT_ABS_MAX,
    )
    schedulePersist(battlefieldId)
  }

  /** 速度調整（疊加於 speed 快照）；快照未知（null）不可調 */
  const adjustSpeed = (battlefieldId: string, unitId: string, delta: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    if (target.speed == null) return
    target.speedAdjustment = clampAbs(
      target.speedAdjustment + delta,
      BATTLEFIELD_LIMITS.UNIT_SPEED_ADJUSTMENT_ABS_MAX,
    )
    schedulePersist(battlefieldId)
  }

  const setInitiative = (battlefieldId: string, unitId: string, value: number | null): void => {
    const bf = requireBattlefield(battlefieldId)
    requireUnit(bf, unitId).initiative =
      value == null ? null : clampAbs(value, BATTLEFIELD_LIMITS.UNIT_INITIATIVE_ABS_MAX)
    schedulePersist(battlefieldId)
  }

  const adjustInitiative = (battlefieldId: string, unitId: string, delta: number): void => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    target.initiative = clampAbs(
      (target.initiative ?? 0) + delta,
      BATTLEFIELD_LIMITS.UNIT_INITIATIVE_ABS_MAX,
    )
    schedulePersist(battlefieldId)
  }

  /** 擲先攻：1d20 + 加值，回傳骰面與總值供 toast 顯示 */
  const rollInitiative = (battlefieldId: string, unitId: string): InitiativeRollResult => {
    const bf = requireBattlefield(battlefieldId)
    const target = requireUnit(bf, unitId)
    const roll = rollDie(20)
    target.initiative = roll + target.initiativeBonus
    schedulePersist(battlefieldId)
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
    if (results.length > 0) schedulePersist(battlefieldId)
    return results
  }

  // ── 回合 ───────────────────────────────────────────────────────────────────
  const sortByInitiative = (battlefieldId: string): void => {
    const bf = requireBattlefield(battlefieldId)
    resortByInitiative(bf)
    schedulePersist(battlefieldId)
  }

  /** 拖曳／上下移後的手動順序：以 id 陣列重寫參戰單位 sortOrder */
  const reorderUnits = (battlefieldId: string, orderedIds: string[]): void => {
    const bf = requireBattlefield(battlefieldId)
    orderedIds.forEach((unitId, index) => {
      const target = bf.units.find((u) => u.id === unitId)
      if (target) target.sortOrder = index
    })
    schedulePersist(battlefieldId)
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
    schedulePersist(battlefieldId)
  }

  /** @returns 進入新一輪時回傳新 round，否則 null（供 toast） */
  const stepTurn = (battlefieldId: string, dir: 1 | -1): number | null => {
    const bf = requireBattlefield(battlefieldId)
    const ordered = combatantsOf(bf.units).map((u) => u.id)
    const step = nextTurnTarget(ordered, bf.activeUnitId, dir)
    bf.activeUnitId = step.activeUnitId
    schedulePersist(battlefieldId)
    if (step.roundDelta === 0) return null
    bf.round = Math.min(Math.max(1, bf.round + step.roundDelta), BATTLEFIELD_LIMITS.ROUND_MAX)
    return step.roundDelta > 0 ? bf.round : null
  }

  const setActiveUnit = (battlefieldId: string, unitId: string): void => {
    const bf = requireBattlefield(battlefieldId)
    bf.activeUnitId = unitId
    schedulePersist(battlefieldId)
  }

  // ── 戰鬥段落 ───────────────────────────────────────────────────────────────
  /**
   * 重置戰鬥。第 2 場以後走後端還原 API，位置與狀態都由本場起始快照決定；
   * 第 1 場無快照，走本地「全員回快照基準、單位保留、位置不動」。場次一律不動。
   */
  const resetBattle = async (battlefieldId: string): Promise<void> => {
    const bf = requireBattlefield(battlefieldId)
    if (bf.battleSequence > BATTLEFIELD_LIMITS.BATTLE_SEQUENCE_MIN) {
      // 本地未送出的編輯先落地：還原帶的是 server 現值的 token，flush 後才不會自撞 409。
      await flushPersist(battlefieldId)
      const current = battlefieldCache.value.get(battlefieldId)
      if (!current) return
      try {
        const restored = await battlefields().restore(battlefieldId, {
          updatedAt: current.updatedAt,
        })
        battlefieldCache.value.set(battlefieldId, restored)
        return
      } catch (err) {
        // 無快照可用：降級為本地重置
        if (!isFetchError(err) || err.statusCode !== 404) throw err
      }
    }
    resetBattleLocally(requireBattlefield(battlefieldId))
    schedulePersist(battlefieldId)
    await flushPersist(battlefieldId)
  }

  /** 第 1 場（無快照）的重置：全員回快照基準、單位保留、位置不動 */
  const resetBattleLocally = (bf: BattlefieldDTO): void => {
    bf.units = bf.units.map((u) => resetUnitToSnapshotBaseline(u))
    bf.round = 1
    bf.activeUnitId = null
  }

  /**
   * 結束本次戰鬥：單位去留與歸零依 helpers/resetUnitAfterBattle，
   * 場次 +1、輪次回 1、清行動者。場次遞增會觸發後端拍下這一刻的快照供還原使用。
   *
   * @returns 新的場次序號（供 toast）
   */
  const endBattle = (battlefieldId: string): number => {
    const bf = requireBattlefield(battlefieldId)
    bf.units = bf.units.map((u) => resetUnitAfterBattle(u))
    bf.battleSequence = Math.min(bf.battleSequence + 1, BATTLEFIELD_LIMITS.BATTLE_SEQUENCE_MAX)
    bf.round = 1
    bf.activeUnitId = null
    schedulePersist(battlefieldId)
    void flushPersist(battlefieldId)
    return bf.battleSequence
  }

  /** 清空所有 session-bound state；登出 / 換帳號 / 401 時由 auth store 統一呼叫。 */
  const reset = (): void => {
    for (const battlefieldId of Array.from(persistStates.keys())) cancelPersist(battlefieldId)
    battlefieldCache.value = new Map()
    sessionOptionList.value = []
    memberSourcesCache.value = new Map()
    sessionLogCache.value = new Map()
    listLoading.value = false
    listError.value = null
    listLoaded.value = false
    detailLoading.value = false
    detailError.value = null
    membersLoading.value = false
    membersError.value = null
    persistError.value = null
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
    membersLoading,
    membersError,
    persistError,
    loadSessionOptions,
    loadBattlefield,
    getBattlefieldById,
    createBattlefield,
    deleteBattlefield,
    getMemberSources,
    loadMemberSources,
    removeSessionMember,
    relinkSessionMember,
    flushPersist,
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
    reset,
  }
})
