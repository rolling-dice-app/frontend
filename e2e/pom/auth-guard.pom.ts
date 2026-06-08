import type { Locator, Page } from '@playwright/test'

/**
 * Thin page object for the auth-guard slice. The `auth` route middleware is
 * client-only: an unauthenticated visit to a protected route lands back on `/`
 * (`navigateTo('/')`, an `external: true` full reload during first-load hydration).
 *
 * Selector policy (see e2e/README.md): "landed on home" is probed by the hero
 * logo `<img alt="Rolling Dice">` (SSR-rendered, non-i18n), not by a translated
 * string. No `gotoProtected` hydration wait — the redirect itself fires during
 * hydration, so the URL/hero assertions (which auto-retry) own the timing.
 */
export class AuthGuardPom {
  constructor(private readonly page: Page) {}

  async gotoProtected(path: string): Promise<void> {
    await this.page.goto(path)
  }

  /** The home hero logo; visible once the guard has redirected to `/`. */
  homeHero(): Locator {
    return this.page.getByRole('img', { name: 'Rolling Dice' })
  }
}
