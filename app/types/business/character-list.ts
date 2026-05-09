import type { CharacterSummary } from '@rolling-dice-app/core'

/**
 * 角色列表 view model：以 CharacterSummary 為基礎，
 * 為列表元件補上額外展示欄位（race 暫由前端補 null，待 backend summary 擴充後對齊）。
 */
export type CharacterListItem = CharacterSummary & {
  race: string | null
}
