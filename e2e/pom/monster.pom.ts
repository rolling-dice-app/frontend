import type { Locator, Page } from '@playwright/test'
import { fillSettled } from '../helpers/form'
import { waitHydrated } from '../helpers/hydrate'

/**
 * Thin page object for the monster-template vertical slice: it hides selectors
 * and navigation only — no assertions (those live in the spec).
 *
 * Selector policy (see e2e/README.md): stable, non-i18n hooks first —
 *   - form fields by their existing element ids (`#monster-name` / `#monster-hp`
 *     / `#monster-ac`, from `monster-form/BasicTab.vue`)
 *   - list cards / the detail page's edit link by their `href` (route shape, not
 *     a translated string)
 *   - only the i18n-only action buttons carry `data-testid` (`monster-add`,
 *     per-row `monster-delete`, `monster-delete-confirm`, `monster-save`).
 */
export class MonsterPom {
  constructor(private readonly page: Page) {}

  async gotoList(): Promise<void> {
    await this.page.goto('/dm/monster')
    await waitHydrated(this.page)
  }

  /** Full reload then wait for re-hydration (used to prove DB persistence). */
  async reload(): Promise<void> {
    await this.page.reload()
    await waitHydrated(this.page)
  }

  /**
   * Open the create form. The empty-state hero and the grid tile are mutually
   * exclusive branches of the same `v-if` chain, so they share one testid and
   * only ever one is in the DOM.
   */
  async clickAdd(): Promise<void> {
    await this.page.getByTestId('monster-add').click()
    await this.page.waitForURL('/dm/monster/create')
  }

  /**
   * Fill the identity fields the slice asserts on. Only `name` is required by
   * the form (`canSubmit` = non-empty name); `hp` / `ac` are filled to give the
   * update round-trip a numeric field to prove persistence with.
   *
   * Goes through `fillSettled` — see its doc for why back-to-back fills must not
   * share an animation frame.
   */
  async fillBasics({ name, hp, ac }: { name: string; hp?: number; ac?: number }): Promise<void> {
    await fillSettled(this.page, '#monster-name', name)
    if (hp !== undefined) await fillSettled(this.page, '#monster-hp', String(hp))
    if (ac !== undefined) await fillSettled(this.page, '#monster-ac', String(ac))
  }

  /** A form field, for reading a value back after a reload. */
  field(id: 'monster-name' | 'monster-hp' | 'monster-ac'): Locator {
    return this.page.locator(`#${id}`)
  }

  /**
   * Save the create form; resolves once the POST succeeded *and* the page has
   * navigated back to the list (the page navigates on success, so waiting for
   * the URL keeps the caller from racing the redirect).
   */
  async saveCreate(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          new URL(r.url()).pathname.endsWith('/monster-templates') &&
          r.ok(),
      ),
      this.page.getByTestId('monster-save').click(),
    ])
    await this.page.waitForURL('/dm/monster')
  }

  /** Save the update form; resolves when the PATCH succeeds and the list is back. */
  async saveUpdate(id: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' &&
          new URL(r.url()).pathname.endsWith(`/monster-templates/${id}`) &&
          r.ok(),
      ),
      this.page.getByTestId('monster-save').click(),
    ])
    await this.page.waitForURL('/dm/monster')
  }

  /**
   * The list card link for a monster. Scoped to `<main>` so the BottomNavDrawer
   * (teleported outside it, and carrying a `/dm/monster` href of its own) can
   * never match; the name segment is user data, so it is locale-stable.
   */
  rowByName(name: string): Locator {
    return this.page.locator('main').getByRole('link', { name })
  }

  /** Resolve a monster's id from its card href (`/dm/monster/<id>`). */
  async idByName(name: string): Promise<string> {
    const href = await this.rowByName(name).getAttribute('href')
    const id = href?.split('/').pop()
    if (!id) throw new Error(`could not resolve monster id from card href: ${href}`)
    return id
  }

  /** Open a monster's detail page by clicking its list card. */
  async openDetail(name: string, id: string): Promise<void> {
    await this.rowByName(name).click()
    await this.page.waitForURL(`/dm/monster/${id}`)
  }

  /** The detail page's name heading (PageHeader `<h2>`), a non-i18n identity probe. */
  detailHeading(name: string): Locator {
    return this.page.getByRole('heading', { name, level: 2 })
  }

  /** Follow the detail page's edit link; matched by href, not its i18n label. */
  async gotoUpdateFromDetail(id: string): Promise<void> {
    await this.page.locator(`main a[href="/dm/monster/${id}/update"]`).click()
    await this.page.waitForURL(`/dm/monster/${id}/update`)
  }

  /**
   * Click a card's delete button. Pinned by testid (the verb) + the monster name
   * in its `aria-label` (the row), so no grid-DOM nesting is assumed.
   */
  async clickDelete(name: string): Promise<void> {
    await this.page.locator(`[data-testid="monster-delete"][aria-label*="${name}"]`).click()
  }

  /** Confirm the delete modal; resolves when the DELETE succeeds. */
  async confirmDelete(id: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'DELETE' &&
          new URL(r.url()).pathname.endsWith(`/monster-templates/${id}`) &&
          r.ok(),
      ),
      this.page.getByTestId('monster-delete-confirm').click(),
    ])
  }
}
