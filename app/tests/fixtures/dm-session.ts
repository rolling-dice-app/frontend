import type {
  DmSessionContainerDTO,
  DmSessionContainerSummaryDTO,
  DmSessionLogDTO,
  DmSessionLogSummaryDTO,
  DmSessionMemberDTO,
  SharedCharacterPreviewDTO,
} from '@rolling-dice-app/core'
import type { DmSessionLogDraft } from '~/types/business/dm-session'

/** 已連結且有效的角色分享預覽；用 overrides 造 available:false 的失效連結。 */
export function createMockSharedCharacterPreview(
  overrides: Partial<SharedCharacterPreviewDTO> = {},
): SharedCharacterPreviewDTO {
  return {
    shareId: 'chs_mock0001',
    available: true,
    name: '艾拉',
    avatar: null,
    ownerDisplayName: '小華',
    ...overrides,
  }
}

/** 預設為未連結成員（character: null）。 */
export function createMockDmSessionMember(
  overrides: Partial<DmSessionMemberDTO> = {},
): DmSessionMemberDTO {
  return { id: 'mem-001', playerName: '小明', character: null, ...overrides }
}

export function createMockDmSessionContainer(
  overrides: Partial<DmSessionContainerDTO> = {},
): DmSessionContainerDTO {
  return {
    id: 'dsc-001',
    userId: 'user-001',
    title: '失落的礦坑',
    members: [
      createMockDmSessionMember(),
      createMockDmSessionMember({
        id: 'mem-002',
        playerName: '小華',
        character: createMockSharedCharacterPreview(),
      }),
    ],
    remark: '每週五晚上開團',
    sessions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  }
}

export function createMockDmSessionLog(overrides: Partial<DmSessionLogDTO> = {}): DmSessionLogDTO {
  return {
    id: 'dsl-001',
    containerId: 'dsc-001',
    title: '第一章：進入礦坑',
    date: '2026-01-10',
    content: '一行人抵達礦坑入口。',
    members: [createMockDmSessionMember()],
    moneyRewards: { cp: 0, sp: 0, gp: 10, pp: 0 },
    expRewards: 300,
    itemRewards: [{ id: 'ir-1', item: '治療藥水', player: '小明', remark: '' }],
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-01-11T00:00:00.000Z',
    ...overrides,
  }
}

/** 以 DTO 為底的表單草稿（去 server 欄位）；預設為「未變更」基準。 */
export function createMockDmSessionLogDraft(
  base: DmSessionLogDTO = createMockDmSessionLog(),
  overrides: Partial<DmSessionLogDraft> = {},
): DmSessionLogDraft {
  const {
    id: _id,
    containerId: _cid,
    createdAt: _c,
    updatedAt: _u,
    ...draft
  } = structuredClone(base)
  return { ...draft, ...overrides }
}

export function containerToSummary(c: DmSessionContainerDTO): DmSessionContainerSummaryDTO {
  return {
    id: c.id,
    title: c.title,
    members: c.members.map((m) => ({ playerName: m.playerName })),
    createdAt: c.createdAt,
  }
}

export function logToSummary(l: DmSessionLogDTO): DmSessionLogSummaryDTO {
  return { id: l.id, title: l.title, date: l.date }
}
