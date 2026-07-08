import type { MonsterAttackEntry, MonsterFeature, MonsterTemplateDTO } from '@rolling-dice-app/core'

/**
 * 怪物模板的 UI view-model / form state。
 * 契約型別（MonsterTemplateDTO 等）來自 `@rolling-dice-app/core`，此處僅保留 UI-only 衍生型別。
 */

/** 攻擊草稿（尚未具備 id 的條目，用於新增 / 編輯 modal） */
export type MonsterAttackDraft = Omit<MonsterAttackEntry, 'id'>

/** 特性草稿（尚未具備 id 的條目） */
export type MonsterFeatureDraft = Omit<MonsterFeature, 'id'>

/** 表單用 view；由 monsterTemplateToView 自 DTO 導出，不含伺服端欄位（userId / 時間戳） */
export type MonsterTemplateView = Omit<MonsterTemplateDTO, 'userId' | 'createdAt' | 'updatedAt'>

/**
 * 編輯怪物模板的 form state；欄位等同 view 的可改欄位（含 id 以利對應）。
 * submit 時由 buildMonsterTemplateUpdatePatch 對 store 快取的原始 DTO diff 出 PATCH body。
 */
export type MonsterTemplateFormState = MonsterTemplateView
