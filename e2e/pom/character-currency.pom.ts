import type { CurrencyKey } from '@rolling-dice-app/core'
import type { Locator, Page } from '@playwright/test'
import { waitHydrated } from '../helpers/hydrate'

/**
 * Thin page object for the currency vertical slice: character detail page →
 * inventory tab → currency panel → edit the coin amounts via its modal. Currency
 * is a per-character singleton, so this is a read + update round-trip (no
 * create / delete); the edit is a single, non-debounced PATCH. No assertions
 * (those live in the spec).
 *
 * Selector policy (see e2e/README.md): stable, non-i18n hooks first —
 *   - the inventory tab by its `data-value="backpack"` (not i18n-bound)
 *   - the per-coin amount fields by their existing element ids
 *     `#currency-edit-<key>` (shared by display read-back and editing)
 *   - the two i18n-only buttons (panel edit / modal confirm) carry `data-testid`.
 *
 * Persistence is proven by re-opening the modal after a reload and reading the
 * coin input back: the modal seeds its draft from the store's currency, which is
 * re-fetched from the DB on load — so a surviving value means it was persisted.
 */
export class CharacterCurrencyPom {
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

  /** Activate the inventory tab (panel value `backpack`), which hosts the currency panel. */
  async openInventoryTab(): Promise<void> {
    await this.page.locator('[role="tab"][data-value="backpack"]').click()
  }

  /** Open the currency edit modal from the panel. */
  async openEditModal(): Promise<void> {
    await this.page.getByTestId('currency-edit').click()
  }

  /** A coin amount field inside the edit modal, by its stable element id. */
  coinInput(key: CurrencyKey): Locator {
    return this.page.locator(`#currency-edit-${key}`)
  }

  /** Set one coin amount and confirm; resolves when the PATCH succeeds. */
  async editCoin(key: CurrencyKey, value: number): Promise<void> {
    await this.coinInput(key).fill(String(value))
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' &&
          new URL(r.url()).pathname.endsWith('/currency') &&
          r.ok(),
      ),
      this.page.getByTestId('currency-edit-confirm').click(),
    ])
  }
}
