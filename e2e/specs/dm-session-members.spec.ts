import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { SEEDED_DISPLAY_NAME } from '../helpers/auth'
import { seedCharacter } from '../helpers/seedCharacter'
import { shareCharacter } from '../helpers/shareCharacter'
import { DmSessionPom } from '../pom/dm-session.pom'
import { DmSessionMembersPom } from '../pom/dm-session-members.pom'

/**
 * DM session container member-roster slice — the half of the container that
 * `dm-session-crud` deliberately leaves out.
 *
 * Covers the full link chain: a *shared* character → `POST /share/characters/resolve`
 * → the row's read-only character name → the player-name snapshot (m7.2: a linked
 * member's player name is the owner's display name, frontend-read-only and
 * self-healing) → `PATCH /dm-session-containers/:id` → Postgres.
 *
 * The character is owned by the same user as the DM here: share resolution is by
 * `shareId` regardless of owner, and one character stays inside the free plan's
 * `maxActiveCharacters: 1`, so no super-admin fixture is needed.
 */
test('DM session member roster links a shared character and persists', async ({
  authedPage,
  seededUser,
}) => {
  const character = await seedCharacter(seededUser.sessionId)
  // A character is created un-shared; an un-shared shareId resolves to nothing.
  await shareCharacter(seededUser.sessionId, character.id)

  const session = new DmSessionPom(authedPage)
  const pom = new DmSessionMembersPom(authedPage)

  // 1. Fresh container → empty roster.
  await session.gotoList()
  const containerId = await session.createContainer(`E2E-Roster-${randomUUID().slice(0, 8)}`)
  await expect(pom.chip(character.shareId)).toHaveCount(0)

  // 2. Add a row, type a throwaway player name, then paste the share link.
  await pom.openModal()
  await pom.addRow()
  await pom.fillPlayerName('typed-by-hand')
  await pom.linkCharacter(character.shareId)

  // 3. Resolution fills the read-only character name and overwrites the typed
  //    player name with the owner's display name, locking the field.
  await expect(pom.characterNameField()).toHaveValue(character.name)
  await expect(pom.playerNameField()).toHaveValue(SEEDED_DISPLAY_NAME)
  await expect(pom.playerNameField()).toHaveJSProperty('readOnly', true)

  // 4. Confirm → the info card's roster chip links to the public share page.
  await pom.confirm(containerId)
  await expect(pom.chip(character.shareId)).toBeVisible()

  // 5. Reload → the link survived a full round-trip through the DB.
  await session.reload()
  await expect(pom.chip(character.shareId)).toBeVisible()

  // 6. Remove the row → chip gone, and stays gone after a reload.
  await pom.openModal()
  await pom.removeRow(SEEDED_DISPLAY_NAME)
  await pom.confirm(containerId)
  await expect(pom.chip(character.shareId)).toHaveCount(0)

  await session.reload()
  await expect(pom.chip(character.shareId)).toHaveCount(0)
})
