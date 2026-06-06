import type { SpellDTO } from '@rolling-dice-app/core'
import { test, expect } from '../fixtures'
import { seedCharacter } from '../helpers/seedCharacter'
import { fetchSpellCatalog, seedSpellEntry } from '../helpers/seedSpell'
import { CharacterSpellsPom } from '../pom/character-spells.pom'

/** Two catalog spells whose names are letters/digits/spaces only (selector-safe) and
 *  not a substring of any other catalog name — so the substring catalog search
 *  filters to one row and each `[aria-label*=<name>]` locator stays unambiguous. */
function pickTwoSpells(catalog: SpellDTO[]): [SpellDTO, SpellDTO] {
  const safe = catalog.filter((s) => {
    if (!/^[\p{L}\p{N} ]+$/u.test(s.name)) return false
    const needle = s.name.toLowerCase()
    return !catalog.some((other) => other.id !== s.id && other.name.toLowerCase().includes(needle))
  })
  const [first, second] = safe
  if (!first || !second) {
    throw new Error('need two selector-unique catalog spells (name not a substring of any other)')
  }
  return [first, second]
}

/**
 * Spell CRUD vertical slice. The three spell verbs live on two pages and two
 * trigger models, so one round-trip exercises all of them:
 *   - favorite (PATCH): debounced toggle from the detail quickview
 *   - learn (POST) / forget (DELETE): fired by the update form's save diff
 * Each mutation is re-checked after a reload / re-fetch to prove it hit the DB.
 */
test('spell favorite / learn / forget round-trip persists to the database', async ({
  authedPage,
  seededUser,
}) => {
  const [seeded, extra] = pickTwoSpells(await fetchSpellCatalog())

  const { id } = await seedCharacter(seededUser.sessionId)
  await seedSpellEntry(seededUser.sessionId, id, seeded.id)

  const pom = new CharacterSpellsPom(authedPage)

  // 1. Favorite (PATCH): the seeded spell starts un-favorited; toggle it on and
  //    confirm the new state survives a reload (proves it hit the DB).
  await pom.gotoDetail(id)
  await pom.openSpellsTab()
  await expect(pom.favoriteButton(seeded.name)).toHaveAttribute('aria-pressed', 'false')
  await pom.toggleFavorite(seeded.name)
  await expect(pom.favoriteButton(seeded.name)).toHaveAttribute('aria-pressed', 'true')
  await pom.reload()
  await pom.openSpellsTab()
  await expect(pom.favoriteButton(seeded.name)).toHaveAttribute('aria-pressed', 'true')

  // 2. Learn (POST): add a second spell via the update form → it appears in the
  //    detail learned list after navigating back.
  await pom.gotoUpdate(id)
  await pom.learnViaUpdate(extra.name)
  await pom.gotoDetail(id)
  await pom.openSpellsTab()
  await expect(pom.favoriteButton(extra.name)).toBeVisible()

  // 3. Forget (DELETE): drop the seeded spell via the update form → it leaves
  //    the detail learned list and stays gone.
  await pom.gotoUpdate(id)
  await pom.forgetViaUpdate(seeded.name)
  await pom.gotoDetail(id)
  await pom.openSpellsTab()
  await expect(pom.favoriteButton(seeded.name)).toHaveCount(0)
})
