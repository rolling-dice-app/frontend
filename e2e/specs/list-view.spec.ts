import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { seedCharacter } from '../helpers/seedCharacter'
import { CharacterListViewPom } from '../pom/character-list-view.pom'

/**
 * Character list view-controls slice, split by layer:
 *   - view mode (grid/list): server-authoritative — toggling fires
 *     `PATCH /users/me` and the choice survives a reload from the DB (no
 *     localStorage fallback), a genuine persistence round-trip a normal user hits.
 *   - sort: a client-only reorder of the loaded list (no backend, resets on
 *     reload). It only matters with >1 active character, which the free plan
 *     forbids (`maxActiveCharacters: 1`), so it's driven by a seeded super-admin
 *     (email in `SUPER_ADMIN_EMAILS`) — the only way to hold two active cards.
 */
test('list view mode persists to the database across reload', async ({
  authedPage,
  seededUser,
}) => {
  // The view controls only render once the user has at least one character.
  await seedCharacter(seededUser.sessionId)
  const pom = new CharacterListViewPom(authedPage)
  await pom.gotoList()

  // Default is grid (aria-pressed=false). Toggle to list → it persists across reload.
  await expect(pom.viewToggle()).toHaveAttribute('aria-pressed', 'false')
  await pom.toggleView()
  await expect(pom.viewToggle()).toHaveAttribute('aria-pressed', 'true')

  await pom.reload()
  await expect(pom.viewToggle()).toHaveAttribute('aria-pressed', 'true')

  // Toggle back to grid → that also persists.
  await pom.toggleView()
  await pom.reload()
  await expect(pom.viewToggle()).toHaveAttribute('aria-pressed', 'false')
})

test('list sort reorders the cards by level', async ({ superAdminPage, superAdminUser }) => {
  const low = `Low-${randomUUID().slice(0, 8)}`
  const high = `High-${randomUUID().slice(0, 8)}`
  await seedCharacter(superAdminUser.sessionId, {
    name: low,
    classes: [{ classKey: 'fighter', level: 1, subclass: null }],
  })
  await seedCharacter(superAdminUser.sessionId, {
    name: high,
    classes: [{ classKey: 'fighter', level: 10, subclass: null }],
  })

  const pom = new CharacterListViewPom(superAdminPage)
  await pom.gotoList()

  // level-desc → higher level first; level-asc → reversed. (Client-only reorder.)
  await pom.selectSort('level-desc')
  await expect
    .poll(async () => {
      const order = await pom.cardNamesInOrder()
      return order.indexOf(high) < order.indexOf(low)
    })
    .toBe(true)

  await pom.selectSort('level-asc')
  await expect
    .poll(async () => {
      const order = await pom.cardNamesInOrder()
      return order.indexOf(low) < order.indexOf(high)
    })
    .toBe(true)
})
