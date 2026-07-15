import type {
  DmSessionContainerDTO,
  DmSessionContainerUpdateBody,
  DmSessionLogCreateBody,
  DmSessionLogDTO,
  DmSessionLogUpdateBody,
  DmSessionMemberDTO,
  DmSessionMemberInput,
} from '@rolling-dice-app/core'
import type { DmSessionLogDraft } from '~/types/business/dm-session'
import { deepEqual } from '~/utils/deep-equal'

/**
 * 讀取形成員 → 寫入形：character 連結收斂為 shareId（未連結為 null）。
 *
 * `collapseUnavailable`（log 專用）：失效連結（`available: false`）收斂為 null。
 * log 出席名單是快照，帶著失效 shareId 送出會被 backend 當「新連結」以 422 拒絕。
 * container update 不可開啟此參數——container 層設計是「既存失效引用可續存」。
 */
export function toDmSessionMemberInputs(
  members: DmSessionMemberDTO[],
  opts: { collapseUnavailable?: boolean } = {},
): DmSessionMemberInput[] {
  return members.map((m) => ({
    id: m.id,
    playerName: m.playerName,
    characterShareId:
      opts.collapseUnavailable && m.character?.available === false
        ? null
        : (m.character?.shareId ?? null),
  }))
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

/** 表單草稿 → 建立 payload：members 轉寫入形（失效連結收斂為 null），其餘欄位原樣。 */
export function buildDmSessionLogCreateBody(draft: DmSessionLogDraft): DmSessionLogCreateBody {
  const { members, ...rest } = draft
  return { ...rest, members: toDmSessionMemberInputs(members, { collapseUnavailable: true }) }
}

/** 以欄位為粒度比對草稿與原始 DTO，只放變更欄位；updatedAt 作 optimistic lock token。 */
export function buildDmSessionLogUpdateBody(
  original: DmSessionLogDTO,
  draft: DmSessionLogDraft,
): DmSessionLogUpdateBody {
  // 是否有變更以「未收斂形」比對（availability 翻轉不觸發 diff）；真的要送才收斂失效連結，
  // 避免帶失效 shareId 被 backend 當新連結 422 拒絕。
  const membersChanged = !deepEqual(
    toDmSessionMemberInputs(draft.members),
    toDmSessionMemberInputs(original.members),
  )
  return {
    updatedAt: original.updatedAt,
    ...(draft.title !== original.title && { title: draft.title }),
    ...(draft.date !== original.date && { date: draft.date }),
    ...(draft.content !== original.content && { content: draft.content }),
    ...(membersChanged && {
      members: toDmSessionMemberInputs(draft.members, { collapseUnavailable: true }),
    }),
    ...(!deepEqual(draft.moneyRewards, original.moneyRewards) && {
      moneyRewards: draft.moneyRewards,
    }),
    ...(draft.expRewards !== original.expRewards && { expRewards: draft.expRewards }),
    ...(!deepEqual(draft.itemRewards, original.itemRewards) && { itemRewards: draft.itemRewards }),
  }
}
