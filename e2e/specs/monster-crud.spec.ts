import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { MonsterPom } from '../pom/monster.pom'

/**
 * DM monster-template slice: a real CRUD journey through the four `/dm/monster/*`
 * pages, proving frontend form/store/apiFetch → core contract → backend
 * `monster-templates` routes + ownership → real Postgres persistence.
 *
 * A plain `authedPage` is enough: free plan allows `maxMonsterTemplates: 10`
 * (`backend/src/lib/plan-limits.ts`), unlike characters (`maxActiveCharacters: 1`)
 * where holding more than one row forces the super-admin fixture.
 */
test('monster template CRUD round-trip persists to the database', async ({ authedPage }) => {
  const pom = new MonsterPom(authedPage)
  // The two names must not overlap as substrings: `getByRole`'s `name` option
  // matches a substring, so a `${name}-edited` rename would still be matched by
  // `rowByName(name)` and the "old name is gone" assertion would never fail.
  const suffix = randomUUID().slice(0, 8)
  const name = `E2E-Monster-${suffix}`
  const renamed = `E2E-Renamed-${suffix}`

  // 1. Fresh user → empty list.
  await pom.gotoList()
  await expect(pom.rowByName(name)).toHaveCount(0)

  // 2. Create → the card appears in the list.
  await pom.clickAdd()
  await pom.fillBasics({ name, hp: 33, ac: 14 })
  await pom.saveCreate()
  await expect(pom.rowByName(name)).toBeVisible()

  const id = await pom.idByName(name)

  // 3. Detail page renders the created monster, and its edit link reaches the form.
  await pom.openDetail(name, id)
  await expect(pom.detailHeading(name)).toBeVisible()
  await pom.gotoUpdateFromDetail(id)

  // The form is seeded from the DB, so the created values must come back.
  await expect(pom.field('monster-name')).toHaveValue(name)
  await expect(pom.field('monster-hp')).toHaveValue('33')

  // 4. Edit both a text and a numeric field → back on the list.
  await pom.fillBasics({ name: renamed, hp: 41 })
  await pom.saveUpdate(id)
  await expect(pom.rowByName(renamed)).toBeVisible()

  // 5. Reload → the edit survived a full round-trip through the DB.
  await pom.reload()
  await expect(pom.rowByName(renamed)).toBeVisible()
  await expect(pom.rowByName(name)).toHaveCount(0)

  await pom.openDetail(renamed, id)
  await pom.gotoUpdateFromDetail(id)
  await expect(pom.field('monster-hp')).toHaveValue('41')

  // 6. Delete from the list → the card is gone, and stays gone after a reload.
  await pom.gotoList()
  await pom.clickDelete(renamed)
  await pom.confirmDelete(id)
  await expect(pom.rowByName(renamed)).toHaveCount(0)

  await pom.reload()
  await expect(pom.rowByName(renamed)).toHaveCount(0)
})
