import type { ProficiencyLevel, SkillKey } from '@rolling-dice-app/core'

const labels: Readonly<Record<SkillKey, string>> = {
  // 力量
  athletics: '運動',
  // 敏捷
  acrobatics: '特技',
  sleightOfHand: '巧手',
  stealth: '隱匿',
  // 智力
  arcana: '奧秘',
  history: '歷史',
  investigation: '調查',
  nature: '自然',
  religion: '宗教',
  // 感知
  animalHandling: '馴獸',
  insight: '洞察',
  medicine: '醫藥',
  perception: '察覺',
  survival: '求生',
  // 魅力
  deception: '欺瞞',
  intimidation: '威嚇',
  performance: '表演',
  persuasion: '說服',
}

const proficiency: Readonly<Record<ProficiencyLevel, string>> = {
  none: '無',
  proficient: '熟練',
  expertise: '專精',
}

export default {
  // 具名子物件，避免技能 label 與 proficiency 等同層 key 混雜（查詢：t(`skill.label.${key}`)）
  label: labels,
  proficiency,
}
