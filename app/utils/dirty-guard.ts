export interface DirtyGuard {
  /** 每次本地 mutation 呼叫 */
  bump: () => void
  /** 取一個版本號（呼叫端在 task 開始前用） */
  snapshot: () => number
  /** task 結束後檢查：自 snap 以來是否被 bump 過 */
  changedSince: (snap: number) => boolean
}

export type KeyedDirtySnapshot<TKey> = ReadonlyMap<TKey, number>

export interface KeyedDirtyGuard<TKey> {
  /** 對某 key 本地 mutation 呼叫 */
  bump: (key: TKey) => void
  /** 取所有 key 的版本快照（task 開始前用） */
  snapshot: () => KeyedDirtySnapshot<TKey>
  /** 檢查某 key 自 snap 以來是否被 bump 過 */
  changedSince: (key: TKey, snap: KeyedDirtySnapshot<TKey>) => boolean
}

/** 單一資源用：飛行中本地若被改過，post-task 處理時可只接 server token、不接 data */
export function createDirtyGuard(): DirtyGuard {
  let gen = 0
  return {
    bump: () => {
      gen++
    },
    snapshot: () => gen,
    changedSince: (snap) => snap !== gen,
  }
}

/** list-shaped 資源用：per-key 追蹤；refresh response 可逐筆判斷該 key 是否在飛行期間被改過 */
export function createKeyedDirtyGuard<TKey>(): KeyedDirtyGuard<TKey> {
  const counters = new Map<TKey, number>()
  return {
    bump: (key) => {
      counters.set(key, (counters.get(key) ?? 0) + 1)
    },
    snapshot: () => new Map(counters),
    changedSince: (key, snap) => (counters.get(key) ?? 0) !== (snap.get(key) ?? 0),
  }
}
