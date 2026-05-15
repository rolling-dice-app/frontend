import { t } from '~/i18n'
import type { SpellDTO } from '@rolling-dice-app/core'
import type { SpellFormEntry } from '~/types/business/character-form'

/** 將法術環數轉為當前 locale 的顯示字串（0 為戲法） */
export function formatSpellLevel(level: number): string {
  return level === 0 ? t('spell.cantrip') : `${level} ${t('spell.level')}`
}

/** 以「聲勢材」精簡字串描述法術成分 */
export function formatSpellComponents(
  spell: Pick<SpellDTO, 'verbal' | 'somatic' | 'material'>,
): string {
  const parts: string[] = []
  if (spell.verbal) parts.push('聲')
  if (spell.somatic) parts.push('勢')
  if (spell.material) parts.push('材')
  return parts.join(' / ') || '—'
}

/** 對指定 spellId 的 entry 切換 isPrepared / isFavorite，回傳新陣列；spellId 不存在時原樣回傳。 */
export function withToggledFlag(
  spells: SpellFormEntry[],
  spellId: string,
  flag: 'isPrepared' | 'isFavorite',
): SpellFormEntry[] {
  return spells.map((entry) =>
    entry.spellId === spellId ? { ...entry, [flag]: !entry[flag] } : entry,
  )
}

/** 將 SpellDTO 列表依環數分組並組內依中文名稱排序 */
export function groupSpellsByLevel(
  spells: SpellDTO[],
): Array<{ level: number; spells: SpellDTO[] }> {
  const groups = new Map<number, SpellDTO[]>()
  for (const spell of spells) {
    const bucket = groups.get(spell.level) ?? []
    bucket.push(spell)
    groups.set(spell.level, bucket)
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([level, spellsOfLevel]) => ({
      level,
      spells: [...spellsOfLevel].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant')),
    }))
}
