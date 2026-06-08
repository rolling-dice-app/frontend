import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { CharacterListPom } from '../pom/character-list.pom'

/**
 * Multiclass build vertical slice: build a character with two class entries
 * through the real form, and prove both classes persist — the update form
 * rehydrates a second class-entry row after a reload (one entry row per persisted
 * class), exercising the build form's class-array state → create contract →
 * backend multiclass derivation → DB → update form round-trip.
 */
test('multiclass build persists both class entries', async ({ authedPage }) => {
  const pom = new CharacterListPom(authedPage)
  const name = `Multi-${randomUUID().slice(0, 8)}`

  // 1. Build a character with a second class entry (add is enabled only after the
  //    primary is chosen; the second select excludes the primary's pick).
  await pom.gotoBuild()
  await pom.fillName(name)
  await pom.selectFirstClass()
  await pom.addClassEntry()
  await pom.selectClassAt(1)
  await pom.submitBuild()

  // 2. It lands in the list.
  await expect(pom.rowByName(name)).toBeVisible()
  const id = await pom.idByName(name)

  // 3. The update form shows both class entries, and still does after a reload
  //    (proves both classes hit the DB, not just local form state).
  await pom.gotoUpdate(id)
  await expect(pom.classEntry(0)).toHaveCount(1)
  await expect(pom.classEntry(1)).toHaveCount(1)

  await pom.reload()
  await expect(pom.classEntry(0)).toHaveCount(1)
  await expect(pom.classEntry(1)).toHaveCount(1)
})
