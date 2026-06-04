import type { Locator, Page } from '@playwright/test'
import { waitHydrated } from '../helpers/hydrate'

/**
 * Thin page object for the character vertical slice: it hides selectors and
 * navigation only — no assertions (those live in the spec).
 *
 * Selector policy (see e2e/README.md): stable, non-i18n hooks first —
 *   - form inputs by their existing element ids (`#char-name`, `#prof-0`)
 *   - list rows / per-row delete by accessible name, where the name segment is
 *     the user-provided character name (locale-stable, not a translated string)
 *   - the purely-i18n action buttons carry `data-testid` instead.
 */
export class CharacterListPom {
  constructor(private readonly page: Page) {}

  async gotoList(): Promise<void> {
    await this.page.goto('/character')
    await waitHydrated(this.page)
  }

  async gotoBuild(): Promise<void> {
    await this.page.goto('/character/build')
    await waitHydrated(this.page)
  }

  async gotoUpdate(id: string): Promise<void> {
    await this.page.goto(`/character/${id}/update`)
    await waitHydrated(this.page)
  }

  /** Full reload then wait for re-hydration (used to prove DB persistence). */
  async reload(): Promise<void> {
    await this.page.reload()
    await waitHydrated(this.page)
  }

  /** Name input is shared by build and update forms (CharacterInfoSection #char-name). */
  async fillName(name: string): Promise<void> {
    await this.page.locator('#char-name').fill(name)
  }

  /** Open the primary-class combobox and pick the first available class. */
  async selectFirstClass(): Promise<void> {
    await this.page.getByTestId('character-primary-class-select').getByRole('combobox').click()
    await this.page.getByRole('option').first().click()
  }

  /** Submit the build form and confirm the modal; resolves when create POST succeeds. */
  async submitBuild(): Promise<void> {
    await this.page.getByTestId('character-build-submit').click()
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          new URL(r.url()).pathname.endsWith('/characters') &&
          r.ok(),
      ),
      this.page.getByTestId('character-build-confirm').click(),
    ])
  }

  /** Save the update form; resolves when the PATCH succeeds. */
  async submitUpdate(id: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' &&
          new URL(r.url()).pathname.endsWith(`/characters/${id}`) &&
          r.ok(),
      ),
      this.page.getByTestId('character-update-submit').click(),
    ])
  }

  /** The list row (link) for a character, matched by its user-provided name. */
  rowByName(name: string): Locator {
    return this.page.getByRole('link', { name })
  }

  /** Resolve a character's id from its row link href (`/character/<id>`). */
  async idByName(name: string): Promise<string> {
    const href = await this.rowByName(name).getAttribute('href')
    const id = href?.split('/').pop()
    if (!id) throw new Error(`could not resolve character id from row href: ${href}`)
    return id
  }

  async enterDeleteMode(): Promise<void> {
    await this.page.getByTestId('character-delete-mode-toggle').click()
  }

  /** Click the per-row delete button (accessible name carries the character name). */
  async clickDelete(name: string): Promise<void> {
    await this.page.getByRole('button', { name }).click()
  }

  /** Confirm the delete modal; resolves when the DELETE succeeds. */
  async confirmDelete(id: string): Promise<void> {
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
}
