import { DAMAGE_TYPE_LABELS } from '~/constants/dnd'
import type { DamageDieEntry } from '@rolling-dice-app/core'
import type { AttackDraft, TotalAbilityScores } from '~/types/business/character-form'

/** 計算攻擊命中加值：屬性調整值 + 熟練加值 + 額外命中 */
export function getAttackHit(
  attack: AttackDraft,
  abilityScores: TotalAbilityScores,
  proficiencyBonus: number,
): number {
  const abilityMod = attack.abilityKey ? getAbilityModifier(abilityScores[attack.abilityKey]) : 0
  return abilityMod + proficiencyBonus + (attack.extraHitBonus ?? 0)
}

/** 依命中加值正負回傳對應顏色 class */
export function getHitBonusColorClass(hit: number): string {
  if (hit > 0) return 'text-success'
  if (hit < 0) return 'text-danger'
  return 'text-content-muted'
}

function hasDicePart(entry: DamageDieEntry): boolean {
  return entry.count > 0 && entry.dieType != null
}

function formatDamageEntry(entry: DamageDieEntry): string {
  const bonus = entry.bonus ?? 0
  const typeLabel = entry.damageType ? ` ${DAMAGE_TYPE_LABELS[entry.damageType]}` : ''
  if (hasDicePart(entry)) {
    const dice = `${entry.count}${entry.dieType}`
    const bonusStr = bonus > 0 ? `+${bonus}` : bonus < 0 ? String(bonus) : ''
    return `${dice}${bonusStr}${typeLabel}`
  }
  return `${bonus}${typeLabel}`
}

/** 將攻擊的傷害條目組合為顯示字串，例如 `1d8+5 劈砍 + 4d8+10 光耀` 或 `10 酸蝕` */
export function formatDamageSummary(
  attack: AttackDraft,
  abilityScores: TotalAbilityScores,
): string {
  const mod =
    attack.abilityKey && attack.applyAbilityToDamage
      ? getAbilityModifier(abilityScores[attack.abilityKey])
      : 0
  const renderable = attack.damageDice.filter(
    (entry) => hasDicePart(entry) || (entry.bonus ?? 0) !== 0,
  )
  if (renderable.length === 0) return '—'
  return renderable
    .map((entry, i) => {
      const adjusted = i === 0 && mod !== 0 ? { ...entry, bonus: (entry.bonus ?? 0) + mod } : entry
      return `${i > 0 ? '+ ' : ''}${formatDamageEntry(adjusted)}`
    })
    .join(' ')
}
