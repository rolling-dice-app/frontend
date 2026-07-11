/**
 * 團務紀錄（m7.2）用詞：nav segment 名在 dm.nav.campaignRecord。
 * 使用者面向稱謂：container 稱「劇本」、其下的 session log 稱「團務」；程式識別字仍照 core 契約。
 */
export default {
  // 劇本（container） 實體 / meta
  listTitle: '團務紀錄',
  empty: '尚無劇本',
  emptyHint: '建立劇本，記錄每一場團務',
  detailTitle: '劇本詳情',
  notFound: '找不到此劇本',
  loadFailed: '無法載入團務紀錄',
  backToList: '返回劇本列表',

  // 劇本 列表 / 互動
  addContainer: '新增劇本',
  createTitle: '建立劇本',
  renameTitle: '編輯劇本名稱',
  limitReached: '劇本數量已達方案上限',
  deleteLabel: '刪除劇本',
  deleteConfirm: '刪除後將一併移除旗下所有團務紀錄（無法還原），確定要刪除以下劇本？',
  savedHint: '已儲存',

  // 劇本 detail 欄位
  container: {
    field: {
      title: '劇本名稱',
      members: '常駐成員',
      remark: '備註',
    },
    membersEmpty: '尚未加入成員',
    remarkEmpty: '尚未填寫備註',
    remarkPlaceholder: '劇本概要、house rules、進度備忘等（選填）',
    editTitle: '編輯劇本名稱',
    editMembers: '編輯常駐成員',
    editRemark: '編輯備註',
    titlePlaceholder: '劇本名稱或團名',
  },

  // 成員編輯
  member: {
    playerName: '玩家名稱',
    characterLink: '角色卡連結',
    linkAction: '連結',
    unlinkAction: '解除連結',
    add: '新增成員',
    limitReached: '成員數量已達上限',
    unavailable: '角色已失效',
    invalidLink: '無法辨識的分享連結',
    duplicate: '此角色卡已在名單中',
    resolveFailed: '找不到對應的角色卡',
    linkPlaceholder: '貼上角色卡分享連結',
    unlinked: '未連結角色卡',
  },

  // 時間軸
  timeline: {
    title: '團務時間軸',
    sessionSeq: '第 {n} 場',
    empty: '這個劇本還沒有團務',
    emptyHint: '新增第一場團務，開始這段冒險',
  },

  // 團務（session log）
  log: {
    createTitle: '新增團務',
    editTitle: '編輯團務',
    detailTitle: '團務詳情',
    notFound: '找不到此團務',
    backToContainer: '返回劇本',
    addLog: '新增團務',
    limitReached: '團務數量已達方案上限',
    deleteLabel: '刪除團務',
    deleteConfirm: '刪除後將永久移除（無法還原），確定要刪除以下團務？',
    noContent: '無內文',
    noAttendance: '未記錄出席名單',

    formGroup: {
      basic: '基本資料',
      content: '內文',
      attendance: '出席名單',
      rewards: '本場獎勵',
    },

    field: {
      title: '標題',
      date: '團務日期',
      content: '筆記內文',
      exp: '經驗值',
      money: '金錢',
      itemRewards: '物品獎勵',
      item: '物品',
      player: '受領玩家',
      remark: '備註',
    },

    contentPlaceholder: '本場劇情、戰鬥、伏筆備忘等（選填）',

    attendance: {
      adhocLabel: '臨時出席',
      adhocAdd: '加入',
      limitReached: '出席人數已達上限',
      rosterEmptyHint: '此劇本尚未建立常駐名單，可直接新增臨時出席',
      remove: '移除出席',
    },

    rewards: {
      empty: '本場未發放獎勵',
      addRow: '新增一列',
      thisReward: '此獎勵',
      limitReached: '物品獎勵數量已達上限',
    },
  },
}
