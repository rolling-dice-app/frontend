import { test, expect } from '../fixtures'
import { seedCharacter } from '../helpers/seedCharacter'
import { CharacterSharePom } from '../pom/character-share.pom'

/**
 * Share vertical slice. A character is created un-shared (default
 * `shareable: false`); the round-trip drives the toggle from the list page and
 * reads the public page from a *cookieless* context to prove it needs no session:
 *   1. toggle on (PATCH /characters/:id/share) → public page renders the projection
 *   2. toggle off (PATCH again)               → public page 404s (unavailable)
 * The public reads run in a fresh `browser.newContext()` with no `rd_session`
 * cookie, so a successful read is genuine unauthenticated (teammate-style) access.
 */
test('share toggle controls unauthenticated public read by shareId', async ({
  authedPage,
  seededUser,
  browser,
}) => {
  const { id, name, shareId, shareable } = await seedCharacter(seededUser.sessionId)
  expect(shareable).toBe(false) // guards the round-trip's starting state

  const pom = new CharacterSharePom(authedPage)

  // A separate context with no session cookie — the public page must work without auth.
  const publicContext = await browser.newContext()
  const publicPage = await publicContext.newPage()

  try {
    // While un-shared, the shareId resolves to nothing → unavailable alert.
    await pom.gotoPublic(publicPage, shareId)
    await expect(pom.publicUnavailable(publicPage)).toBeVisible()

    // 1. Toggle on → the public projection becomes readable without a session.
    await pom.gotoList()
    await pom.toggleShare(name, id)
    await pom.gotoPublic(publicPage, shareId)
    await expect(pom.publicName(publicPage, name)).toBeVisible()

    // 2. Toggle off → the same shareId stops resolving (back to unavailable).
    await pom.toggleShare(name, id)
    await pom.gotoPublic(publicPage, shareId)
    await expect(pom.publicUnavailable(publicPage)).toBeVisible()
  } finally {
    await publicContext.close()
  }
})
