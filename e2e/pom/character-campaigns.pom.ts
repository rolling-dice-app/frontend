import type { Locator, Page } from '@playwright/test'
import { waitHydrated } from '../helpers/hydrate'

/**
 * Thin page object for the campaign-records vertical slice: character detail page
 * → campaigns tab → add / edit / delete a record via its modal (single page,
 * single trigger model — every verb is a form submit). No assertions (those live
 * in the spec).
 *
 * Selector policy (see e2e/README.md): stable, non-i18n hooks first —
 *   - the campaigns tab by its `data-value="campaigns"` (not i18n-bound)
 *   - the record row by accessible name, where the matched segment is the
 *     user-provided title (locale-stable user data)
 *   - the modal title / content fields by their existing element ids
 *     `#campaign-title` / `#campaign-content`
 *   - the purely-i18n action elements (add / confirm / per-row edit / delete)
 *     carry `data-testid` instead, because their only other handle is a
 *     translated string and the edit/delete pair share the title in their
 *     aria-label (so the title alone can't disambiguate them).
 */
export class CharacterCampaignsPom {
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

  /** Activate the campaigns tab (panel value `campaigns`, selected by data-value). */
  async openCampaignsTab(): Promise<void> {
    await this.page.locator('[role="tab"][data-value="campaigns"]').click()
  }

  /** A record's title heading; the presence probe for the row (exact, so a base
   *  title doesn't also match its `<base>-edited` rename). */
  rowByTitle(title: string): Locator {
    return this.page.getByRole('heading', { name: title, exact: true })
  }

  /** The per-row edit / delete control: the testid pins the verb, the title in the
   *  aria-label pins the row — no dependence on the accordion's DOM nesting. */
  private rowAction(testid: string, title: string): Locator {
    return this.page.locator(`[data-testid="${testid}"][aria-label*="${title}"]`)
  }

  /** Add a record via the modal; resolves when the POST succeeds. */
  async addRecord(title: string, content: string): Promise<void> {
    await this.page.getByTestId('campaign-add-record').click()
    await this.fillForm(title, content)
    await this.confirmAwaiting('POST', (pathname) => pathname.endsWith('/campaign-records'))
  }

  /** Edit a record's title via its modal; resolves when the PATCH succeeds. */
  async editRecord(currentTitle: string, nextTitle: string): Promise<void> {
    await this.rowAction('campaign-record-edit', currentTitle).click()
    await this.page.locator('#campaign-title').fill(nextTitle)
    await this.confirmAwaiting('PATCH', (pathname) => pathname.includes('/campaign-records/'))
  }

  /** Delete a record by title (no confirm modal); resolves when the DELETE succeeds. */
  async deleteRecord(title: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'DELETE' &&
          new URL(r.url()).pathname.includes('/campaign-records/') &&
          r.ok(),
      ),
      this.rowAction('campaign-record-delete', title).click(),
    ])
  }

  private async fillForm(title: string, content: string): Promise<void> {
    await this.page.locator('#campaign-title').fill(title)
    await this.page.locator('#campaign-content').fill(content)
  }

  private async confirmAwaiting(
    method: string,
    matchPath: (pathname: string) => boolean,
  ): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) => r.request().method() === method && matchPath(new URL(r.url()).pathname) && r.ok(),
      ),
      this.page.getByTestId('campaign-record-confirm').click(),
    ])
  }
}
