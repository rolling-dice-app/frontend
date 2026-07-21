import type { DamageDieType, DamageTypeKey } from '@rolling-dice-app/core'
import type {
  BattlefieldAttackEntry,
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

/** 攻擊 seed 縮寫：prefix 保證行內 id 於單位內唯一；每次呼叫回傳新陣列（避免跨單位共享參照） */
const attack = (
  prefix: string,
  name: string,
  hitBonus: number,
  dice: { dieType: DamageDieType | null; count: number; bonus: number | null }[],
  damageType: (DamageTypeKey | null)[],
  comment: string | null = null,
): BattlefieldAttackEntry => ({
  id: `${prefix}-${name}`,
  name,
  hitBonus,
  damageDice: dice.map((line, index) => ({
    id: `${prefix}-${name}-${index}`,
    dieType: line.dieType,
    count: line.count,
    bonus: line.bonus,
    damageType: damageType[index] ?? null,
  })),
  comment,
})

/** 哥布林彎刀＋短弓（模板與實例共用的產生器） */
const goblinAttacks = (prefix: string): BattlefieldAttackEntry[] => [
  attack(prefix, '彎刀', 4, [{ dieType: 6, count: 1, bonus: 2 }], ['slashing']),
  attack(prefix, '短弓', 4, [{ dieType: 6, count: 1, bonus: 2 }], ['piercing'], '射程 80/320 呎'),
]

/** 巨蛛毒咬：多行傷害條目（穿刺＋毒素），驗爆擊翻倍與分行加總 */
const spiderAttacks = (prefix: string): BattlefieldAttackEntry[] => [
  attack(
    prefix,
    '毒咬',
    5,
    [
      { dieType: 8, count: 1, bonus: 3 },
      { dieType: 8, count: 2, bonus: null },
    ],
    ['piercing', 'poison'],
    'DC 11 體質豁免，失敗受毒素傷害',
  ),
]

const bossAttacks = (prefix: string): BattlefieldAttackEntry[] => [
  attack(prefix, '彎刀', 4, [{ dieType: 6, count: 1, bonus: 2 }], ['slashing'], '多重攻擊：兩次'),
]

const MOCK_TEMPLATES: BattlefieldTemplateSource[] = [
  {
    id: 'mock-tpl-goblin',
    name: '哥布林',
    challengeRating: '1/4',
    hp: 7,
    ac: 15,
    speed: 30,
    initiativeBonus: 2,
    attacks: goblinAttacks('mock-a-tpl-goblin'),
    skills: { stealth: 6 },
  },
  {
    id: 'mock-tpl-boss',
    name: '哥布林首領',
    challengeRating: '1',
    hp: 21,
    ac: 17,
    speed: 30,
    initiativeBonus: 1,
    attacks: bossAttacks('mock-a-tpl-boss'),
    skills: { stealth: 6, intimidation: 2 },
  },
  {
    // 攻擊／技能皆空：驗右欄兩區塊的空狀態（不渲染）
    id: 'mock-tpl-ghost',
    name: '恐懼幽靈',
    challengeRating: '2',
    hp: 22,
    ac: 12,
    speed: 0,
    initiativeBonus: 2,
    attacks: [],
    skills: {},
  },
  {
    id: 'mock-tpl-spider',
    name: '巨蛛',
    challengeRating: '1',
    hp: 26,
    ac: 14,
    speed: 30,
    initiativeBonus: 3,
    attacks: spiderAttacks('mock-a-tpl-spider'),
    skills: { stealth: 7 },
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
    attacks: [
      attack('mock-a-aliya', '長劍', 8, [{ dieType: 8, count: 1, bonus: 5 }], ['slashing']),
    ],
    skills: { athletics: 8, intimidation: 3 },
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
    attacks: [
      attack('mock-a-thorin', '戰鎚', 5, [{ dieType: 8, count: 1, bonus: 2 }], ['bludgeoning']),
    ],
    skills: { medicine: 6, religion: 4, insight: 6 },
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
    attacks: [
      attack('mock-a-finn', '長弓', 9, [{ dieType: 8, count: 1, bonus: 4 }], ['piercing']),
      attack('mock-a-finn', '短劍', 7, [{ dieType: 6, count: 1, bonus: 4 }], ['piercing']),
    ],
    skills: { perception: 7, stealth: 8, survival: 5 },
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
    attacks: [
      attack(
        'mock-a-luna',
        '短劍',
        7,
        [{ dieType: 6, count: 1, bonus: 4 }],
        ['piercing'],
        '偷襲成立時 +3d6',
      ),
    ],
    skills: { stealth: 9, sleightOfHand: 7, acrobatics: 6 },
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
  deathSaves: { successes: 0, failures: 0 },
  attacks: [],
  skills: {},
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
      attacks: goblinAttacks('mock-a-g1'),
      skills: { stealth: 6 },
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
      attacks: [
        attack('mock-a-u-finn', '長弓', 9, [{ dieType: 8, count: 1, bonus: 4 }], ['piercing']),
        attack('mock-a-u-finn', '短劍', 7, [{ dieType: 6, count: 1, bonus: 4 }], ['piercing']),
      ],
      skills: { perception: 7, stealth: 8, survival: 5 },
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
      attacks: bossAttacks('mock-a-u-boss'),
      skills: { stealth: 6, intimidation: 2 },
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
      attacks: [
        attack(
          'mock-a-u-luna',
          '短劍',
          7,
          [{ dieType: 6, count: 1, bonus: 4 }],
          ['piercing'],
          '偷襲成立時 +3d6',
        ),
      ],
      skills: { stealth: 9, sleightOfHand: 7, acrobatics: 6 },
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
      attacks: [
        attack('mock-a-u-aliya', '長劍', 8, [{ dieType: 8, count: 1, bonus: 5 }], ['slashing']),
      ],
      skills: { athletics: 8, intimidation: 3 },
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
      attacks: goblinAttacks('mock-a-g3'),
      skills: { stealth: 6 },
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
      attacks: [
        attack('mock-a-u-thorin', '戰鎚', 5, [{ dieType: 8, count: 1, bonus: 2 }], ['bludgeoning']),
      ],
      skills: { medicine: 6, religion: 4, insight: 6 },
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
      attacks: goblinAttacks('mock-a-g2'),
      skills: { stealth: 6 },
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
      // HP 0 ＋死亡豁免進行中：右欄死亡豁免區塊的 seed 邊界
      id: 'mock-u-wolf',
      faction: 'player',
      name: '狼夥伴',
      title: '菲恩的召喚',
      maxHp: 11,
      currentHp: 0,
      currentAc: 13,
      speed: 40,
      initiativeBonus: 2,
      deathSaves: { successes: 1, failures: 1 },
      attacks: [
        attack('mock-a-u-wolf', '撕咬', 4, [{ dieType: 4, count: 2, bonus: 2 }], ['piercing']),
      ],
      skills: { perception: 3 },
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
            attacks: [
              attack(
                'mock-a-brandon',
                '戰鎚',
                5,
                [{ dieType: 8, count: 1, bonus: 3 }],
                ['bludgeoning'],
              ),
            ],
            skills: { persuasion: 4, religion: 3 },
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
            attacks: [
              attack(
                'mock-a-rinyue',
                '火焰箭',
                5,
                [{ dieType: 10, count: 1, bonus: null }],
                ['fire'],
              ),
            ],
            skills: { arcana: 5, history: 5, investigation: 4 },
          },
        ],
      },
    ],
    templates: MOCK_TEMPLATES,
    battlefields: [MIST_BATTLEFIELD],
  })
}
