import type { Locator, Page } from '@playwright/test'
import { waitHydrated } from '../helpers/hydrate'

/**
 * Thin page object for the inventory vertical slice: character detail page →
 * inventory tab → add / rename / delete an item via its modal. No assertions
 * (those live in the spec).
 *
 * Selector policy (see e2e/README.md): stable, non-i18n hooks first —
 *   - the inventory tab by its `data-value="backpack"` (not i18n-bound)
 *   - the item row by accessible name, where the matched segment is the
 *     user-provided item name (locale-stable user data)
 *   - the modal name input by its existing element id `#item-modal-name`
 *   - the purely-i18n action buttons (add / confirm / per-row edit / delete)
 *     carry `data-testid` instead.
 */
export class CharacterInventoryPom {
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

  /** Activate the inventory tab (panel value `backpack`, selected by data-value). */
  async openInventoryTab(): Promise<void> {
    await this.page.locator('[role="tab"][data-value="backpack"]').click()
  }

  /** The backpack item row, matched by its user-provided name (locale-stable). */
  rowByName(name: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: name })
  }

  /** Add an item to the backpack via the modal; resolves when the POST succeeds. */
  async addItem(name: string): Promise<void> {
    await this.page.getByTestId('inventory-add-item-backpack').click()
    await this.page.locator('#item-modal-name').fill(name)
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          new URL(r.url()).pathname.endsWith('/inventory/items') &&
          r.ok(),
      ),
      this.page.getByTestId('inventory-item-confirm').click(),
    ])
  }

  /** Rename an item via its edit modal; resolves when the PATCH succeeds. */
  async renameItem(currentName: string, nextName: string): Promise<void> {
    await this.rowByName(currentName).getByTestId('inventory-item-edit').click()
    await this.page.locator('#item-modal-name').fill(nextName)
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' &&
          new URL(r.url()).pathname.includes('/inventory/items/') &&
          r.ok(),
      ),
      this.page.getByTestId('inventory-item-confirm').click(),
    ])
  }

  /** Delete an item by name (no confirm modal); resolves when the DELETE succeeds. */
  async deleteItem(name: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'DELETE' &&
          new URL(r.url()).pathname.includes('/inventory/items/') &&
          r.ok(),
      ),
      this.rowByName(name).getByTestId('inventory-item-delete').click(),
    ])
  }
}
