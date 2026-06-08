import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { CharacterListPom } from '../pom/character-list.pom'

/**
 * First vertical slice: a real character CRUD journey driven through the SSR app,
 * proving frontend form/store/apiFetch → core contract → backend route + ownership
 * → real Postgres persistence, end to end.
 */
test('character CRUD round-trip persists to the database', async ({ authedPage }) => {
  const pom = new CharacterListPom(authedPage)
  const name = `E2E-${randomUUID().slice(0, 8)}`
  const renamed = `${name}-edited`

  // 1. Fresh user → empty list.
  await pom.gotoList()
  await expect(pom.rowByName(name)).toHaveCount(0)

  // 2. Build a character → it appears in the list.
  await pom.gotoBuild()
  await pom.fillName(name)
  await pom.selectFirstClass()
  await pom.submitBuild()
  await expect(pom.rowByName(name)).toBeVisible()

  const id = await pom.idByName(name)

  // 3. Edit one field → reload → the change is still there (proves it hit the DB).
  await pom.gotoUpdate(id)
  await expect(authedPage.locator('#char-name')).toHaveValue(name)
  await pom.fillName(renamed)
  await pom.submitUpdate(id)

  await pom.reload()
  await expect(authedPage.locator('#char-name')).toHaveValue(renamed)

  // 4. Delete → it leaves the active list.
  await pom.gotoList()
  await expect(pom.rowByName(renamed)).toBeVisible()
  await pom.enterDeleteMode()
  await pom.clickDelete(renamed)
  await pom.confirmDelete(id)
  await expect(pom.rowByName(renamed)).toBeHidden()
})
