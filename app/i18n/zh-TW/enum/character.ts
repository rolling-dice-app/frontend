import { ALIGNMENT_NAMES, GENDER_NAMES, SIZE_NAMES } from '~/constants/dnd'

/** 角色設定類 enum + 基本資料欄位 / 屬性分配 / tab / 列表互動 用詞 */
export default {
  // T1 enum
  alignment: ALIGNMENT_NAMES,
  gender: GENDER_NAMES,
  size: SIZE_NAMES,

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
  race: '種族',
  subrace: '亞種',
  background: '背景',
  faith: '信仰',
  age: '年齡',
  height: '身高',
  weight: '體重',
  appearance: '外貌',
  story: '故事',
  language: '語言',
  tool: '熟練工具',
  weaponProficiency: '武器',
  armorProficiency: '護甲',

  // 屬性分配 panel
  abilityScores: '屬性分配',
  diceSlot: '骰值池',
  origin: '原始',
  racial: '種族加值',
  bonus: '加值',
  total: '合計',
  totalValue: '總值',
  allocationMethod: '分配方式',
  default: '預設',
  custom: '自訂',
  unassigned: '未指派',
  outOfRange: '超出購點計算範圍',

  // tab / section 名稱
  basicInfo: '基本資訊',
  detailedSetting: '詳細設定',
  featuresAndFeats: '專長與特性',
  combatModule: '戰鬥模組',
  combatQuickView: '戰鬥速查',
  inventoryTab: '背包',
  adventure: '冒險',

  // 列表 / 互動
  addCharacter: '新增角色卡',
  createCharacter: '建立角色卡',
  editCharacter: '編輯角色卡',
  deleteConfirm: '刪除後無法復原，確定要刪除這張角色卡嗎？',
  toggleViewMode: '切換顯示模式',
  sortBy: '排序方式',
  enterDeleteMode: '進入刪除模式',
  leaveDeleteMode: '離開刪除模式',

  // 冒險紀錄
  emptyAdventureHint: '一場偉大的冒險，往往從踏出第一步開始',
  addAdventureRecord: '新增冒險紀錄',
  editAdventureRecord: '編輯冒險紀錄',
}
