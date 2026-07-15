import { describe, expect, it } from 'vitest'
import {
  buildDmSessionContainerUpdateBody,
  buildDmSessionLogCreateBody,
  buildDmSessionLogUpdateBody,
  dmSessionContainerToSummary,
  dmSessionLogToSummary,
  sortDmSessionLogSummaries,
  toDmSessionMemberInputs,
} from '~/helpers/dm-session'
import {
  createMockDmSessionContainer,
  createMockDmSessionLog,
  createMockDmSessionLogDraft,
  createMockDmSessionMember,
  createMockSharedCharacterPreview,
} from '~/tests/fixtures/dm-session'

describe('toDmSessionMemberInputs', () => {
  it('未連結成員 characterShareId 為 null', () => {
    const inputs = toDmSessionMemberInputs([createMockDmSessionMember()])
    expect(inputs).toEqual([{ id: 'mem-001', playerName: '小明', characterShareId: null }])
  })

  it('已連結成員取 character.shareId', () => {
    const member = createMockDmSessionMember({ character: createMockSharedCharacterPreview() })
    expect(toDmSessionMemberInputs([member])[0]?.characterShareId).toBe('chs_mock0001')
  })

  it('失效連結（available:false）仍保留原 shareId', () => {
    const member = createMockDmSessionMember({
      character: createMockSharedCharacterPreview({
        available: false,
        name: null,
        avatar: null,
        ownerDisplayName: null,
      }),
    })
    expect(toDmSessionMemberInputs([member])[0]?.characterShareId).toBe('chs_mock0001')
  })
})

