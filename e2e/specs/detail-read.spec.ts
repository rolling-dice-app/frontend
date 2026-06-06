import { test, expect } from '../fixtures'
import { seedCharacter } from '../helpers/seedCharacter'
import { CharacterDetailPom } from '../pom/character-detail.pom'

/**
 * Character detail read page slice — the SSR-payload privacy guard.
 *
 * The page fetches its character client-only (`useAsyncData(..., { server: false })`),
 * so the SSR HTML must not contain the owner's private data — this guards against an
 * edge cache (Vercel) leaking one user's character to another. It needs the real SSR
 * server + client fetch, so it's an e2e concern, not a unit test.
 *
 * Deliberately not here: tab switching is `@ui` Tabs' own contract (tested in
 * packages/ui), and deep per-tab content is owned by the combat / spells / inventory
 * / currency / campaign slices — re-asserting either would test another repo's
 * component or duplicate existing coverage.
 */
test('private character data is not in the SSR payload (client-only fetch)', async ({
  authedPage,
  seededUser,
}) => {
  // A distinctive name so its presence in the SSR HTML would be an unmistakable leak.
  const privateName = 'Zephyrion Private Detail'
  const { id, name } = await seedCharacter(seededUser.sessionId, { name: privateName })

  const pom = new CharacterDetailPom(authedPage)

  // The server-rendered document must not bake in the private character data.
  expect(await pom.rawSsrHtml(id)).not.toContain(privateName)

  // After the client-only fetch hydrates, the name shows — proving it's absent from
  // SSR by design, not merely broken.
  await pom.gotoDetail(id)
  await expect(pom.nameHeading(name)).toBeVisible()
})
