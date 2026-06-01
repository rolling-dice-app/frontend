import { reactive, readonly } from 'vue'
import type { DeepReadonly } from 'vue'
import type { IconName, ToastX, ToastY } from '@ui'

export type ToastVariant = 'success' | 'error' | 'info'
export type ToastKind = 'system' | 'hint'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  kind: ToastKind
  icon: IconName | null
  duration: number
  x: ToastX
  y: ToastY
}

export interface ToastOptions {
  /** 自動關閉時間（毫秒）。預設 info/success 3000，error 5000。傳 0 表示不自動關閉。 */
  duration?: number
  /** 通知類型。system（預設）= 系統反饋（top-center + icon）；hint = 功能 UI 提示（top-right）。 */
  kind?: ToastKind
  x?: ToastX
  y?: ToastY
}

export interface UseToastReturn {
  items: DeepReadonly<ToastItem[]>
  error: (message: string, options?: ToastOptions) => string
  success: (message: string, options?: ToastOptions) => string
  info: (message: string, options?: ToastOptions) => string
  remove: (id: string) => void
  clear: () => void
}

const DEFAULT_DURATION = 3000
const ERROR_DURATION = 5000

const HINT_X: ToastX = 'right'
const HINT_Y: ToastY = 'top'
const SYSTEM_X: ToastX = 'center'
const SYSTEM_Y: ToastY = 'top'

const SYSTEM_ICON: Record<ToastVariant, IconName> = {
  error: 'alert-circle',
  success: 'check-circle',
  info: 'info',
}

// 模組層級 singleton：跨 component 呼叫 useToast() 時共享同一份佇列。
// client-only 契約：此 singleton 與 push() 內的 crypto.randomUUID 僅供瀏覽器端互動觸發；
// 勿在 SSR 期間呼叫，否則 module-scoped 狀態會跨請求共享。
const items = reactive<ToastItem[]>([])

const push = (variant: ToastVariant, message: string, options?: ToastOptions): string => {
  const id = crypto.randomUUID()
  const kind = options?.kind ?? 'system'
  items.push({
    id,
    message,
    variant,
    kind,
    icon: kind === 'system' ? SYSTEM_ICON[variant] : null,
    duration: options?.duration ?? (variant === 'error' ? ERROR_DURATION : DEFAULT_DURATION),
    x: options?.x ?? (kind === 'system' ? SYSTEM_X : HINT_X),
    y: options?.y ?? (kind === 'system' ? SYSTEM_Y : HINT_Y),
  })
  return id
}

const remove = (id: string): void => {
  const index = items.findIndex((it) => it.id === id)
  if (index !== -1) items.splice(index, 1)
}

const clear = (): void => {
  items.splice(0, items.length)
}

/**
 * 全域通知佇列。預設 kind='system'（top-center + icon + 系統色），UI 功能提示傳 { kind: 'hint' } 走 top-right。
 */
export const useToast = (): UseToastReturn => {
  return {
    items: readonly(items) as DeepReadonly<ToastItem[]>,
    error: (message, options) => push('error', message, options),
    success: (message, options) => push('success', message, options),
    info: (message, options) => push('info', message, options),
    remove,
    clear,
  }
}
