import type { DmSessionContainerDTO, DmSessionLogDTO } from '@rolling-dice-app/core'

/**
 * 團務紀錄開發 fixture（m7.2 UI 階段）。
 *
 * backend 未串接前的本地 seed 資料，由 `app/stores/dm-session.ts` 首次載入時 clone 進 cache，
 * 之後的增刪改皆為 in-memory 變更（重整即還原）。內容刻意涵蓋各邊界：
 * 成員（有頭像 / 無頭像 / 分享失效 / 未連結）、同日兩場的時間軸 tie-break、零獎勵場次、全空容器。
 * TODO(串接階段): 由 api client 取代 store 內部實作後刪除整份檔案。
 */

const MOCK_USER_ID = 'mock-dm-user'

const SEED_CONTAINERS: DmSessionContainerDTO[] = [
  {
    id: 'mock-lost-crown',
    userId: MOCK_USER_ID,
    title: '失落王冠的陰影',
    members: [
      {
        id: 'mock-member-aze',
        playerName: '阿哲',
        character: {
          shareId: 'chs_mock_aze',
          available: true,
          name: '凜月',
          avatar: '/dice-20.png',
          ownerDisplayName: '阿哲',
        },
      },
      {
        id: 'mock-member-fish',
        playerName: '小魚',
        character: {
          shareId: 'chs_mock_fish',
          available: true,
          name: '布蘭登．火鬚',
          avatar: null,
          ownerDisplayName: '小魚',
        },
      },
      {
        id: 'mock-member-wang',
        playerName: '老王',
        character: {
          shareId: 'chs_mock_wang',
          available: false,
          name: null,
          avatar: null,
          ownerDisplayName: null,
        },
      },
      { id: 'mock-member-pei', playerName: '佩佩', character: null },
      { id: 'mock-member-kai', playerName: '阿凱', character: null },
    ],
    remark:
      '五版模組改編長團，目標跑完三章：龍臨鎮 → 地下墓穴 → 王都政變。每場約四小時。\n' +
      'House rules：先攻並列時玩家優先；長休僅回復一半生命骰；藥水可用附贈動作喝。\n' +
      '進度備忘：佩佩的角色欠一個背景鉤子，下場開場前處理。',
    sessions: [
      { id: 'mock-log-prologue', title: '序章：龍臨鎮的求救信', date: '2026-03-07' },
      { id: 'mock-log-crypt', title: '地下墓穴的低語', date: '2026-03-21' },
      { id: 'mock-log-market', title: '白日：市集追蹤', date: '2026-04-11' },
      { id: 'mock-log-dock', title: '夜襲：碼頭倉庫', date: '2026-04-11' },
      { id: 'mock-log-crown', title: '王冠的下落', date: '2026-05-02' },
    ],
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-05-02T15:00:00.000Z',
  },
  {
    id: 'mock-oneshot-box',
    userId: MOCK_USER_ID,
    title: '短團收集箱',
    members: [
      { id: 'mock-member-mia', playerName: '米亞', character: null },
      { id: 'mock-member-dou', playerName: '豆豆', character: null },
    ],
    remark: '',
    sessions: [{ id: 'mock-log-oneshot', title: '單場：雪山驛站怪談', date: '2026-04-04' }],
    createdAt: '2026-04-04T10:00:00.000Z',
    updatedAt: '2026-04-04T16:00:00.000Z',
  },
  {
    id: 'mock-new-table',
    userId: MOCK_USER_ID,
    title: '新開的團',
    members: [],
    remark: '',
    sessions: [],
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z',
  },
]

