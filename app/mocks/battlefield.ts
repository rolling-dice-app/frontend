import type {
  BattlefieldDTO,
  BattlefieldMemberSource,
  BattlefieldSessionOption,
  BattlefieldTemplateSource,
  BattlefieldUnit,
} from '~/types/business/battlefield'

/**
 * 即時戰場開發 fixture（m7.3 UI 階段）。
 *
 * backend 未串接前的本地 seed 資料，由 `app/stores/battlefield.ts` 首次載入時 clone 進
 * cache，之後的增刪改皆為 in-memory 變更（重整即還原）。內容刻意涵蓋各邊界：
 * 成員（可帶入 / 快照失敗）、速度雙型別（角色數值 / 怪物字串）、臨時 HP、帶備註與
 * 無備註的狀態、先攻平手（菲恩 17 vs 哥布林首領 17）、未參戰單位、無戰場的團務。
 * TODO(串接階段): 由 api client 取代 store 內部實作後刪除整份檔案。
 */

interface BattlefieldMockSessionSeed {
  option: Omit<BattlefieldSessionOption, 'battlefieldId'>
  members: BattlefieldMemberSource[]
}

export interface BattlefieldMockSeed {
  sessions: BattlefieldMockSessionSeed[]
  templates: BattlefieldTemplateSource[]
  battlefields: BattlefieldDTO[]
}

const MOCK_TEMPLATES: BattlefieldTemplateSource[] = [
  {
    id: 'mock-tpl-goblin',
    name: '哥布林',
    challengeRating: '1/4',
    hp: 7,
    ac: 15,
    speed: 30,
    initiativeBonus: 2,
  },
  {
    id: 'mock-tpl-boss',
    name: '哥布林首領',
    challengeRating: '1',
    hp: 21,
    ac: 17,
    speed: 30,
    initiativeBonus: 1,
  },
  {
    id: 'mock-tpl-ghost',
    name: '恐懼幽靈',
    challengeRating: '2',
    hp: 22,
    ac: 12,
    speed: 0,
    initiativeBonus: 2,
  },
  {
    id: 'mock-tpl-spider',
    name: '巨蛛',
    challengeRating: '1',
    hp: 26,
    ac: 14,
    speed: 30,
    initiativeBonus: 3,
  },
]

const MIST_MEMBERS: BattlefieldMemberSource[] = [
  {
    shareId: 'chs_mock_a1x2',
    playerName: '小艾',
    available: true,
    name: '艾莉亞',
    race: '人類',
    classes: [{ classKey: 'fighter', level: 5, subclass: null }],
    maxHp: 44,
    ac: 18,
    speed: 30,
    totalInitiative: 1,
  },
  {
    shareId: 'chs_mock_b3y4',
    playerName: '阿索',
    available: true,
    name: '索林',
    race: '矮人',
    classes: [{ classKey: 'cleric', level: 5, subclass: null }],
    maxHp: 38,
    ac: 16,
    speed: 25,
    totalInitiative: 0,
  },
  {
    shareId: 'chs_mock_c5z6',
    playerName: '菲菲',
    available: true,
    name: '菲恩',
    race: '精靈',
    classes: [{ classKey: 'ranger', level: 5, subclass: null }],
    maxHp: 31,
    ac: 15,
    speed: 35,
    totalInitiative: 4,
  },
  {
    shareId: 'chs_mock_d7w8',
    playerName: '露露',
    available: true,
    name: '露娜',
    race: '半身人',
    classes: [{ classKey: 'rogue', level: 5, subclass: null }],
    maxHp: 27,
    ac: 14,
    speed: 25,
    totalInitiative: 3,
  },
  { shareId: 'chs_mock_e9v0', playerName: '阿豪', available: false },
]

/** 建立單位的 seed 縮寫：只填差異欄位 */
const unit = (
  base: Partial<BattlefieldUnit> & Pick<BattlefieldUnit, 'id' | 'name'>,
): BattlefieldUnit => ({
  kind: 'adhoc',
  shareId: null,
  templateId: null,
  faction: 'neutral',
  title: '',
  race: null,
  classes: [],
  maxHp: 10,
  baseMaxHp: base.maxHp ?? 10,
  currentHp: base.maxHp ?? 10,
  tempHp: 0,
  baseAc: base.currentAc ?? 10,
  currentAc: 10,
  speed: null,
  speedAdjustment: 0,
  initiativeBonus: 0,
  initiative: null,
  sortOrder: 999,
  conditions: [],
  inCombat: false,
  ...base,
})

