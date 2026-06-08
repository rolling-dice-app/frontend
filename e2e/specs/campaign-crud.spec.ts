import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { seedCharacter } from '../helpers/seedCharacter'
import { CharacterCampaignsPom } from '../pom/character-campaigns.pom'

/**
 * Campaign-records CRUD vertical slice: seed a character through the real create
 * endpoint, then drive add / edit / delete of a campaign record from the detail
 * page's campaigns tab, proving each mutation persists to the database across a
 * reload. Teammates and the money-to-currency credit are out of scope here (the
 * former belongs to the share slice, the latter to currency).
 */
test('campaign record CRUD round-trip persists to the database', async ({
  authedPage,
  seededUser,
}) => {
  const { id } = await seedCharacter(seededUser.sessionId)
  const pom = new CharacterCampaignsPom(authedPage)
  const title = `Campaign-${randomUUID().slice(0, 8)}`
  const renamed = `${title}-edited`

  // 1. Open the campaigns tab → no records yet.
  await pom.gotoDetail(id)
  await pom.openCampaignsTab()
  await expect(pom.rowByTitle(title)).toHaveCount(0)

  // 2. Add a record → it appears, and survives a reload (proves it hit the DB).
  await pom.addRecord(title, 'A short tale of the road.')
  await expect(pom.rowByTitle(title)).toBeVisible()
  await pom.reload()
  await pom.openCampaignsTab()
  await expect(pom.rowByTitle(title)).toBeVisible()

  // 3. Rename it → reload → the new title persists.
  await pom.editRecord(title, renamed)
  await pom.reload()
  await pom.openCampaignsTab()
  await expect(pom.rowByTitle(renamed)).toBeVisible()

  // 4. Delete it → it leaves the list, and stays gone after reload.
  await pom.deleteRecord(renamed)
  await expect(pom.rowByTitle(renamed)).toHaveCount(0)
  await pom.reload()
  await pom.openCampaignsTab()
  await expect(pom.rowByTitle(renamed)).toHaveCount(0)
})
