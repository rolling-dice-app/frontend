import type { SkillKey } from '@rolling-dice-app/core'

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

export default labels
