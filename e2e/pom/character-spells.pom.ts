import type { Locator, Page } from '@playwright/test'
import { waitHydrated } from '../helpers/hydrate'

/**
 * Thin page object for the spell vertical slice. Spells span two pages and two
 * trigger models, both covered here:
 *   - detail page → spells tab: prepared / favorite toggles fire a *debounced*
 *     PATCH straight from the quickview accordion.
 *   - update page → spells tab: learn / forget are buffered into the form and
 *     fired as POST / DELETE by the form's save (diffed against the baseline).
 *
 * Selector policy (see e2e/README.md): stable, non-i18n hooks first —
 *   - the spells tab by its `data-value="spells"` (shared by both pages)
 *   - the favorite toggle by its component class `.favorite-btn` scoped to the
 *     spell name carried in its aria-label (avoids the FavoriteSpellList's
 *     name-bearing select button); its `aria-pressed` carries the state
 *   - the catalog learn checkbox by accessible name (the spell name segment)
 *   - the search box by its native `type="search"`
 *   - the save button by its existing `data-testid="character-update-submit"`
 * No new production testid is needed for this slice.
 */
export class CharacterSpellsPom {
  constructor(private readonly page: Page) {}

  async gotoDetail(id: string): Promise<void> {
    await this.page.goto(`/character/${id}`)
    await waitHydrated(this.page)
  }

  async gotoUpdate(id: string): Promise<void> {
    await this.page.goto(`/character/${id}/update`)
    await waitHydrated(this.page)
  }

  /** Full reload then re-hydrate; activeTab resets, so re-open the tab after. */
  async reload(): Promise<void> {
    await this.page.reload()
    await waitHydrated(this.page)
  }

  /** Activate the spells tab (panel value `spells`); present on detail + update pages. */
  async openSpellsTab(): Promise<void> {
    await this.page.locator('[role="tab"][data-value="spells"]').click()
  }

  // ── detail page: favorite (debounced PATCH) ──────────────────────────────

  /** A learned spell's favorite toggle, scoped by class + the name in its
   *  aria-label; also serves as a presence probe for the learned list. */
  favoriteButton(name: string): Locator {
    return this.page.locator(`button.favorite-btn[aria-label*="${name}"]`)
  }

  /** Toggle favorite on a learned spell; resolves once the debounced PATCH lands. */
  async toggleFavorite(name: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' &&
          new URL(r.url()).pathname.includes('/spells/') &&
          r.ok(),
      ),
      this.favoriteButton(name).click(),
    ])
  }

  // ── update page: learn / forget (form save → POST / DELETE) ──────────────

  /** Filter the catalog panel down to a spell by name. */
  async searchCatalog(name: string): Promise<void> {
    await this.page.locator('input[type="search"]').fill(name)
  }

  /** The catalog learn toggle for a spell. The @ui Checkbox forwards its
   *  aria-label to its wrapper element (the native input is sr-only and nameless),
   *  so match the labelled wrapper; clicking it lands on the inner <label> and
   *  toggles the checkbox. */
  learnToggle(name: string): Locator {
    return this.page.locator(`[aria-label*="${name}"]`)
  }

  /** Learn a spell via the update form: search → tick → save, awaiting the POST. */
  async learnViaUpdate(name: string): Promise<void> {
    await this.openSpellsTab()
    await this.searchCatalog(name)
    await this.learnToggle(name).click()
    await this.saveAwaiting('POST', (pathname) => pathname.endsWith('/spells'))
  }

  /** Forget a learned spell via the update form: search → untick → save, awaiting the DELETE. */
  async forgetViaUpdate(name: string): Promise<void> {
    await this.openSpellsTab()
    await this.searchCatalog(name)
    await this.learnToggle(name).click()
    await this.saveAwaiting('DELETE', (pathname) => pathname.includes('/spells/'))
  }

  private async saveAwaiting(
    method: string,
    matchPath: (pathname: string) => boolean,
  ): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) => r.request().method() === method && matchPath(new URL(r.url()).pathname) && r.ok(),
      ),
      this.page.getByTestId('character-update-submit').click(),
    ])
  }
}
