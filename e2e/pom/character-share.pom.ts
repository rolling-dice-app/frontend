import type { Locator, Page } from '@playwright/test'
import { waitHydrated } from '../helpers/hydrate'

/**
 * Thin page object for the share vertical slice. Share spans two surfaces:
 *   - the character list page → each row's ShareMenu (a Teleported menu) whose
 *     toggle item fires `PATCH /characters/:id/share` through the store's
 *     optimistic action.
 *   - the public read-only page `/share/:shareId` (unauthenticated), driven by a
 *     separate cookieless context to prove it needs no session.
 *
 * Selector policy (see e2e/README.md): stable, non-i18n hooks first —
 *   - the ShareMenu trigger by its `aria-haspopup="menu"` + the character name
 *     carried in its aria-label (locale-stable user data)
 *   - the toggle menu item by `data-testid="character-share-toggle"` (the three
 *     menu items are i18n-only and the toggle label flips with `shareable`)
 *   - the public read page's identity by the `<h1>` heading (the character name)
 *   - the unavailable state by its `role="alert"` (non-i18n)
 */
export class CharacterSharePom {
  constructor(private readonly page: Page) {}

  async gotoList(): Promise<void> {
    await this.page.goto('/character')
    await waitHydrated(this.page)
  }

  /** The ShareMenu trigger button for a character, matched by the name in its aria-label. */
  private shareTrigger(name: string): Locator {
    return this.page.locator(`button[aria-haspopup="menu"][aria-label*="${name}"]`)
  }

  /**
   * Toggle a character's public-share state via its ShareMenu, awaiting the
   * `PATCH /characters/:id/share`. The toggle item keeps the same testid in both
   * directions (its label flips between enable/disable), so this both enables and
   * disables.
   */
  async toggleShare(name: string, id: string): Promise<void> {
    await this.shareTrigger(name).click()
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' &&
          new URL(r.url()).pathname.endsWith(`/characters/${id}/share`) &&
          r.ok(),
      ),
      this.page.getByTestId('character-share-toggle').click(),
    ])
  }

  /** Open the public read-only page on a (typically cookieless) page and hydrate. */
  async gotoPublic(page: Page, shareId: string): Promise<void> {
    await page.goto(`/share/${shareId}`)
    await waitHydrated(page)
  }

  /** The shared character's name heading on the public page (presence probe). */
  publicName(page: Page, name: string): Locator {
    return page.getByRole('heading', { name, level: 1 })
  }

  /** The "share unavailable" alert shown when the shareId resolves to nothing. */
  publicUnavailable(page: Page): Locator {
    return page.getByRole('alert')
  }
}
