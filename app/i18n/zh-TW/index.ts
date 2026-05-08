import { enumLabels } from './enum'
import { errorMessages } from './error'
import ui from './ui'

/**
 * 繁體中文 messages 樹根。
 *
 * `enum` 群組（ability / character / class / ...）展平到頂層；error / ui
 * 維持嵌套（error 預留 ApiErrorCode 等多 union；ui 區分 action / form / auth / message 子分類）。
 */
export const zhTW = {
  ...enumLabels,
  error: errorMessages,
  ui,
}
