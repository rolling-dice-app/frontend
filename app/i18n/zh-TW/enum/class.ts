import { CLASS_LABELS } from '~/constants/dnd'
import { SUBCLASS_CONFIG } from '~/constants/subclass'

/** 職業相關 enum + 主職業 / 兼職 / 等級 / 子職業 用詞 */
export default {
  // T1 enum
  label: CLASS_LABELS,
  subclass: SUBCLASS_CONFIG,

  // T2
  className: '職業',
  primary: '主職業',
  multiclass: '兼職',
  multiclassWithIndex: '兼職 ',
  subclassLabel: '子職業',
  level: '等級',
  totalLevel: '總等級',
  levelUp: '等級 ↑',
  levelDown: '等級 ↓',
  remove: '移除此職業',
  addClass: '+ 新增職業',
  hitDie: '生命骰',
  skillProficiency: '技能熟練',
  emptyClass: '尚未設定任何職業',
}
