/** 怪物模板（m7.1）用詞：列表 / 檢視 / 編輯頁與表單欄位。enum 標籤沿用 character.* / ability.* / skill.* / combat.*。 */
export default {
  // 實體 / meta
  listTitle: '怪物模板',
  empty: '尚無怪物模板',
  emptyHint: '建立你的第一隻怪物，召喚冒險中的敵人',
  notFound: '找不到此怪物模板',
  loadFailed: '無法載入怪物模板',
  backToList: '返回怪物列表',

  // 列表 / 互動
  addMonster: '新增怪物',
  createTitle: '建立怪物模板',
  editTitle: '編輯怪物模板',
  detailTitle: '怪物模板詳情',
  namePlaceholder: '輸入怪物名稱',
  limitReached: '怪物模板數量已達方案上限',
  deleteLabel: '刪除怪物模板',
  deleteConfirm: '刪除後將永久移除（無法還原），確定要刪除以下怪物？',
  savedHint: '（示意）已儲存；串接後端後才會真正保存',

  // 表單欄位分組小標
  formGroup: {
    identity: '基本資料',
    abilitiesSaves: '屬性與豁免',
  },

  // 欄位 label
  field: {
    name: '名稱',
    size: '體型',
    alignment: '陣營',
    challengeRating: '挑戰等級',
    ac: '護甲等級',
    hp: '生命值',
    speed: '速度',
    initiative: '先攻加值',
    abilities: '屬性',
    savingThrows: '豁免',
    skills: '技能',
    damageVulnerabilities: '傷害易傷',
    damageResistances: '傷害抗性',
    damageImmunities: '傷害免疫',
    conditionImmunities: '狀態免疫',
    senses: '感官',
    languages: '語言',
    attacks: '攻擊',
    features: '特性 / 動作',
  },

  // placeholder
  placeholder: {
    challengeRating: '如 1/2、5',
    speed: '如 30 ft., fly 60 ft.',
    freeText: '自由填寫（選填）',
  },

  // 攻擊
  addAttack: '新增攻擊',
  attackName: '攻擊名稱',
  hitBonus: '命中加值',
  attackComment: '補充說明',
  attackCommentPlaceholder: '觸發條件、附加效果、備註等（選填）',
  emptyAttack: '尚未設定攻擊',
  thisAttack: '此攻擊',
  attackLimitReached: '攻擊數量已達上限',

  // 特性
  addFeature: '新增特性',
  featureName: '特性名稱',
  featureDescription: '描述',
  featureDescriptionPlaceholder: '特性效果說明（選填）',
  emptyFeature: '尚未設定特性',
  thisFeature: '此特性',
  featureLimitReached: '特性數量已達上限',

  // dash placeholder
  emptyDash: '—',
}
