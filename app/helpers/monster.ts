import {
  buildMonsterTemplateCreateDefaults,
  type DamageDieEntry,
  type MonsterTemplateCreateBody,
  type MonsterTemplateDTO,
  type MonsterTemplateSummaryDTO,
  type MonsterTemplateUpdateBody,
} from '@rolling-dice-app/core'
import type { MonsterTemplateFormState, MonsterTemplateView } from '~/types/business/monster'
import { cleanText, cleanTextOrNull } from '~/utils/text'
import { deepEqual } from '~/utils/deep-equal'

/**
 * 把單一傷害條目格式化為骰式字串（不含傷害類型 label，類型由呼叫端以 i18n 補）。
 * 例：`2d6+3` / `1d8` / `+3` / `0`。
 */
export function formatDamageDice(entry: DamageDieEntry): string {
  const dice = entry.count > 0 && entry.dieType ? `${entry.count}d${entry.dieType}` : ''
  const bonus =
    entry.bonus != null && entry.bonus !== 0
      ? entry.bonus > 0
        ? `+${entry.bonus}`
        : `${entry.bonus}`
      : ''
  return dice + bonus || '0'
}

/**
 * 建立頁用的空白草稿（保守預設）；`id` 留空避免 SSR/CSR 產生不同 UUID，
 * 真正 id 由 backend 於建立時配發。
 */
export function buildDefaultMonsterView(): MonsterTemplateView {
  const {
    damageVulnerabilities: _dv,
    damageResistances: _dr,
    damageImmunities: _di,
    conditionImmunities: _ci,
    ...defaults
  } = buildMonsterTemplateCreateDefaults()
  return { id: '', name: '', ...defaults }
}

/** DTO → 表單 view：剝除 server-owned 欄位（userId / 時間戳）與 deprecated free-text 抗性欄位。 */
export function monsterTemplateToView(dto: MonsterTemplateDTO): MonsterTemplateView {
  const {
    userId: _userId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    damageVulnerabilities: _dv,
    damageResistances: _dr,
    damageImmunities: _di,
    conditionImmunities: _ci,
    ...view
  } = dto
  return view
}

/** DTO → 列表 summary：create / update 後本地同步列表用，欄位對齊 GET /monster-templates。 */
export function monsterTemplateToSummary({
  id,
  name,
  size,
  challengeRating,
  ac,
  hp,
}: MonsterTemplateDTO): MonsterTemplateSummaryDTO {
  return { id, name, size, challengeRating, ac, hp }
}

/** 送後端前的文字欄位淨化：name / speed 修剪空白，自由文字空字串收斂為 null。 */
function cleanMonsterTextFields<T extends Omit<MonsterTemplateView, 'id'>>(view: T): T {
  return {
    ...view,
    name: cleanText(view.name),
    challengeRating: cleanTextOrNull(view.challengeRating),
    speed: cleanText(view.speed),
    senses: cleanTextOrNull(view.senses),
    languages: cleanTextOrNull(view.languages),
    remark: cleanTextOrNull(view.remark),
  }
}

/** 表單 view → 建立 payload：剝除佔位的空 `id`（backend schema 為 strict，多帶會 400）。 */
export function buildMonsterTemplateCreateBody(
  view: MonsterTemplateView,
): MonsterTemplateCreateBody {
  const { id: _id, ...body } = view
  return cleanMonsterTextFields(body)
}

/** 以欄位為粒度比對 form state 與原始 DTO，只放變更欄位；updatedAt 作 optimistic lock token。 */
export function buildMonsterTemplateUpdatePatch(
  original: MonsterTemplateDTO,
  form: MonsterTemplateFormState,
): MonsterTemplateUpdateBody {
  const { id: _id, ...fields } = form
  const next = cleanMonsterTextFields(fields)
  return {
    updatedAt: original.updatedAt,
    ...(next.name !== original.name && { name: next.name }),
    ...(next.size !== original.size && { size: next.size }),
    ...(next.alignment !== original.alignment && { alignment: next.alignment }),
    ...(next.challengeRating !== original.challengeRating && {
      challengeRating: next.challengeRating,
    }),
    ...(next.ac !== original.ac && { ac: next.ac }),
    ...(next.hp !== original.hp && { hp: next.hp }),
    ...(next.speed !== original.speed && { speed: next.speed }),
    ...(next.initiativeBonus !== original.initiativeBonus && {
      initiativeBonus: next.initiativeBonus,
    }),
    ...(!deepEqual(next.abilities, original.abilities) && { abilities: next.abilities }),
    ...(!deepEqual(next.savingThrows, original.savingThrows) && {
      savingThrows: next.savingThrows,
    }),
    ...(!deepEqual(next.skills, original.skills) && { skills: next.skills }),
    ...(!deepEqual(next.damageModifiers, original.damageModifiers) && {
      damageModifiers: next.damageModifiers,
    }),
    ...(!deepEqual(next.conditionImmunityKeys, original.conditionImmunityKeys) && {
      conditionImmunityKeys: next.conditionImmunityKeys,
    }),
    ...(next.senses !== original.senses && { senses: next.senses }),
    ...(next.languages !== original.languages && { languages: next.languages }),
    ...(!deepEqual(next.attacks, original.attacks) && { attacks: next.attacks }),
    ...(!deepEqual(next.features, original.features) && { features: next.features }),
    ...(next.remark !== original.remark && { remark: next.remark }),
  }
}
