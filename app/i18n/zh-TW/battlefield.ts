import type { BattlefieldFaction, BattlefieldUnitKind } from '~/types/business/battlefield'

const faction: Readonly<Record<BattlefieldFaction, string>> = {
  player: '友軍',
  enemy: '敵人',
  neutral: '中立',
}

const kind: Readonly<Record<BattlefieldUnitKind, string>> = {
  character: '出席角色',
  monster: '怪物',
  adhoc: '其他單位',
}

/** 即時戰場（m7.3）：入口頁、三欄工作區、增援 drawer、結束戰鬥彈窗 */
export default {
  faction,
  kind,

  // 入口（團務選擇）
  listTitle: '即時戰場',
  listHint: '選擇一場團務，建立或進入戰場工作區',
  loadFailed: '戰場資料載入失敗',
  empty: '尚無團務',
  emptyHint: '先到團務紀錄建立劇本與團務，再回來開戰場',
  memberCount: '{count} 位成員',
  enterBattlefield: '進入戰場',
  createBattlefield: '建立戰場',
  hasBattlefield: '戰場進行中',

  // 工作區頂部
  battleMeta: '第 {seq} 場戰鬥',
  roundMeta: 'Round {round}',
  battleEndedMeta: '已結束',
  reinforce: '增援／建立',
  endBattle: '結束本次戰鬥',
  startNextBattle: '開始第 {seq} 場戰鬥',
  deleteBattlefield: '刪除戰場',
  endedBannerTitle: '第 {seq} 場戰鬥已結束。',
  endedBannerBody:
    '先攻與回合已重設、敵方單位已退出戰鬥（左欄可再參戰）；保留項目依結束彈窗的勾選。',

  // 左欄（戰場單位）
  rosterTitle: '戰場單位',
  groupCharacters: '出席角色',
  groupTemplates: '怪物模板',
  groupOthers: '其他單位',
  groupEmpty: '（皆已參戰）',
  join: '參戰',
  joinTemplateTitle: '建立實例並直接參戰',
  removeUnit: '移除',
  statAcHp: 'AC {ac}・HP {hp}',
  statHpAc: 'HP {current}/{max}・AC {ac}',
  statMember: 'AC {ac}・HP {hp}・速 {speed} 呎・先攻 {bonus}',
  statTemplate: 'AC {ac}・HP {hp}・速 {speed} 呎・先攻 {bonus}',
  conditionCount: '{count} 狀態',

  // 中欄（參戰列表＋回合工具列）
  combatTitle: '參戰（{count}）',
  combatEmpty: '從左欄「參戰」加入單位開始戰鬥',
  battleSeqChip: '第 {seq} 場',
  prevTurn: '上一位',
  nextTurn: '下一位',
  rollAllEnemies: '敵人重骰先攻',
  sortByInitiative: '依先攻排序',
  sortByInitiativeTitle: '依先攻值重新排序',
  resetBattle: '重置戰場',
  resetBattleTitle: '清空全員先攻與行動者、回合回到 1（單位與 HP 不動）',
  moveUp: '上移',
  moveDown: '下移',
  dragHandleTitle: '拖曳調整順序',
  selectUnitAria: '選取 {name}',
  initiativeAria: '{name} 先攻值',
  initiativeEditTitle: '直接手改先攻',
  downMark: 'HP 0',

  // 右欄（單位操作面板）
  detailTitle: '單位操作面板',
  detailEmpty: '選取中欄任一單位',
  nameAria: '顯示名稱（可改）',
  nameEditTitle: '點擊改名',
  activeChip: '行動中',
  setActive: '設為行動者',
  leaveCombat: '退出戰鬥',
  factionAria: '陣營',
  hpCurrent: '當前 HP',
  hpTemp: '臨時 HP',
  hpMax: '最大 HP',
  acLabel: 'AC',
  speedLabel: '速度',
  speedFeetSuffix: '（呎）',
  initiativeLabel: '先攻',
  damageAria: '對 {name} 造成傷害',
  damageTitle: '造成傷害（臨時 HP 先扣）',
  healAria: '治療 {name}',
  healTitle: '治療',
  amountAria: '{name} 傷害或治療量',
  rollInitiativeTitle: '擲先攻 1d20 {bonus}',
  rollInitiativeAria: '擲先攻',
  conditionsEmpty: '沒有狀態',
  conditionSelectAria: '選擇狀態',
  conditionNotePlaceholder: '備註（選填）',
  applyCondition: '套用',
  removeConditionAria: '移除狀態 {name}',

  // 增援 drawer
  setupTitle: '增援／建立單位',
  importMember: '帶入並參戰（滿 HP）',
  alreadyJoined: '已參戰',
  alreadyImported: '已帶入',
  memberRole: '出席成員',
  memberUnavailable: '快照失敗 — 角色已停止分享或已刪除',
  removeMember: '移除成員',
  relinkMember: '重新連結',
  notWiredYet: '此操作需串接後端後提供。',
  adhocName: '名稱',
  adhocMaxHp: '最大 HP',
  adhocAc: 'AC',
  adhocSpeed: '速度',
  adhocInitBonus: '先攻加值',
  createUnit: '建立單位',
  createAndJoin: '直接參戰',
  benchTitle: '未參戰單位（{count}）',

  // 結束戰鬥彈窗
  endBattleTitle: '結束第 {seq} 場戰鬥',
  endBattleBody:
    '將重設：全員先攻、當前行動者、回合數；敵方單位退出戰鬥（實例與 HP 保留，可再度參戰）。玩家與中立單位留在戰場。',
  keepCurrentHp: '保留當前 HP（取消＝回復滿血）',
  keepTempHp: '保留臨時 HP（取消＝清空）',
  keepConditions: '保留狀態（取消＝全部移除）',
  keepAdjustments: '保留其他調整值（取消＝重置 AC／最大 HP）',

  // 刪除戰場彈窗
  deleteTitle: '刪除戰場（＝團務結束）',
  deleteBody: '戰場屬暫態資料：刪除即結束，無結算步驟、無法復原。玩家角色卡與怪物模板不受影響。',

  // toasts
  toastJoined: '{name} 已參戰。',
  toastCreated: '已建立 {name}。',
  toastRemoved: '已移除 {name}。',
  toastDown: '{name} 倒下（HP 0）。',
  toastRoundStart: 'Round {round} 開始。',
  toastInitiativeRolled: '{name} 先攻 {total}（1d20 = {roll}，加值 {bonus}）。',
  toastEnemiesRolled: '已為 {count} 個敵方單位擲先攻。',
  toastNoEnemies: '目前沒有在場敵人。',
  toastSorted: '已依先攻值重新排序。',
  toastBattleReset: '戰場已重置。',
  toastBattleEnded: '第 {seq} 場戰鬥結束。',
  toastBattleStarted: '第 {seq} 場戰鬥開始 — 請擲先攻。',
  toastDeleted: '戰場已刪除。',
}
