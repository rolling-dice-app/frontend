import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { seedCharacter } from '../helpers/seedCharacter'
import { CharacterInventoryPom } from '../pom/character-inventory.pom'

/**
 * Inventory CRUD vertical slice: seed a character through the real create
 * endpoint, then drive add / rename / delete of an inventory item from the
 * detail page, proving each mutation persists to the database across a reload.
 */
test('inventory item CRUD round-trip persists to the database', async ({
  authedPage,
  seededUser,
}) => {
  const { id } = await seedCharacter(seededUser.sessionId)
  const pom = new CharacterInventoryPom(authedPage)
  const name = `Item-${randomUUID().slice(0, 8)}`
  const renamed = `${name}-edited`

  // 1. Open the character's inventory tab → empty backpack.
  await pom.gotoDetail(id)
  await pom.openInventoryTab()
  await expect(pom.rowByName(name)).toHaveCount(0)

  // 2. Add an item → it appears, and survives a reload (proves it hit the DB).
  await pom.addItem(name)
  await expect(pom.rowByName(name)).toBeVisible()
  await pom.reload()
  await pom.openInventoryTab()
  await expect(pom.rowByName(name)).toBeVisible()

  // 3. Rename it → reload → the new name persists.
  await pom.renameItem(name, renamed)
  await pom.reload()
  await pom.openInventoryTab()
  await expect(pom.rowByName(renamed)).toBeVisible()

  // 4. Delete it → it leaves the list, and stays gone after reload.
  await pom.deleteItem(renamed)
  await expect(pom.rowByName(renamed)).toHaveCount(0)
  await pom.reload()
  await pom.openInventoryTab()
  await expect(pom.rowByName(renamed)).toHaveCount(0)
})
