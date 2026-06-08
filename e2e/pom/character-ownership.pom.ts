import type { Locator, Page } from '@playwright/test'
import { waitHydrated } from '../helpers/hydrate'

/**
 * Thin page object for the ownership-privacy slice (detail + update pages).
 * Selector policy (see e2e/README.md): NotFound is probed by its back-to-list
 * link `a[href="/character"]`, scoped to `<main>` so it can't match the
 * BottomNavDrawer's same-href nav item (teleported outside `<main>`).
 */
export class CharacterOwnershipPom {
  constructor(private readonly page: Page) {}

  async gotoDetail(id: string): Promise<void> {
    await this.page.goto(`/character/${id}`)
    await waitHydrated(this.page)
  }

  async gotoUpdate(id: string): Promise<void> {
    await this.page.goto(`/character/${id}/update`)
    await waitHydrated(this.page)
  }

  /** The CommonNotFound back-to-list link, scoped to `<main>` (excludes the nav drawer). */
  notFound(): Locator {
    return this.page.getByRole('main').locator('a[href="/character"]')
  }

  /** The character-name heading (PageHeader `<h2>`); stays hidden for a non-owner. */
  nameHeading(name: string): Locator {
    return this.page.getByRole('heading', { name, level: 2 })
  }
}
