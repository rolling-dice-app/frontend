import ability from './ability'
import battlefield from './battlefield'
import character from './character'
import classLabels from './class'
import combat from './combat'
import dm from './dm'
import dmSession from './dm-session'
import inventory from './inventory'
import monster from './monster'
import settings from './settings'
import skill from './skill'
import spell from './spell'
import ui from './ui'

/**
 * 繁體中文 messages 樹根。
 *
 * 結構（規則：i18n-conventions skill）：
 *   - `ui.*`            跨域 UI：action / form / aria / error / message / state / nav / ...
 *   - `<domain>.*`      領域內容（enum + 該領域 UI 共存於單檔）
 *   - `settings.*`      page-specific UI（無 enum）
 *
 * Path 範例：
 *   t('ability.strength')           → '力量'
 *   t('character.alignment.lawfulGood')  → '守序善良'
 *   t('character.detailTitle')      → '角色卡詳情'
 *   t('ui.action.save')             → '儲存'
 */
export const zhTW = {
  ability,
  battlefield,
  character,
  class: classLabels,
  combat,
  dm,
  dmSession,
  inventory,
  monster,
  settings,
  skill,
  spell,
  ui,
}
