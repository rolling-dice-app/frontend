import { enumLabels } from './enum'
import ui from './ui'

/**
 * 繁體中文 messages 樹根。
 *
 * `enum` 群組（ability / character / class / ...）展平到頂層；ui 維持嵌套區分
 * action / form / auth / message 子分類。
 */
export const zhTW = {
  ...enumLabels,
  ui,
}
