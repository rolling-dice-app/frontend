import type { Locator, Page } from '@playwright/test'
import { waitHydrated } from '../helpers/hydrate'

/**
 * Thin page object for the trash / restore vertical slice on the character list
 * page (`/character`). The list renders Active and Trash as two @ui `Tab`s; a
 * soft-delete (`DELETE /characters/:id`) moves a card from Active to Trash and a
 * restore (`POST /characters/:id/restore`) moves it back, re-arming a per-card
 * delete cooldown (`restoredAt` + RESTORE_COOLDOWN_DAYS, pre-checked client-side).
 *
 * Selector policy (see e2e/README.md): stable, non-i18n hooks first —
 *   - the two tabs by `[role="tab"][data-value="active"|"trashed"]` (panel values,
 *     not the i18n tab labels); inactive panels are `v-show`-hidden so role
 *     queries are naturally scoped to the visible tab.
 *   - each card / its restore & delete buttons by the character name carried in
 *     their accessible name (locale-stable user data; identical in grid Card and
 *     list Item layouts).
 *   - the two purely-i18n modal confirm buttons by `data-testid`
 *     (`character-delete-confirm` / `character-restore-confirm`); the latter's
 *     label otherwise collides with each card's restore button.
 */
export class CharacterTrashPom {
  constructor(private readonly page: Page) {}

  async gotoList(): Promise<void> {
    await this.page.goto('/character')
    await waitHydrated(this.page)
  }

  async openActiveTab(): Promise<void> {
    await this.page.locator('[role="tab"][data-value="active"]').click()
  }

  async openTrashTab(): Promise<void> {
    await this.page.locator('[role="tab"][data-value="trashed"]').click()
  }

  /** A character's card link, matched by the name in its `viewLabel` aria-label. */
  rowByName(name: string): Locator {
    return this.page.getByRole('link', { name })
  }

  /** Toggle the Active tab's delete mode, revealing each card's delete button. */
  async enterDeleteMode(): Promise<void> {
    await this.page.getByTestId('character-delete-mode-toggle').click()
  }

  /** The per-card delete button (only in delete mode); disabled while in cooldown. */
  deleteButton(name: string): Locator {
    return this.page.getByRole('button', { name })
  }

  /** The per-card restore button (only on the Trash tab). */
  restoreButton(name: string): Locator {
    return this.page.getByRole('button', { name })
  }

  /** Open the delete confirm modal for a card and confirm; awaits the soft-delete. */
  async deleteByName(name: string, id: string): Promise<void> {
    await this.deleteButton(name).click()
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'DELETE' &&
          new URL(r.url()).pathname.endsWith(`/characters/${id}`) &&
          r.ok(),
      ),
      this.page.getByTestId('character-delete-confirm').click(),
    ])
  }

  /** Open the restore confirm modal for a card and confirm; awaits the restore POST. */
  async restoreByName(name: string, id: string): Promise<void> {
    // `force`: the restore button lives inside the card's NuxtLink, which carries
    // `aria-disabled="true"` in trashed mode (the card isn't a nav target). Playwright
    // inherits that to the button and refuses the click, but the button is real and
    // works for mouse users (it `@click.prevent.stop`s) — bypass the inherited check.
    await this.restoreButton(name).click({ force: true })
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          new URL(r.url()).pathname.endsWith(`/characters/${id}/restore`) &&
          r.ok(),
      ),
      this.page.getByTestId('character-restore-confirm').click(),
    ])
  }

  /** Full reload then wait for re-hydration (used to prove DB persistence). */
  async reload(): Promise<void> {
    await this.page.reload()
    await waitHydrated(this.page)
  }
}
