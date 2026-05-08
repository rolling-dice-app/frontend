import { DAMAGE_TYPE_LABELS } from '~/constants/dnd'
import { FEATURE_RECOVERY_LABELS, FEATURE_SOURCE_LABELS } from '~/constants/features'

/** 戰鬥相關 enum + 規則 / 衍生值 / AC / 攻擊 / 特性 / 擲骰 用詞 */
export default {
  // T1 enum
  damageType: DAMAGE_TYPE_LABELS,
  featureRecovery: FEATURE_RECOVERY_LABELS,
  featureSource: FEATURE_SOURCE_LABELS,

  // HP
  hp: '生命值',
  hpCurrent: '當前生命',
  hpMax: '最大生命',
  hpTemp: '臨時生命',
  damage: '受傷',
  heal: '治療',
  adjust: '調整數值',

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
  savingThrowProficiency: '豁免熟練',
  deathSave: '死亡豁免',
  deathSaveRoll: '擲死亡豁免',

  // AC
  ac: '護甲等級',
  acTotal: 'AC 總計',
  armor: '著甲類型',
  armorBase: '基礎值',
  shield: '盾牌',
  abilityBonus: '屬性加值',
  unarmored: '無甲防禦',

  // 攻擊
  attack: '攻擊',
  attackModule: '攻擊模組',
  addAttack: '新增攻擊',
  hitBonus: '命中',
  extraBonus: '額外加值',
  damageRoll: '傷害骰',
  addDamageRow: '新增傷害骰',
  applyAbilityToDamage: '套用屬性調整到傷害',
  attackCommentPlaceholder: '觸發條件、附加效果、備註等（選填）',

  // 特性 / Feature
  feature: '特性',
  addFeature: '新增特性',
  hasUses: '具有使用次數',
  featureDescription: '特性效果說明',

  // 擲骰 / 休息
  roll: '擲骰',
  openRollPanel: '開啟擲骰面板',
  shortRest: '短休',
  longRest: '長休',
}
