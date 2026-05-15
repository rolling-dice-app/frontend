import type { SpellDTO } from '@rolling-dice-app/core'

/** 從 backend `/spells` 載入法術圖鑑；同 key dedupe 跨 component。 */
export function useSpells() {
  const catalog = spells()

  const { data, pending, error, refresh } = useAsyncData('spells', () => catalog.list())

  const spellList = computed<SpellDTO[]>(() => data.value ?? [])
  const spellMap = computed(() => new Map(spellList.value.map((s) => [s.id, s])))
  const getSpell = (id: string): SpellDTO | undefined => spellMap.value.get(id)

  return { spells: spellList, spellMap, getSpell, pending, error, refresh }
}
