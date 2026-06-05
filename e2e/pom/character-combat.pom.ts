import type { Locator, Page } from '@playwright/test'
import { waitHydrated } from '../helpers/hydrate'

/**
 * Thin page object for the combat-state vertical slice. CombatState lives on the
 * detail page's combat tab (the quickview) and has two distinct write models,
 * both covered here:
 *   - field edits (e.g. max-HP adjustment) fire a *debounced* PATCH → re-GET
 *     pipeline from the quickview.
 *   - rest / reset are POSTs that return no body and then re-GET the fresh state
 *     ([[project_combat_state_rest_contract]]); reset clears all adjustments.
 *
 * Selector policy (see e2e/README.md): stable, non-i18n hooks first —
 *   - the combat tab by its `data-value="combat"` (not i18n-bound)
 *   - the max-HP adjustment indicator is read from the HP card by its stable
 *     `aria-labelledby="quickview-hp-label"` section + the `(+N)` modifier text
 *     (from formatModifier, not i18n), so no display testid is needed
 *   - the three i18n-only action buttons (max-HP +1, reset, reset-confirm) carry
 *     `data-testid`.
 */
export class CharacterCombatPom {
  constructor(private readonly page: Page) {}

  async gotoDetail(id: string): Promise<void> {
    await this.page.goto(`/character/${id}`)
    await waitHydrated(this.page)
  }

  /** Full reload then re-hydrate; activeTab resets, so re-open the tab after. */
  async reload(): Promise<void> {
    await this.page.reload()
    await waitHydrated(this.page)
  }

  /** Activate the combat tab (panel value `combat`), which hosts the quickview. */
  async openCombatTab(): Promise<void> {
    await this.page.locator('[role="tab"][data-value="combat"]').click()
  }

  /** The max-HP `(+N)` adjustment indicator inside the HP card; absent when zero.
   *  Doubles as the presence probe for a persisted max-HP adjustment. */
  maxHpAdjustment(modifier: string): Locator {
    return this.page
      .locator('section[aria-labelledby="quickview-hp-label"]')
      .getByText(`(${modifier})`, { exact: true })
  }

  /** Bump the max-HP adjustment by +1; resolves once the debounced PATCH lands. */
  async incrementMaxHp(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' &&
          new URL(r.url()).pathname.endsWith('/combat-state') &&
          r.ok(),
      ),
      this.page.getByTestId('combat-hp-max-increment').click(),
    ])
  }

  /** Open the reset confirm modal, confirm, and wait for the reset POST + its
   *  follow-up GET (the POST returns no body, so the re-GET is what refreshes the
   *  UI — wait for both so the cleared state is applied before asserting). */
  async reset(): Promise<void> {
    await this.page.getByTestId('combat-reset').click()
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          new URL(r.url()).pathname.endsWith('/combat-state/reset') &&
          r.ok(),
      ),
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'GET' &&
          new URL(r.url()).pathname.endsWith('/combat-state') &&
          r.ok(),
      ),
      this.page.getByTestId('combat-reset-confirm').click(),
    ])
  }
}
