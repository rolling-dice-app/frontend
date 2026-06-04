import { test as base, type Page } from '@playwright/test'
import { seedAuthedUser } from './helpers/auth'
import { BACKEND_ORIGIN } from './helpers/env'

interface Fixtures {
  /** A page already authenticated as a freshly seeded user. */
  authedPage: Page
}

export const test = base.extend<Fixtures>({
  authedPage: async ({ page, context }, use) => {
    const { sessionId } = await seedAuthedUser()
    // Cookie is host-scoped to `localhost`, so the SSR document request and the
    // client XHR both carry it regardless of port — no production code change needed.
    await context.addCookies([{ name: 'rd_session', value: sessionId, url: BACKEND_ORIGIN }])
    await use(page)
  },
})

export { expect } from '@playwright/test'