const MIST_BATTLEFIELD: BattlefieldDTO = {
  id: 'mock-bf-mist-3',
  sessionId: 'mock-session-mist-3',
  battleSequence: 1,
  round: 2,
  activeUnitId: 'mock-u-g1',
  inProgress: true,
  createdAt: '2026-07-15T12:00:00.000Z',
  updatedAt: '2026-07-15T12:00:00.000Z',
  units: [
    // 先攻降冪 sortOrder：g1 19 → 菲恩 17 → 首領 17（平手）→ 露娜 15 → 艾莉亞 12 → g3 11 → 索林 8 → g2 6
    unit({
      id: 'mock-u-g1',
      kind: 'monster',
      templateId: 'mock-tpl-goblin',
      faction: 'enemy',
      name: '哥布林 1',
      maxHp: 7,
      currentAc: 15,
      speed: 30,
      initiativeBonus: 2,
      initiative: 19,
      sortOrder: 0,
      inCombat: true,
    }),
    unit({
      id: 'mock-u-finn',
      kind: 'character',
      shareId: 'chs_mock_c5z6',
      faction: 'player',
      name: '菲恩',
      race: '精靈',
      classes: [{ classKey: 'ranger', level: 5, subclass: null }],
      maxHp: 31,
      currentAc: 15,
      speed: 35,
      initiativeBonus: 4,
      initiative: 17,
      sortOrder: 1,
      inCombat: true,
    }),
    unit({
      id: 'mock-u-boss',
      kind: 'monster',
      templateId: 'mock-tpl-boss',
      faction: 'enemy',
      name: '哥布林首領',
      maxHp: 21,
      currentAc: 17,
      speed: 30,
      initiativeBonus: 1,
      initiative: 17,
      sortOrder: 2,
      inCombat: true,
    }),
    unit({
      id: 'mock-u-luna',
      kind: 'character',
      shareId: 'chs_mock_d7w8',
      faction: 'player',
      name: '露娜',
      race: '半身人',
      classes: [{ classKey: 'rogue', level: 5, subclass: null }],
      maxHp: 27,
      currentHp: 12,
      tempHp: 5,
      currentAc: 14,
      speed: 25,
      initiativeBonus: 3,
      initiative: 15,
      sortOrder: 3,
      inCombat: true,
    }),
    unit({
      id: 'mock-u-aliya',
      kind: 'character',
      shareId: 'chs_mock_a1x2',
      faction: 'player',
      name: '艾莉亞',
      race: '人類',
      classes: [{ classKey: 'fighter', level: 5, subclass: null }],
      maxHp: 44,
      currentAc: 18,
      speed: 30,
      initiativeBonus: 1,
      initiative: 12,
      sortOrder: 4,
      inCombat: true,
    }),
    unit({
      id: 'mock-u-g3',
      kind: 'monster',
      templateId: 'mock-tpl-goblin',
      faction: 'enemy',
      name: '哥布林 3',
      maxHp: 7,
      currentAc: 15,
      speed: 30,
      initiativeBonus: 2,
      initiative: 11,
      sortOrder: 5,
      inCombat: true,
    }),
    unit({
      id: 'mock-u-thorin',
      kind: 'character',
      shareId: 'chs_mock_b3y4',
      faction: 'player',
      name: '索林',
      race: '矮人',
      classes: [{ classKey: 'cleric', level: 5, subclass: null }],
      maxHp: 38,
      currentAc: 16,
      speed: 25,
      initiativeBonus: 0,
      initiative: 8,
      sortOrder: 6,
      inCombat: true,
      conditions: [{ id: 'mock-c-1', key: 'poisoned', note: '蛛毒，長休解除' }],
    }),
    unit({
      id: 'mock-u-g2',
      kind: 'monster',
      templateId: 'mock-tpl-goblin',
      faction: 'enemy',
      name: '哥布林 2',
      maxHp: 7,
      currentHp: 3,
      currentAc: 15,
      speed: 30,
      initiativeBonus: 2,
      initiative: 6,
      sortOrder: 7,
      inCombat: true,
      conditions: [{ id: 'mock-c-2', key: 'prone', note: null }],
    }),
    // 未參戰單位：中立 NPC（速度數值）＋玩家方召喚物（速度字串的 adhoc 邊界）
    unit({
      id: 'mock-u-pipo',
      name: '皮波',
      title: '吟遊詩人嚮導',
      maxHp: 16,
      currentAc: 13,
      speed: 30,
      initiativeBonus: 2,
    }),
    unit({
      id: 'mock-u-wolf',
      faction: 'player',
      name: '狼夥伴',
      title: '菲恩的召喚',
      maxHp: 11,
      currentAc: 13,
      speed: 40,
      initiativeBonus: 2,
    }),
  ],
}

export function buildBattlefieldMockSeed(): BattlefieldMockSeed {
  return structuredClone({
    sessions: [
      {
        option: {
          sessionId: 'mock-session-mist-3',
          containerTitle: '迷霧沼澤',
          sessionTitle: '第 3 場：沼心遺跡',
          date: '2026-07-12',
          memberCount: MIST_MEMBERS.length,
        },
        members: MIST_MEMBERS,
      },
      {
        option: {
          sessionId: 'mock-session-mist-4',
          containerTitle: '迷霧沼澤',
          sessionTitle: '第 4 場：王都密會',
          date: '2026-07-19',
          memberCount: MIST_MEMBERS.length,
        },
        members: MIST_MEMBERS,
      },
      {
        option: {
          sessionId: 'mock-session-crown-1',
          containerTitle: '失落王冠的陰影',
          sessionTitle: '第 1 場：龍臨鎮風波',
          date: '2026-07-26',
          memberCount: 2,
        },
        members: [
          {
            shareId: 'chs_mock_f2u1',
            playerName: '佩佩',
            available: true,
            name: '布蘭登．火鬚',
            race: '矮人',
            classes: [{ classKey: 'paladin', level: 3, subclass: null }],
            maxHp: 28,
            ac: 18,
            speed: 25,
            totalInitiative: 0,
          },
          {
            shareId: 'chs_mock_g4t3',
            playerName: '阿凱',
            available: true,
            name: '凜月',
            race: '精靈',
            classes: [{ classKey: 'wizard', level: 3, subclass: null }],
            maxHp: 17,
            ac: 12,
            speed: 30,
            totalInitiative: 2,
          },
        ],
      },
    ],
    templates: MOCK_TEMPLATES,
    battlefields: [MIST_BATTLEFIELD],
  })
}
