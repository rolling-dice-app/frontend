import type {
  SpellLevel,
  SpellSlots,
  ProfessionKey,
  SubprofessionKey,
} from '@rolling-dice-app/types'

export type CasterCategory = 'full' | 'half' | 'third' | 'warlock' | 'none'

/** 各職業的施法者分類；artificer 為 third-caster 但向上取整，其他 third-caster (EK / AT) 為 fighter / rogue 之 subclass，不在 ProfessionKey 範圍內 */
export const CASTER_CATEGORY: Readonly<Record<ProfessionKey, CasterCategory>> = {
  bard: 'full',
  cleric: 'full',
  druid: 'full',
  sorcerer: 'full',
  wizard: 'full',
  paladin: 'half',
  ranger: 'half',
  artificer: 'third',
  warlock: 'warlock',
  barbarian: 'none',
  fighter: 'none',
  monk: 'none',
  rogue: 'none',
}

/** 子職業對施法者類別的覆寫；主職業 CASTER_CATEGORY 為 'none' 時才生效。目前僅祕法騎士 / 奧法詭術師為 third-caster */
export const SUBPROFESSION_CASTER_OVERRIDE: Readonly<
  Partial<Record<SubprofessionKey, CasterCategory>>
> = {
  eldritchKnight: 'third',
  arcaneTrickster: 'third',
}

/** 共用施法者環位表：index = effective level (1-20)，依 PHB p.113-115 全施法者表 */
export const SHARED_CASTER_SLOTS: readonly SpellSlots[] = [
  /* 1  */ { 1: 2 },
  /* 2  */ { 1: 3 },
  /* 3  */ { 1: 4, 2: 2 },
  /* 4  */ { 1: 4, 2: 3 },
  /* 5  */ { 1: 4, 2: 3, 3: 2 },
  /* 6  */ { 1: 4, 2: 3, 3: 3 },
  /* 7  */ { 1: 4, 2: 3, 3: 3, 4: 1 },
  /* 8  */ { 1: 4, 2: 3, 3: 3, 4: 2 },
  /* 9  */ { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  /* 10 */ { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  /* 11 */ { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  /* 12 */ { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  /* 13 */ { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  /* 14 */ { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  /* 15 */ { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  /* 16 */ { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  /* 17 */ { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  /* 18 */ { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  /* 19 */ { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  /* 20 */ { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
]

/** Warlock pact magic 表：index = warlock level (1-20)，PHB p.107 */
export const WARLOCK_SLOT_TABLE: readonly { count: number; level: SpellLevel }[] = [
  /* 1  */ { count: 1, level: 1 },
  /* 2  */ { count: 2, level: 1 },
  /* 3  */ { count: 2, level: 2 },
  /* 4  */ { count: 2, level: 2 },
  /* 5  */ { count: 2, level: 3 },
  /* 6  */ { count: 2, level: 3 },
  /* 7  */ { count: 2, level: 4 },
  /* 8  */ { count: 2, level: 4 },
  /* 9  */ { count: 2, level: 5 },
  /* 10 */ { count: 2, level: 5 },
  /* 11 */ { count: 3, level: 5 },
  /* 12 */ { count: 3, level: 5 },
  /* 13 */ { count: 3, level: 5 },
  /* 14 */ { count: 3, level: 5 },
  /* 15 */ { count: 3, level: 5 },
  /* 16 */ { count: 3, level: 5 },
  /* 17 */ { count: 4, level: 5 },
  /* 18 */ { count: 4, level: 5 },
  /* 19 */ { count: 4, level: 5 },
  /* 20 */ { count: 4, level: 5 },
]
