import { ref, type Ref } from 'vue'
import type { RollEntry, RollEntryDraft } from '~/types/business/dice'

const MAX_ENTRIES = 50

export interface RollLog {
  entries: Ref<RollEntry[]>
  push: (entry: RollEntryDraft) => void
  clear: () => void
}

/**
 * 擲骰 log factory：純記憶體不持久化。
 * push 時自動補 id 與 rolledAt；超過 MAX_ENTRIES 時 FIFO 截掉最舊。
 * client-only 契約：push() 用 crypto.randomUUID 補 id；勿在 SSR 期間呼叫。
 */
export function createRollLog(): RollLog {
  const entries = ref<RollEntry[]>([])

  const push = (entry: RollEntryDraft): void => {
    const enriched = {
      ...entry,
      id: crypto.randomUUID(),
      rolledAt: Date.now(),
    } as RollEntry
    const next = [enriched, ...entries.value]
    if (next.length > MAX_ENTRIES) next.length = MAX_ENTRIES
    entries.value = next
  }

  const clear = (): void => {
    entries.value = []
  }

  return { entries, push, clear }
}

// module-scoped singleton：戰鬥速查頁共用一份；狀態會跨元件共享（RollDrawer 切角色時 clear）
const characterLog = createRollLog()

/** 戰鬥速查頁擲骰歷史 log（module-scoped singleton） */
export function useDiceRollLog(): RollLog {
  return characterLog
}
