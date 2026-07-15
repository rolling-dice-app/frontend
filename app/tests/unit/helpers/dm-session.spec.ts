import { describe, expect, it } from 'vitest'
import {
  buildDmSessionContainerUpdateBody,
  buildDmSessionLogCreateBody,
  buildDmSessionLogUpdateBody,
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

  it('collapseUnavailable 時失效連結收斂為 null，有效連結不受影響', () => {
    const dead = createMockDmSessionMember({
      character: createMockSharedCharacterPreview({ available: false, name: null }),
    })
    const alive = createMockDmSessionMember({
      id: 'mem-002',
      character: createMockSharedCharacterPreview(),
    })
    const inputs = toDmSessionMemberInputs([dead, alive], { collapseUnavailable: true })
    expect(inputs[0]?.characterShareId).toBeNull()
    expect(inputs[1]?.characterShareId).toBe('chs_mock0001')
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

  it('members 含失效連結時保留原 shareId（既存失效引用可續存，不收斂）', () => {
    const original = createMockDmSessionContainer()
    const members = structuredClone(original.members)
    members[1]!.character = createMockSharedCharacterPreview({ available: false, name: null })
    members.push(createMockDmSessionMember({ id: 'mem-003', playerName: '小美' }))
    const body = buildDmSessionContainerUpdateBody(original, { members })
    expect(body.members?.[1]).toEqual({
      id: 'mem-002',
      playerName: '小華',
      characterShareId: 'chs_mock0001',
    })
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

  it('失效連結成員收斂為 characterShareId: null（container 預填全員出席不再 422）', () => {
    const draft = createMockDmSessionLogDraft(
      createMockDmSessionLog({
        members: [
          createMockDmSessionMember({
            character: createMockSharedCharacterPreview({ available: false, name: null }),
          }),
          createMockDmSessionMember({
            id: 'mem-002',
            playerName: '小華',
            character: createMockSharedCharacterPreview(),
          }),
        ],
      }),
    )
    expect(buildDmSessionLogCreateBody(draft).members).toEqual([
      { id: 'mem-001', playerName: '小明', characterShareId: null },
      { id: 'mem-002', playerName: '小華', characterShareId: 'chs_mock0001' },
    ])
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

  it('出席名單變更時失效連結成員收斂為 null（roster 重新 toggle 失效成員不再 422）', () => {
    const original = createMockDmSessionLog()
    const draft = createMockDmSessionLogDraft(original, {
      members: [
        ...structuredClone(original.members),
        createMockDmSessionMember({
          id: 'mem-002',
          playerName: '小華',
          character: createMockSharedCharacterPreview({ available: false, name: null }),
        }),
      ],
    })
    expect(buildDmSessionLogUpdateBody(original, draft).members).toEqual([
      { id: 'mem-001', playerName: '小明', characterShareId: null },
      { id: 'mem-002', playerName: '小華', characterShareId: null },
    ])
  })

  it('log 既存失效成員、出席名單未變更 → 不放入 members（不觸發誤 diff）', () => {
    const original = createMockDmSessionLog({
      members: [
        createMockDmSessionMember({
          character: createMockSharedCharacterPreview({ available: false, name: null }),
        }),
      ],
    })
    const draft = createMockDmSessionLogDraft(original)
    expect(buildDmSessionLogUpdateBody(original, draft)).toEqual({
      updatedAt: original.updatedAt,
    })
  })
})
