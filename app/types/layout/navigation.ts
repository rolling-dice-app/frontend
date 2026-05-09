import type { IconName } from '@ui'
import type { MessagePath } from '~/i18n'

export interface NavItem {
  /** i18n message path；template 內以 t(labelKey) 顯示 */
  labelKey: MessagePath
  to: string
  icon?: IconName
  disabled?: boolean
}
