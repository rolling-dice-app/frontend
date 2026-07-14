import {
  buildMonsterTemplateCreateDefaults,
  type MonsterTemplateDTO,
  type MonsterTemplateSummaryDTO,
} from '@rolling-dice-app/core'
import type { MonsterTemplateFormState } from '~/types/business/monster'

export function createMockMonsterTemplate(
  overrides: Partial<MonsterTemplateDTO> = {},
): MonsterTemplateDTO {
  return {
    id: 'mt-001',
    userId: 'user-001',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    name: '哥布林',
    ...buildMonsterTemplateCreateDefaults(),
    size: 'small',
    challengeRating: '1/4',
    ac: 15,
    hp: 7,
    speed: '30 ft.',
    initiativeBonus: 2,
    skills: { stealth: 6 },
    damageModifiers: { poison: 'immunity' },
    conditionImmunityKeys: ['poisoned'],
    senses: '黑暗視覺 60 ft.',
    attacks: [
      {
        id: 'atk-1',
        name: '彎刀',
        hitBonus: 4,
        damageDice: [{ id: 'dd-1', count: 1, dieType: 6, bonus: 2, damageType: 'slashing' }],
        comment: null,
      },
    ],
    features: [{ id: 'feat-1', name: '靈活逃脫', description: '附贈動作脫離或躲藏。' }],
    ...overrides,
  }
}

export function monsterToSummary(m: MonsterTemplateDTO): MonsterTemplateSummaryDTO {
  return {
    id: m.id,
    name: m.name,
    size: m.size,
    challengeRating: m.challengeRating,
    ac: m.ac,
    hp: m.hp,
  }
}

/** 以 DTO 為底的 form state（去 server 欄位）；預設為「未變更」基準。 */
export function createMockMonsterFormState(
  base: MonsterTemplateDTO = createMockMonsterTemplate(),
  overrides: Partial<MonsterTemplateFormState> = {},
): MonsterTemplateFormState {
  const {
    userId: _u,
    createdAt: _c,
    updatedAt: _ts,
    damageVulnerabilities: _dv,
    damageResistances: _dr,
    damageImmunities: _di,
    conditionImmunities: _ci,
    ...view
  } = structuredClone(base)
  return { ...view, ...overrides }
}