describe('dmSessionContainerToSummary / dmSessionLogToSummary', () => {
  it('容器 summary 投影 id / title / members.playerName / createdAt，nextSession 由呼叫端明示', () => {
    const summary = dmSessionContainerToSummary(createMockDmSessionContainer(), null)
    expect(summary).toEqual({
      id: 'dsc-001',
      title: '失落的礦坑',
      members: [{ playerName: '小明' }, { playerName: '小華' }],
      nextSession: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('nextSession 原樣帶入，不做本地推導', () => {
    const next = { id: 'dsl-002', title: '未來場', date: '2026-01-20' }
    const summary = dmSessionContainerToSummary(createMockDmSessionContainer(), next)
    expect(summary.nextSession).toEqual(next)
  })

  it('紀錄 summary 只投影 id / title / date', () => {
    const summary = dmSessionLogToSummary(createMockDmSessionLog())
    expect(summary).toEqual({ id: 'dsl-001', title: '第一章：進入礦坑', date: '2026-01-10' })
  })
})

describe('sortDmSessionLogSummaries', () => {
  it('date 升冪排序，同日保留輸入相對序（stable）', () => {
    const sorted = sortDmSessionLogSummaries([
      { id: 'b', title: 'B', date: '2026-01-05' },
      { id: 'c', title: 'C', date: '2026-01-05' },
      { id: 'a', title: 'A', date: '2026-01-01' },
    ])
    expect(sorted.map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('回傳新陣列，不改動輸入', () => {
    const input = [
      { id: 'b', title: 'B', date: '2026-01-05' },
      { id: 'a', title: 'A', date: '2026-01-01' },
    ]
    const sorted = sortDmSessionLogSummaries(input)
    expect(sorted).not.toBe(input)
    expect(input.map((s) => s.id)).toEqual(['b', 'a'])
  })
})

describe('buildDmSessionContainerUpdateBody', () => {
  it('空 patch 只剩 updatedAt', () => {
    const original = createMockDmSessionContainer()
    expect(buildDmSessionContainerUpdateBody(original, {})).toEqual({
      updatedAt: original.updatedAt,
    })
  })

  it('欄位值與原值相同時不放入 body', () => {
    const original = createMockDmSessionContainer()
    const body = buildDmSessionContainerUpdateBody(original, {
      title: original.title,
      remark: original.remark,
    })
    expect(body).toEqual({ updatedAt: original.updatedAt })
  })

  it('只放變更欄位', () => {
    const original = createMockDmSessionContainer()
    const body = buildDmSessionContainerUpdateBody(original, { title: '新劇本名' })
    expect(body).toEqual({ updatedAt: original.updatedAt, title: '新劇本名' })
  })

  it('members 僅 character 預覽欄位不同（轉寫入形後等值）不放入 body', () => {
    const original = createMockDmSessionContainer()
    const members = structuredClone(original.members)
    // 模擬他端改了角色名 / 頭像：hydrate 預覽變了但 shareId 沒變
    members[1]!.character = createMockSharedCharacterPreview({ name: '改名後', avatar: 'x.png' })
    const body = buildDmSessionContainerUpdateBody(original, { members })
    expect(body).toEqual({ updatedAt: original.updatedAt })
  })

  it('members 實際變更時放入寫入形（characterShareId）', () => {
    const original = createMockDmSessionContainer()
    const members = [
      ...structuredClone(original.members),
      createMockDmSessionMember({ id: 'mem-003', playerName: '小美' }),
    ]
    const body = buildDmSessionContainerUpdateBody(original, { members })
    expect(body.members).toEqual([
      { id: 'mem-001', playerName: '小明', characterShareId: null },
      { id: 'mem-002', playerName: '小華', characterShareId: 'chs_mock0001' },
      { id: 'mem-003', playerName: '小美', characterShareId: null },
    ])
  })
})

describe('buildDmSessionLogCreateBody', () => {
  it('members 轉寫入形，其餘欄位原樣', () => {
    const draft = createMockDmSessionLogDraft()
    const body = buildDmSessionLogCreateBody(draft)
    expect(body).toEqual({
      title: draft.title,
      date: draft.date,
      content: draft.content,
      members: [{ id: 'mem-001', playerName: '小明', characterShareId: null }],
      moneyRewards: draft.moneyRewards,
      expRewards: draft.expRewards,
      itemRewards: draft.itemRewards,
    })
  })
})

describe('buildDmSessionLogUpdateBody', () => {
  it('未變更草稿只剩 updatedAt', () => {
    const original = createMockDmSessionLog()
    const body = buildDmSessionLogUpdateBody(original, createMockDmSessionLogDraft(original))
    expect(body).toEqual({ updatedAt: original.updatedAt })
  })

  it('只放變更欄位（title / date / content / expRewards）', () => {
    const original = createMockDmSessionLog()
    const body = buildDmSessionLogUpdateBody(
      original,
      createMockDmSessionLogDraft(original, { title: '改標題', expRewards: 500 }),
    )
    expect(body).toEqual({ updatedAt: original.updatedAt, title: '改標題', expRewards: 500 })
  })

  it('moneyRewards / itemRewards 走深比對', () => {
    const original = createMockDmSessionLog()
    const draft = createMockDmSessionLogDraft(original)
    draft.moneyRewards = { ...draft.moneyRewards, gp: 99 }
    draft.itemRewards = [{ ...draft.itemRewards[0]!, remark: '戰利品' }]
    const body = buildDmSessionLogUpdateBody(original, draft)
    expect(body).toEqual({
      updatedAt: original.updatedAt,
      moneyRewards: { cp: 0, sp: 0, gp: 99, pp: 0 },
      itemRewards: [{ id: 'ir-1', item: '治療藥水', player: '小明', remark: '戰利品' }],
    })
  })

  it('members 僅 character 預覽欄位不同（轉寫入形後等值）不放入 body', () => {
    const original = createMockDmSessionLog({
      members: [createMockDmSessionMember({ character: createMockSharedCharacterPreview() })],
    })
    const draft = createMockDmSessionLogDraft(original)
    draft.members[0]!.character = createMockSharedCharacterPreview({ available: false, name: null })
    expect(buildDmSessionLogUpdateBody(original, draft)).toEqual({
      updatedAt: original.updatedAt,
    })
  })

  it('members 出席名單變更時放入寫入形', () => {
    const original = createMockDmSessionLog()
    const draft = createMockDmSessionLogDraft(original, { members: [] })
    expect(buildDmSessionLogUpdateBody(original, draft)).toEqual({
      updatedAt: original.updatedAt,
      members: [],
    })
  })
})
