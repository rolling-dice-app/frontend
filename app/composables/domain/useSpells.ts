import { validateSpell } from '~/helpers/spell'
import type { SpellDTO } from '@rolling-dice-app/core'

export interface SkippedSpell {
  name: string
  school: string
}

/** 從 backend `/spells` 載入並正規化 SpellDTO，回傳略過的未知學派條目。 */
export function useSpells() {
  const logger = createLogger('[useSpells]')
  const catalog = spells()

  const { data, pending, error, refresh } = useAsyncData('spells', async () => {
    const raw = await catalog.list()
    const accepted: SpellDTO[] = []
    const skipped: SkippedSpell[] = []
    for (const r of raw) {
      const validated = validateSpell(r)
      if (validated) {
        accepted.push(validated)
      } else {
        skipped.push({ name: r.name, school: r.school })
      }
    }
    if (skipped.length > 0) {
      logger.warn(`略過 ${skipped.length} 筆未知學派法術`, skipped)
    }
    return { spells: accepted, skipped }
  })

  const spellList = computed<SpellDTO[]>(() => data.value?.spells ?? [])
  const skippedSpells = computed<SkippedSpell[]>(() => data.value?.skipped ?? [])

  const spellMap = computed(() => new Map(spellList.value.map((s) => [s.id, s])))

  const getSpell = (id: string): SpellDTO | undefined => spellMap.value.get(id)

  return { spells: spellList, skippedSpells, spellMap, getSpell, pending, error, refresh }
}
