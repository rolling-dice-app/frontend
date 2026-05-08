import { computed, ref } from 'vue'
import { zhTW } from './zh-TW'

const LOCALES = { 'zh-TW': zhTW } as const

const logger = createLogger('[i18n]')

export type Locale = keyof typeof LOCALES
export type Messages = (typeof LOCALES)[Locale]

/**
 * 遞迴展開 messages 樹的所有 leaf path（leaf = string value）。
 * 用 NonNullable 包住 T[K] 以支援 Partial<Record<...>> 等可能為 undefined 的 shape（如 SUBCLASS_CONFIG）。
 */
type LeafPath<T> = T extends string
  ? never
  : {
      [K in keyof T]: K extends string
        ? NonNullable<T[K]> extends string
          ? K
          : NonNullable<T[K]> extends object
            ? `${K}.${LeafPath<NonNullable<T[K]>>}`
            : never
        : never
    }[keyof T]

export type MessagePath = LeafPath<Messages>

const locale = ref<Locale>('zh-TW')

const resolve = (path: string): string => {
  const parts = path.split('.')
  let value: unknown = LOCALES[locale.value]
  for (const part of parts) {
    if (value && typeof value === 'object' && part in (value as object)) {
      value = (value as Record<string, unknown>)[part]
    } else {
      logger.warn(`missing leaf at path "${path}" (locale: ${locale.value})`)
      return path
    }
  }
  if (typeof value !== 'string') {
    logger.warn(`path "${path}" resolved to non-string value (locale: ${locale.value})`)
    return path
  }
  return value
}

/**
 * 取對應 locale 的字串。path 是 messages tree 的 dot-path，TS 會檢查是否為合法 leaf。動態值可用 template literal：
 *
 *   t('ability.strength')
 *   t(`error.oauth.${code}`)         // code: OAuthErrorCode
 *   t(`character.alignment.${align}`) // align: AlignmentKey
 *
 * 找不到 leaf 時 fallback 為 path 字串本身（dev 時容易看出哪裡寫錯）。
 */
export const t = (path: MessagePath): string => resolve(path)

/**
 * 完整 i18n API：t / messages（樹根 access）/ locale / setLocale。
 * 多數 caller 只需 `t()`，需要走原生樹結構（如動態 key 列舉）才用 messages。
 */
export const useI18n = () => {
  const messages = computed(() => LOCALES[locale.value])
  const setLocale = (next: Locale) => {
    locale.value = next
  }
  return { locale, messages, setLocale, t }
}
