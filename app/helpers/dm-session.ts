import type {
  DmSessionContainerDTO,
  DmSessionContainerSummaryDTO,
  DmSessionContainerUpdateBody,
  DmSessionLogCreateBody,
  DmSessionLogDTO,
  DmSessionLogSummaryDTO,
  DmSessionLogUpdateBody,
  DmSessionMemberDTO,
  DmSessionMemberInput,
} from '@rolling-dice-app/core'
import type { DmSessionLogDraft } from '~/types/business/dm-session'
import { deepEqual } from '~/utils/deep-equal'

/** 讀取形成員 → 寫入形：character 連結收斂為 shareId（未連結為 null）。 */
export function toDmSessionMemberInputs(members: DmSessionMemberDTO[]): DmSessionMemberInput[] {
  return members.map((m) => ({
    id: m.id,
    playerName: m.playerName,
    characterShareId: m.character?.shareId ?? null,
  }))
}

/**
 * DTO → 列表 summary：create / update 後本地同步列表用，欄位對齊 GET /dm-session-containers。
 * nextSession 為 server 衍生欄位（推導規則在後端），本地不重算，由呼叫端明示；列表重抓時以 server 為準。
 */
export function dmSessionContainerToSummary(
  c: DmSessionContainerDTO,
  nextSession: DmSessionLogSummaryDTO | null,
): DmSessionContainerSummaryDTO {
  return {
    id: c.id,
    title: c.title,
    members: c.members.map((m) => ({ playerName: m.playerName })),
    nextSession,
    createdAt: c.createdAt,
  }
}

/** DTO → 容器時間軸 summary：create / update 後本地同步 container.sessions 用。 */
export function dmSessionLogToSummary(l: DmSessionLogDTO): DmSessionLogSummaryDTO {
  return { id: l.id, title: l.title, date: l.date }
}

/**
 * 對齊 server 排序（date 升冪）後回傳新陣列；同日靠 stable sort 保留輸入相對序。
 * 輸入需已是 server 序：新建 log 的 createdAt 恆最大，push 後重排即與 server 一致；
 * 僅「把舊 log 改成與更早 log 同日」會暫時錯序，下次重抓容器自癒。
 */
export function sortDmSessionLogSummaries(
  sessions: DmSessionLogSummaryDTO[],
): DmSessionLogSummaryDTO[] {
  return [...sessions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** 以欄位為粒度比對 patch 與原始 DTO，只放變更欄位；updatedAt 作 optimistic lock token。 */
export function buildDmSessionContainerUpdateBody(
  original: DmSessionContainerDTO,
  patch: Partial<Pick<DmSessionContainerDTO, 'title' | 'remark'>> &
    Partial<{ members: DmSessionMemberDTO[] }>,
): DmSessionContainerUpdateBody {
  const members = patch.members !== undefined ? toDmSessionMemberInputs(patch.members) : undefined
  return {
    updatedAt: original.updatedAt,
    ...(patch.title !== undefined && patch.title !== original.title && { title: patch.title }),
    ...(patch.remark !== undefined && patch.remark !== original.remark && { remark: patch.remark }),
    ...(members !== undefined &&
      !deepEqual(members, toDmSessionMemberInputs(original.members)) && { members }),
  }
}

/** 表單草稿 → 建立 payload：members 轉寫入形，其餘欄位原樣。 */
export function buildDmSessionLogCreateBody(draft: DmSessionLogDraft): DmSessionLogCreateBody {
  const { members, ...rest } = draft
  return { ...rest, members: toDmSessionMemberInputs(members) }
}

/** 以欄位為粒度比對草稿與原始 DTO，只放變更欄位；updatedAt 作 optimistic lock token。 */
export function buildDmSessionLogUpdateBody(
  original: DmSessionLogDTO,
  draft: DmSessionLogDraft,
): DmSessionLogUpdateBody {
  const members = toDmSessionMemberInputs(draft.members)
  return {
    updatedAt: original.updatedAt,
    ...(draft.title !== original.title && { title: draft.title }),
    ...(draft.date !== original.date && { date: draft.date }),
    ...(draft.content !== original.content && { content: draft.content }),
    ...(!deepEqual(members, toDmSessionMemberInputs(original.members)) && { members }),
    ...(!deepEqual(draft.moneyRewards, original.moneyRewards) && {
      moneyRewards: draft.moneyRewards,
    }),
    ...(draft.expRewards !== original.expRewards && { expRewards: draft.expRewards }),
    ...(!deepEqual(draft.itemRewards, original.itemRewards) && { itemRewards: draft.itemRewards }),
  }
}
