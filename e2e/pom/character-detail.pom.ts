import type { Locator, Page } from '@playwright/test'
import { waitHydrated } from '../helpers/hydrate'

/**
 * Thin page object for the character detail read page (`/character/:id`). The
 * page fetches its character client-only (`useAsyncData(..., { server: false })`)
 * so private data never lands in the SSR HTML / payload — this POM exposes both
 * the raw SSR document (for the privacy guard) and the hydrated name probe.
 *
 * Selector policy (see e2e/README.md): the character name by the PageHeader
 * `<h2>` heading (locale-stable user data). No production edit is needed.
 */
export class CharacterDetailPom {
  constructor(private readonly page: Page) {}

  async gotoDetail(id: string): Promise<void> {
    await this.page.goto(`/character/${id}`)
    await waitHydrated(this.page)
  }

  /**
   * The raw SSR document for the detail route, fetched without running client JS
   * (a plain HTTP GET carrying the context's session cookie). Used to assert that
   * private character data is absent from the server-rendered payload.
   */
  async rawSsrHtml(id: string): Promise<string> {
    const res = await this.page.request.get(`/character/${id}`)
    return res.text()
  }

  /** The character-name heading (PageHeader `<h2>`); a client-load success probe. */
  nameHeading(name: string): Locator {
    return this.page.getByRole('heading', { name, level: 2 })
  }
}