const SEED_LOGS: DmSessionLogDTO[] = [
  {
    id: 'mock-log-prologue',
    containerId: 'mock-lost-crown',
    title: '序章：龍臨鎮的求救信',
    date: '2026-03-07',
    content:
      '眾人於龍臨鎮酒館收到鎮長的求救信，前往北郊農場調查家畜失蹤案。\n' +
      '追蹤到廢棄磨坊，擊退三隻哥布林斥候，發現牠們配戴刻有王冠紋章的臂章。',
    members: [
      {
        id: 'mock-member-aze',
        playerName: '阿哲',
        character: {
          shareId: 'chs_mock_aze',
          available: true,
          name: '凜月',
          avatar: '/dice-20.png',
          ownerDisplayName: '阿哲',
        },
      },
      {
        id: 'mock-member-fish',
        playerName: '小魚',
        character: {
          shareId: 'chs_mock_fish',
          available: true,
          name: '布蘭登．火鬚',
          avatar: null,
          ownerDisplayName: '小魚',
        },
      },
      {
        id: 'mock-member-wang',
        playerName: '老王',
        character: {
          shareId: 'chs_mock_wang',
          available: false,
          name: null,
          avatar: null,
          ownerDisplayName: null,
        },
      },
      { id: 'mock-member-pei', playerName: '佩佩', character: null },
      { id: 'mock-member-kai', playerName: '阿凱', character: null },
    ],
    moneyRewards: { pp: 0, gp: 0, sp: 0, cp: 0 },
    expRewards: 300,
    itemRewards: [
      {
        id: 'mock-reward-badge',
        item: '刻有王冠紋章的臂章 ×3',
        player: '',
        remark: '劇情物品，之後可辨識陣營',
      },
    ],
    createdAt: '2026-03-07T13:00:00.000Z',
    updatedAt: '2026-03-07T18:00:00.000Z',
  },
  {
    id: 'mock-log-crypt',
    containerId: 'mock-lost-crown',
    title: '地下墓穴的低語',
    date: '2026-03-21',
    content:
      '循臂章線索進入舊王陵地下墓穴。入口的符文陷阱差點烤焦布蘭登，靠凜月即時解除。\n' +
      '墓穴第二層遭遇骷髏衛隊與一名喚靈師，戰鬥拖了六輪，佩佩的角色一度倒地。\n' +
      '喚靈師逃走前留下一句：「王冠早已不在此處，你們來遲了兩百年。」\n' +
      '搜刮陪葬品後撤出墓穴，回鎮上長休。下場從盤問俘虜開始。',
    members: [
      {
        id: 'mock-member-aze',
        playerName: '阿哲',
        character: {
          shareId: 'chs_mock_aze',
          available: true,
          name: '凜月',
          avatar: '/dice-20.png',
          ownerDisplayName: '阿哲',
        },
      },
      {
        id: 'mock-member-fish',
        playerName: '小魚',
        character: {
          shareId: 'chs_mock_fish',
          available: true,
          name: '布蘭登．火鬚',
          avatar: null,
          ownerDisplayName: '小魚',
        },
      },
      { id: 'mock-member-pei', playerName: '佩佩', character: null },
      { id: 'mock-member-kai', playerName: '阿凱', character: null },
    ],
    moneyRewards: { pp: 0, gp: 250, sp: 30, cp: 0 },
    expRewards: 1200,
    itemRewards: [
      {
        id: 'mock-reward-sword',
        item: '+1 長劍「悼亡」',
        player: '阿哲',
        remark: '墓穴主室石棺內',
      },
      { id: 'mock-reward-scroll', item: '火球術卷軸', player: '小魚', remark: '' },
      {
        id: 'mock-reward-gems',
        item: '陪葬寶石一袋（估值 120 gp）',
        player: '',
        remark: '尚未分配',
      },
    ],
    createdAt: '2026-03-21T13:00:00.000Z',
    updatedAt: '2026-03-21T19:00:00.000Z',
  },
  {
    id: 'mock-log-market',
    containerId: 'mock-lost-crown',
    title: '白日：市集追蹤',
    date: '2026-04-11',
    content: '純跑劇情的偵查半場：白天在王都市集跟監贓物商人，確認倉庫位置與換班時間。',
    members: [
      {
        id: 'mock-member-aze',
        playerName: '阿哲',
        character: {
          shareId: 'chs_mock_aze',
          available: true,
          name: '凜月',
          avatar: '/dice-20.png',
          ownerDisplayName: '阿哲',
        },
      },
      {
        id: 'mock-member-fish',
        playerName: '小魚',
        character: {
          shareId: 'chs_mock_fish',
          available: true,
          name: '布蘭登．火鬚',
          avatar: null,
          ownerDisplayName: '小魚',
        },
      },
      { id: 'mock-member-kai', playerName: '阿凱', character: null },
    ],
    moneyRewards: { pp: 0, gp: 0, sp: 0, cp: 0 },
    expRewards: 0,
    itemRewards: [],
    createdAt: '2026-04-11T05:00:00.000Z',
    updatedAt: '2026-04-11T09:00:00.000Z',
  },
  {
    id: 'mock-log-dock',
    containerId: 'mock-lost-crown',
    title: '夜襲：碼頭倉庫',
    date: '2026-04-11',
    content:
      '同日晚場。夜襲倉庫救出被擄的鎮長之子，小茜代打老王的位置臨時加入。\n' +
      '倉庫帳本指向宮廷總管——王冠失竊案是內賊。',
    members: [
      {
        id: 'mock-member-aze',
        playerName: '阿哲',
        character: {
          shareId: 'chs_mock_aze',
          available: true,
          name: '凜月',
          avatar: '/dice-20.png',
          ownerDisplayName: '阿哲',
        },
      },
      { id: 'mock-member-pei', playerName: '佩佩', character: null },
      { id: 'mock-member-chien', playerName: '小茜（代打）', character: null },
    ],
    moneyRewards: { pp: 0, gp: 80, sp: 0, cp: 0 },
    expRewards: 450,
    itemRewards: [
      { id: 'mock-reward-ledger', item: '倉庫帳本', player: '佩佩', remark: '關鍵證物' },
    ],
    createdAt: '2026-04-11T06:00:00.000Z',
    updatedAt: '2026-04-11T13:00:00.000Z',
  },
  {
    id: 'mock-log-crown',
    containerId: 'mock-lost-crown',
    title: '王冠的下落',
    date: '2026-05-02',
    content:
      '憑帳本與臂章對質宮廷總管，揭穿其與喚靈師的交易。\n' +
      '第一章收尾：王冠被送往北境「灰塔」，第二章從雪原旅途開始。',
    members: [
      {
        id: 'mock-member-aze',
        playerName: '阿哲',
        character: {
          shareId: 'chs_mock_aze',
          available: true,
          name: '凜月',
          avatar: '/dice-20.png',
          ownerDisplayName: '阿哲',
        },
      },
      {
        id: 'mock-member-fish',
        playerName: '小魚',
        character: {
          shareId: 'chs_mock_fish',
          available: true,
          name: '布蘭登．火鬚',
          avatar: null,
          ownerDisplayName: '小魚',
        },
      },
      {
        id: 'mock-member-wang',
        playerName: '老王',
        character: {
          shareId: 'chs_mock_wang',
          available: false,
          name: null,
          avatar: null,
          ownerDisplayName: null,
        },
      },
      { id: 'mock-member-kai', playerName: '阿凱', character: null },
    ],
    moneyRewards: { pp: 1, gp: 500, sp: 0, cp: 0 },
    expRewards: 900,
    itemRewards: [
      {
        id: 'mock-reward-writ',
        item: '王室通行令',
        player: '',
        remark: '全隊共用，第二章旅途要件',
      },
    ],
    createdAt: '2026-05-02T13:00:00.000Z',
    updatedAt: '2026-05-02T15:00:00.000Z',
  },
  {
    id: 'mock-log-oneshot',
    containerId: 'mock-oneshot-box',
    title: '單場：雪山驛站怪談',
    date: '2026-04-04',
    content: '暴風雪夜的驛站密室推理單場，兇手是雪女偽裝的驛站老闆娘。全員存活，好評收場。',
    members: [
      { id: 'mock-member-mia', playerName: '米亞', character: null },
      { id: 'mock-member-dou', playerName: '豆豆', character: null },
    ],
    moneyRewards: { pp: 0, gp: 50, sp: 0, cp: 0 },
    expRewards: 600,
    itemRewards: [],
    createdAt: '2026-04-04T10:30:00.000Z',
    updatedAt: '2026-04-04T16:00:00.000Z',
  },
]

/** 回傳 seed 的深拷貝；呼叫端（store）可安全持有與改寫 */
export const buildDmSessionMockSeed = (): {
  containers: DmSessionContainerDTO[]
  logs: DmSessionLogDTO[]
} => structuredClone({ containers: SEED_CONTAINERS, logs: SEED_LOGS })
