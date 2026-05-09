import { SPELL_SCHOOL_LABELS } from '~/constants/dnd'

/** 法術相關用詞：學派 enum + 環位 / metadata / flag / panel / 互動 / filter */
export default {
  /** T1：學派 enum key → 中文 label */
  school: SPELL_SCHOOL_LABELS,

  // 環位 / 級別（拼接用，例：`${level} ${t('spell.level')}` → "1 環"）
  level: '環',
  cantrip: '戲法',
  slot: '環位',
  pactSlot: '契術環位',
  general: '一般',

  // metadata field labels（法術屬性顯示）
  attribute: {
    school: '學派',
    castingTime: '施法時間',
    range: '距離',
    components: '成分',
    duration: '持續時間',
    description: '描述',
    materials: '材料',
  },

  // flag / state
  ritual: '儀式',
  concentration: '專注',
  prepared: '已準備',
  favorite: '常用',
  learned: '已知',

  // section / panel 名稱
  book: '法術書',
  table: '法術表',
  slots: '法術位',
  castingAbility: '施法主屬性',
  learnedSection: '已知法術',
  favoriteSection: '常用法術',
  database: '法術資料庫',
  castingModule: '施法模組',
  slotConfig: '環位設定',
  multicasterHint: '兼職施法者可選多項',
  loadingMessage: '法術資料載入中…',
  loadFailed: '法術資料載入失敗',
  emptyLearned: '尚未掌握任何法術',
  emptyFavorite: '尚未標記常用法術',
  emptyFavoriteHint: '尚未標記常用法術，於左側已知法術點',
  emptyFavoriteHintSuffix: '即可加入',
  missingHint: '資料庫中找不到下列法術',
  itemCount: '個',
  totalPrefix: '共',
  consumed: '耗材',
  pact: '契術',

  // 互動
  favoriteAction: '標記為常用',
  unfavoriteAction: '取消常用',
  learn: '掌握',
  prepare: '準備',
  searchPlaceholder: '搜尋法術名稱',
  filterLevel: '環數',
  filterSchool: '學派',
  filterClass: '職業',
  filterSource: '資源',
  filterClear: '清除篩選',
  emptyFiltered: '沒有符合條件的法術',

  // filter
  filterRitual: '只顯示儀式法術',
  filterConcentration: '只顯示需要專注的法術',

  // misc
  custom: '自定義',
  notSet: '尚未設定',
  castingBonus: '施法調整值',
  proficient: '熟練',
  noPrimaryAbilitySelected: '尚未選擇施法主屬性',
}
