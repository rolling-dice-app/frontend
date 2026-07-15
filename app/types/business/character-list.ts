import type { CharacterSummaryDTO } from '@rolling-dice-app/core'

/** 角色列表 view model（直接沿用 backend summary 形狀）；level 於 store ingestion 由 classes 前端重算 */
export type CharacterListItem = CharacterSummaryDTO
