import type { FeatureSource, FeatureUsageRecovery } from '@rolling-dice-app/core'
import { DAMAGE_TYPE_LABELS } from '~/constants/dnd'

const featureSource: Readonly<Record<FeatureSource, string>> = {
  feat: '專長',
  class: '職業',
  race: '種族',
  background: '背景',
  other: '其他',
}

const featureRecovery: Readonly<Record<FeatureUsageRecovery, string>> = {
  shortRest: '短休',
  longRest: '長休',
  manual: '手動',
}

/** 戰鬥相關 enum + 規則 / 衍生值 / AC / 攻擊 / 特性 / 擲骰 用詞 */
export default {
  // T1 enum
  damageType: DAMAGE_TYPE_LABELS,
  featureRecovery,
  featureSource,

  // HP
  hp: '生命值',
  hpCurrent: '當前生命',
  hpMax: '最大生命',
  hpTemp: '臨時生命',
  hurt: '受傷',
  heal: '治療',
  adjust: '調整數值',
  basicStats: '基礎數據',
  none: '無',
  toughToggleAria: '是否持有健壯專長',

  // 衍生加值 / 規則計算
  proficiencyBonus: '熟練加值',
  initiative: '先攻',
  passivePerception: '被動察覺',
  passiveInsight: '被動洞察',
  speed: '移動速度',
  jackOfAllTrades: '全能高手',
  tough: '健壯',
  toughFeat: '健壯專長',
  spellSaveDc: '法術豁免 DC',

  // 豁免 / 死亡豁免
  savingThrow: '豁免',
  savingThrowSection: '屬性 / 豁免',
  savingThrowProficiency: '豁免熟練',
  proficient: '熟練',
  currentAdjustment: '目前調整',
  primaryClassLockedHint: '（主職業，不可變更）',
  deathSave: '死亡豁免',
  deathSaveRoll: '擲死亡豁免',
  deathSaveSuccess: '成功',
  deathSaveFailure: '失敗',
  deathStatusInactive: '未生效',
  deathStatusInProgress: '進行中',
  deathStatusStable: '已穩定',
  deathStatusDead: '已死亡',

  // AC
  ac: '護甲等級',
  acValue: '護甲值',
  acTotal: 'AC 總計',
  armor: '著甲類型',
  armorBase: '基礎值',
  shield: '盾牌',
  abilityBonus: '屬性加值',
  abilityAdjustment: '調整值',
  unarmored: '無甲防禦',
  selectArmor: '選擇護甲',

  // 攻擊
  attack: '攻擊',
  attackModule: '攻擊模組',
  addAttack: '新增攻擊',
  emptyAttack: '尚未設定任何攻擊',
  unnamed: '（未命名）',
  hitBonus: '命中',
  extraBonus: '額外加值',
  extraHit: '額外命中',
  damage: '傷害',
  damageRoll: '傷害骰',
  addDamageRow: '新增傷害骰',
  applyAbilityToDamage: '套用屬性調整到傷害',
  applyAbility: '套用屬性調整',
  attackCommentPlaceholder: '觸發條件、附加效果、備註等（選填）',
  attackComment: '補充說明',
  thisAttack: '此攻擊',
  rowDieCount: '行骰數',
  rowDieType: '行骰面',
  rowBonus: '行加值',
  rowDamageType: '行傷害類型',
  removeRow: '移除',
  attribute: '屬性',
  selectAttribute: '選擇屬性',
  rowOrdinal: '第',
  // 攻擊擲骰行為
  hitNormal: '一般命中',
  hitAdvantage: '優勢命中',
  hitDisadvantage: '劣勢命中',
  damageNormal: '一般傷害',
  damageCritical: '重擊傷害',
  rollHit: '命中擲骰',
  rollDamage: '傷害擲骰',

  // 特性 / Feature
  feature: '特性',
  addFeature: '新增特性',
  emptyFeature: '尚未設定任何特性',
  emptyFeatureDescription: '（無說明）',
  hasUses: '具有使用次數',
  hasUsesAria: '此特性具有使用次數',
  featureDescription: '特性效果說明',
  featureDescriptionPlaceholder: '特性效果說明（選填）',
  featureSourceLabel: '來源',
  featureMaxUses: '最大次數',
  featureRecoveryLabel: '恢復時機',
  thisFeature: '此特性',
  uses: '次',
  description: '描述',

  // 擲骰 / 休息
  roll: '擲骰',
  openRollPanel: '開啟擲骰面板',
  rollResults: '擲骰結果',
  rollEmpty: '無擲骰紀錄',
  rollClear: '清空',
  rollClearAria: '清空擲骰歷史',
  rollNormal: '一般擲骰',
  rollAdvantage: '優勢擲骰',
  rollDisadvantage: '劣勢擲骰',
  modeAdvantage: '優勢',
  modeDisadvantage: '劣勢',
  critical: '重擊',
  natural20: '大成功',
  natural1: '大失敗',
  abilityCheck: '屬性檢定',
  savingThrowCheck: '豁免檢定',
  skillCheck: '技能',
  battleSection: '戰鬥相關',
  shortRest: '短休',
  longRest: '長休',
  shortRestDone: '短休完成',
  longRestDone: '長休完成',

  // 單位 / 距離
  unitFeet: '呎',
}
