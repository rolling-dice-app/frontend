import { test as base, type Page } from '@playwright/test'
import { seedAuthedUser, type SeededUser } from './helpers/auth'
import { BACKEND_ORIGIN, SUPER_ADMIN_EMAIL } from './helpers/env'

interface Fixtures {
  /** The freshly seeded user (id + session) backing `authedPage`; exposed so a
   *  test can seed owned sub-resources (e.g. a character) for the same user. */
  seededUser: SeededUser
  /** A page already authenticated as `seededUser`. */
  authedPage: Page
  /** A freshly seeded super-admin user (email in `SUPER_ADMIN_EMAILS`); bypasses
   *  plan limits so a test can hold >1 active character. */
  superAdminUser: SeededUser
  /** A page already authenticated as `superAdminUser`. */
  superAdminPage: Page
}

export const test = base.extend<Fixtures>({
  // oxlint-disable-next-line no-empty-pattern -- Playwright requires the destructured deps arg; this fixture has no dependencies
  seededUser: async ({}, use) => {
    await use(await seedAuthedUser())
  },
  authedPage: async ({ page, context, seededUser }, use) => {
    // Cookie is host-scoped to `localhost`, so the SSR document request and the
    // client XHR both carry it regardless of port — no production code change needed.
    await context.addCookies([
      { name: 'rd_session', value: seededUser.sessionId, url: BACKEND_ORIGIN },
    ])
    await use(page)
  },
  // oxlint-disable-next-line no-empty-pattern -- see seededUser
  superAdminUser: async ({}, use) => {
    await use(await seedAuthedUser(SUPER_ADMIN_EMAIL))
  },
  superAdminPage: async ({ page, context, superAdminUser }, use) => {
    await context.addCookies([
      { name: 'rd_session', value: superAdminUser.sessionId, url: BACKEND_ORIGIN },
    ])
    await use(page)
  },
})

export { expect } from '@playwright/test'
