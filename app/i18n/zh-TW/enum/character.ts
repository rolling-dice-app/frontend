import type { AlignmentKey, GenderKey, SizeKey } from '@rolling-dice-app/core'

const alignment: Readonly<Record<AlignmentKey, string>> = {
  lawfulGood: '守序善良',
  neutralGood: '中立善良',
  chaoticGood: '混亂善良',
  lawfulNeutral: '守序中立',
  trueNeutral: '絕對中立',
  chaoticNeutral: '混亂中立',
  lawfulEvil: '守序邪惡',
  neutralEvil: '中立邪惡',
  chaoticEvil: '混亂邪惡',
}

const gender: Readonly<Record<GenderKey, string>> = {
  male: '男性',
  female: '女性',
  nonBinary: '非二元',
}

const size: Readonly<Record<SizeKey, string>> = {
  tiny: '微型',
  small: '小型',
  medium: '中型',
  large: '大型',
  huge: '超大型',
  gargantuan: '巨型',
}

/** 角色設定類 enum + 基本資料欄位 / 屬性分配 / tab / 列表互動 用詞 */
export default {
  // T1 enum
  alignment,
  gender,
  size,

  // 欄位 label（與 enum map 區分；template `t('character.genderLabel')` 等）
  genderLabel: '性別',
  alignmentLabel: '陣營',

  // 角色實體 / meta
  card: '角色卡',
  info: '角色資訊',
  detail: '角色詳情',
  detailTitle: '角色卡詳情',
  empty: '尚無角色卡',
  notFound: '找不到此角色',
  loadFailed: '無法載入角色卡',
  backToList: '返回角色列表',
  saveCharacter: '儲存角色卡',

  // 基本資料欄位
  name: '姓名',
  characterName: '角色名稱',
  race: '種族',
  subrace: '亞種',
  background: '背景',
  faith: '信仰',
  age: '年齡',
  height: '身高',
  weight: '體重',
  appearance: '外貌',
  appearancePlaceholder: '簡述角色的外貌特，上限 ',
  story: '故事',
  storyPlaceholder: '角色背景故事設定，上限 ',
  storyPlaceholderUnit: '字',
  backgroundStory: '背景故事',
  // 肖像上傳
  portrait: {
    label: '角色肖像',
    selectFile: '選擇圖片',
    replace: '換圖',
    remove: '移除',
    cropTitle: '裁剪角色肖像',
    confirm: '確認',
    cancel: '取消',
    uploading: '上傳中…',
    placeholderEmpty: '尚未上傳肖像',
    fileTooLarge: '原始檔超過 5 MB，請先挑小一點的圖',
    croppedTooLarge: '裁切後圖片仍超過 1 MB，請縮小裁切範圍或換張圖',
    invalidType: '不支援的檔案格式，請選圖片',
    uploadFailed: '上傳失敗，請稍後再試',
    createdButAvatarFailed: '角色建立成功，但肖像上傳失敗，可至編輯頁重試',
  },
  language: '語言',
  tool: '工具',
  toolFull: '熟練工具',
  weaponProficiency: '武器',
  armorProficiency: '護甲',
  proficiencies: '熟練',
  abilitiesAndSaves: '屬性與豁免',
  otherAbilities: '其他屬性',
  skillProficienciesTitle: '技能熟練度',
  // aria / 卡片互動標籤（與名稱組合使用：`${t('character.viewLabel')} ${name}`）
  viewLabel: '查看角色',
  deleteLabel: '刪除角色卡',
  // 建立確認 modal
  buildConfirmTitle: '確認建立角色',
  buildConfirmWarning: '主職業與屬性建立後將無法變更，確認送出嗎？',
  buildConfirmAction: '確認新增',
  abilitiesLabel: '屬性',
  // 戰役 tab
  campaignRecord: '戰役紀錄',
  campaignCount: '筆',
  expEarnedTotal: '累計獲得經驗',
  syncMoneyAria: '將戰役獲得金錢同步到背包貨幣',
  syncMoneyToggle: '自動更新背包資產',
  emptyCampaignMessage: '尚未記錄任何戰役，按上方按鈕新增第一筆。',
  campaignField: {
    name: '名稱',
    date: '日期',
    content: '內容',
    contentPlaceholder: '記錄這場團務的事件、戰利品、重要決策…',
    moneyEarning: '獲得金錢',
    expEarning: '獲得經驗值',
  },
  // dash placeholder
  emptyDash: '—',
  emptyParenthesized: '（無）',

  // 屬性分配 panel
  abilityScores: '屬性分配',
  diceSlot: '骰值池',
  origin: '原始',
  racial: '種族加值',
  raceShort: '種族',
  bonus: '加值',
  total: '合計',
  totalValue: '總值',
  allocationMethod: '分配方式',
  default: '預設',
  custom: '自訂',
  diceRoll: '擲骰',
  unassigned: '未指派',
  outOfRange: '超出購點計算範圍',
  pointUsage: '已使用',
  pointUnit: '點',
  decreaseScore: '減少',
  increaseScore: '增加',
  decreaseBonus: '減少額外加值',
  increaseBonus: '增加額外加值',
  rerollDice: '重擲',
  resetAbilities: '重置屬性',

  // tab / section 名稱
  basicInfo: '基本資訊',
  detailedSetting: '詳細設定',
  featuresAndFeats: '專長與特性',
  combatModule: '戰鬥模組',
  combatQuickView: '戰鬥速查',
  inventoryTab: '背包',
  campaign: '戰役',

  // 列表 / 互動
  addCharacter: '新增角色卡',
  createCharacter: '建立角色卡',
  editCharacter: '編輯角色卡',
  deleteConfirm: '刪除後無法復原，確定要刪除這張角色卡嗎？',
  toggleViewMode: '切換顯示模式',
  sortBy: '排序方式',
  enterDeleteMode: '進入刪除模式',
  leaveDeleteMode: '離開刪除模式',

  // 分享頁
  share: {
    pageTitle: '角色卡分享',
    action: '分享',
    sharedBy: '分享者',
    totalLevel: '總等級',
    linkCopied: '已複製分享連結',
    copyFailed: '已開啟分享頁，連結複製失敗，請手動複製網址',
  },

  // 戰役紀錄
  emptyCampaignHint: '一場偉大的冒險，往往從踏出第一步開始',
  addCampaignRecord: '新增戰役紀錄',
  editCampaignRecord: '編輯戰役紀錄',
  campaignRecordLimitReached: '戰役紀錄數量已達上限，請先刪除舊紀錄',
}
