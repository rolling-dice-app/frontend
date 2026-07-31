import type { BattlefieldFaction, BattlefieldUnitKind } from '@rolling-dice-app/core'

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
  createDisabledHint: '同劇本已有戰場',

  // 工作區頂部
  battleMeta: '第 {seq} 場戰鬥',
  roundMeta: 'Round {round}',
  reinforce: '增援／建立',
  endBattle: '結束本次戰鬥',
  deleteBattlefield: '刪除戰場',

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
  statTemplate: 'AC {ac}・HP {hp}',
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
  resetBattle: '重置戰鬥',
  resetBattleTitle:
    '把本場拉回開打前：第 2 場以後還原成上一場結束時的狀態，第 1 場則全員回到加入時的樣子（單位不會被移除）',
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
  conditionCapReached: '單一單位狀態已達上限',
  removeConditionAria: '移除狀態 {name}',
  attacksTitle: '攻擊',
  skillsTitle: '技能',

  // 戰鬥紀錄（中欄固定高度 log）；死亡豁免 label 重用 combat.deathSave
  battleLogTitle: '戰鬥紀錄',
  logInitiative: '先攻',
  logHit: '{name}命中',
  logDamage: '{name}傷害',

  // 增援 drawer
  setupTitle: '增援／建立單位',
  importMember: '帶入並參戰（滿 HP）',
  alreadyJoined: '已參戰',
  alreadyImported: '已帶入',
  memberRole: '出席成員',
  memberUnavailable: '快照失敗 — 角色已停止分享或已刪除',
  removeMember: '移除成員',
  relinkMember: '重新連結',
  relinkPlaceholder: '貼上新的角色分享連結',
  relinkConfirm: '連結',
  relinkInvalidLink: '無法從連結解析角色分享 ID，請確認貼的是角色分享連結。',
  relinkDuplicate: '此角色卡已由名單中其他成員連結。',
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
    '結束後直接進入下一場：場次 +1、回合回到 1、全員先攻清空。角色留在戰場並保留 HP、狀態與調整值；怪物與臨時單位退回左欄，狀態全部歸零。',

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
  persistRetry: '重試儲存',
  toastBattleReset: '本場戰鬥已重置 — 請擲先攻。',
  toastBattleEnded: '第 {ended} 場戰鬥結束，進入第 {next} 場 — 請擲先攻。',
  toastDeleted: '戰場已刪除。',
  toastMemberRemoved: '已自團務出席名單移除成員。',
  toastMemberRelinked: '已重新連結成員角色卡。',
  unitCapReached: '戰場單位數已達上限，請先移除部分單位。',
  memberImportUnavailable: '此成員的角色卡連結已失效，無法帶入戰場。',
}
