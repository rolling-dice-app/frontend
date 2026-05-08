import { enumLabels } from './enum'
import { errorMessages } from './error'

/**
 * 繁體中文 messages 樹根。
 *
 * `enum` 群組（ability / character / class / ...）展平到頂層；error 維持
 * 嵌套以便未來擴充其他 error union（如 ApiErrorCode）。
 */
export const zhTW = {
  ...enumLabels,
  error: errorMessages,
}
