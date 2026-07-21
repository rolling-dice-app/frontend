import { createRollLog, type RollLog } from './useDiceRollLog'

// module-scoped singleton：與戰鬥速查頁的 useDiceRollLog 各自獨立（互不清空、互不污染）。
// client-only 契約同 createRollLog；戰場頁 mount 時 clear() 防跨戰場殘留。
const battlefieldLog = createRollLog()

/** 戰場戰鬥紀錄 log（module-scoped singleton）；entry 以 unitName 標注所屬單位 */
export function useBattlefieldRollLog(): RollLog {
  return battlefieldLog
}
