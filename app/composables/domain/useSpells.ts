import { validateSpell } from '~/helpers/spell'
import type { SpellDTO } from '@rolling-dice-app/core'

export interface SkippedSpell {
  name: string
  school: string
}

/** 載入 public/json/spells.json，回傳正規化後的 SpellDTO 與略過的未知學派條目。 */
export function useSpells() {
  const config = useRuntimeConfig()
  const logger = createLogger('[useSpells]')

  const { data, pending, error, refresh } = useAsyncData('spells', async () => {
    const baseURL = config.app.baseURL.endsWith('/') ? config.app.baseURL : `${config.app.baseURL}/`
    const raw = await $fetch<SpellDTO[]>(`${baseURL}json/spells.json`)
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

  const spells = computed<SpellDTO[]>(() => data.value?.spells ?? [])
  const skippedSpells = computed<SkippedSpell[]>(() => data.value?.skipped ?? [])

  const spellMap = computed(() => new Map(spells.value.map((s) => [s.id, s])))

  function getSpell(id: string): SpellDTO | undefined {
    return spellMap.value.get(id)
  }

  return { spells, skippedSpells, spellMap, getSpell, pending, error, refresh }
}
