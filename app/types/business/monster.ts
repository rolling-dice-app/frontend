import type { MonsterAttackEntry, MonsterFeature, MonsterTemplateDTO } from '@rolling-dice-app/core'

/**
 * 怪物模板的 UI view-model / form state（m7.1 UI 階段）。
 * 契約型別（MonsterTemplateDTO 等）來自 `@rolling-dice-app/core`，此處僅保留 UI-only 衍生型別。
 */

/** 攻擊草稿（尚未具備 id 的條目，用於新增 / 編輯 modal） */
export type MonsterAttackDraft = Omit<MonsterAttackEntry, 'id'>

/** 特性草稿（尚未具備 id 的條目） */
export type MonsterFeatureDraft = Omit<MonsterFeature, 'id'>

/** 完整怪物模板 view；mock 階段不含伺服端欄位（userId / 時間戳） */
export type MonsterTemplateView = Omit<MonsterTemplateDTO, 'userId' | 'createdAt' | 'updatedAt'>

/**
 * 編輯怪物模板的 form state。本階段欄位等同 view 的可改欄位（含 id 以利對應）；
 * 串接階段 submit 時改 diff 對到 PATCH body。
 */
export type MonsterTemplateFormState = MonsterTemplateView
