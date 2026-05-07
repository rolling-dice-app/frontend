import {
  CASTER_CATEGORY,
  SHARED_CASTER_SLOTS,
  SUBCLASS_CASTER_OVERRIDE,
  WARLOCK_SLOT_TABLE,
  type CasterCategory,
} from '~/constants/spell-slot-table'
import type {
  SpellLevel,
  SpellSlots,
  SpellSlotsDelta,
  ClassKey,
  SubclassKey,
} from '@rolling-dice-app/core'

const SPELL_LEVELS: readonly SpellLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const SLOT_MAX = 9

interface ClassLike {
  classKey: ClassKey | null
  level: number
  subclass: SubclassKey | null
}

const resolveCategory = (entry: ClassLike): CasterCategory => {
  if (entry.classKey === null) return 'none'
  const base = CASTER_CATEGORY[entry.classKey]
  if (base !== 'none') return base
  if (entry.subclass === null) return 'none'
  return SUBCLASS_CASTER_OVERRIDE[entry.subclass] ?? 'none'
}

/** 一般施法者建議環位（全 / 半 / 三分之一合併計算）；artificer 向上取整，其他 third-caster 向下取整 */
export const getSuggestedRegularSpellSlots = (classes: readonly ClassLike[]): SpellSlots => {
  let fullLevels = 0
  let halfLevels = 0
  let thirdNonArtificerLevels = 0
  let artificerLevels = 0

  for (const entry of classes) {
    if (entry.classKey === null || entry.level <= 0) continue
    const category = resolveCategory(entry)
    if (category === 'full') {
      fullLevels += entry.level
    } else if (category === 'half') {
      halfLevels += entry.level
    } else if (category === 'third') {
      if (entry.classKey === 'artificer') artificerLevels += entry.level
      else thirdNonArtificerLevels += entry.level
    }
  }

  const effectiveLevel =
    fullLevels +
    Math.floor(halfLevels / 2) +
    Math.floor(thirdNonArtificerLevels / 3) +
    Math.ceil(artificerLevels / 3)

  if (effectiveLevel < 1 || effectiveLevel > 20) return {}
  return { ...SHARED_CASTER_SLOTS[effectiveLevel - 1] }
}

/** 契術師 pact magic 建議環位；多次契術師等級加總後查表 */
export const getSuggestedPactSlots = (classes: readonly ClassLike[]): SpellSlots => {
  let warlockLevels = 0
  for (const entry of classes) {
    if (entry.classKey === null || entry.level <= 0) continue
    if (CASTER_CATEGORY[entry.classKey] === 'warlock') warlockLevels += entry.level
  }

  if (warlockLevels < 1 || warlockLevels > 20) return {}
  const pact = WARLOCK_SLOT_TABLE[warlockLevels - 1]
  if (!pact) return {}
  const level: SpellLevel = pact.level
  return { [level]: pact.count }
}

/** 合併建議環位 (base) 與使用者調整 (delta)，輸出每環顯示值，clamp 至 [0, 9]；零值不留 key */
export const mergeSlots = (base: SpellSlots, delta: SpellSlotsDelta): SpellSlots => {
  const result: SpellSlots = {}
  for (const level of SPELL_LEVELS) {
    const value = (base[level] ?? 0) + (delta[level] ?? 0)
    const clamped = Math.max(0, Math.min(SLOT_MAX, value))
    if (clamped > 0) result[level] = clamped
  }
  return result
}
