import type { Locator, Page } from '@playwright/test'
import { waitHydrated } from '../helpers/hydrate'

/**
 * Thin page object for the character list's view controls: the grid/list view
 * toggle (server-authoritative — persists via `PATCH /users/me` preference, no
 * localStorage fallback) and the client-only sort select.
 *
 * Selector policy (see e2e/README.md): stable, non-i18n hooks first —
 *   - the view toggle by `data-testid="character-view-mode-toggle"` (i18n-only
 *     aria-label; its `aria-pressed` carries the persisted state being asserted).
 *   - the sort select by its existing `.sort-select` class hook; its options by
 *     their value-derived id suffix (`[id$="-opt-<value>"]`), not the i18n labels.
 *   - card order by the name in each card's heading, scoped to `<main>` to exclude
 *     the BottomNavDrawer's links (teleported outside `<main>`).
 */
export class CharacterListViewPom {
  constructor(private readonly page: Page) {}

  async gotoList(): Promise<void> {
    await this.page.goto('/character')
    await waitHydrated(this.page)
  }

  async reload(): Promise<void> {
    await this.page.reload()
    await waitHydrated(this.page)
  }

  /** The view-mode toggle; `aria-pressed="true"` means list mode (vs grid). */
  viewToggle(): Locator {
    return this.page.getByTestId('character-view-mode-toggle')
  }

  /** Flip the view mode, awaiting the preference PATCH that makes it persist. */
  async toggleView(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' &&
          new URL(r.url()).pathname.endsWith('/users/me') &&
          r.ok(),
      ),
      this.viewToggle().click(),
    ])
  }

  /** Pick a sort option (`default` | `level-asc` | `level-desc`); client-only reorder. */
  async selectSort(value: 'default' | 'level-asc' | 'level-desc'): Promise<void> {
    await this.page.locator('.sort-select').getByRole('combobox').click()
    await this.page.locator(`[id$="-opt-${value}"]`).click()
  }

  /** Character names in DOM order (card headings under `<main>`), for sort assertions. */
  async cardNamesInOrder(): Promise<string[]> {
    return this.page.locator('main a:has(h3) h3').allInnerTexts()
  }
}
