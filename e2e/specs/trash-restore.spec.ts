import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { seedCharacter } from '../helpers/seedCharacter'
import { CharacterTrashPom } from '../pom/character-trash.pom'

/**
 * Trash / restore vertical slice: seed an active character, soft-delete it into
 * the Trash tab, restore it back to Active, and prove the round-trip persists to
 * the database. Also asserts the post-restore behavior — a freshly restored card
 * is held in a delete cooldown (`restoredAt` + RESTORE_COOLDOWN_DAYS, pre-checked
 * client-side), so its delete button is disabled.
 */
test('delete → trash → restore round-trip persists, then a restored card is in delete cooldown', async ({
  authedPage,
  seededUser,
}) => {
  const name = `Trash-${randomUUID().slice(0, 8)}`
  const { id } = await seedCharacter(seededUser.sessionId, { name })
  const pom = new CharacterTrashPom(authedPage)

  // 1. Fresh character shows in Active, and Trash is empty.
  await pom.gotoList()
  await expect(pom.rowByName(name)).toBeVisible()
  await pom.openTrashTab()
  await expect(pom.rowByName(name)).toHaveCount(0)

  // 2. Soft-delete it → it leaves Active and lands in Trash.
  await pom.openActiveTab()
  await pom.enterDeleteMode()
  await pom.deleteByName(name, id)
  await expect(pom.rowByName(name)).toHaveCount(0)
  await pom.openTrashTab()
  await expect(pom.rowByName(name)).toBeVisible()

  // 3. Restore it → it leaves Trash and returns to Active.
  await pom.restoreByName(name, id)
  await expect(pom.rowByName(name)).toHaveCount(0)
  await pom.openActiveTab()
  await expect(pom.rowByName(name)).toBeVisible()

  // 4. Reload → still Active (proves the restore cleared deletedAt in the DB).
  await pom.reload()
  await expect(pom.rowByName(name)).toBeVisible()
  await pom.openTrashTab()
  await expect(pom.rowByName(name)).toHaveCount(0)

  // 5. Cooldown: the restored card's delete button is disabled (restoredAt set).
  await pom.openActiveTab()
  await pom.enterDeleteMode()
  await expect(pom.deleteButton(name)).toBeDisabled()
})
