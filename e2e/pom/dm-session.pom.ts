import type { CurrencyKey } from '@rolling-dice-app/core'
import type { Locator, Page } from '@playwright/test'
import { fillSettled } from '../helpers/form'
import { waitHydrated } from '../helpers/hydrate'

/**
 * Thin page object for the DM session-container / session-log vertical slice: it
 * hides selectors and navigation only — no assertions (those live in the spec).
 *
 * Selector policy (see e2e/README.md): stable, non-i18n hooks first —
 *   - modal / form fields by their existing element ids
 *     (`#dm-session-container-title`, `#dm-session-log-title`, `#dm-session-log-content`)
 *   - list cards, the timeline's "add log" link and the detail pages' edit links
 *     by their `href` (route shape, not a translated string)
 *   - only the i18n-only action buttons carry `data-testid` (`dm-session-add`,
 *     `dm-session-container-confirm`, per-row `dm-session-delete`,
 *     `dm-session-delete-confirm`, `dm-session-log-save`).
 */
export class DmSessionPom {
  constructor(private readonly page: Page) {}

  async gotoList(): Promise<void> {
    await this.page.goto('/dm/session')
    await waitHydrated(this.page)
  }

  /** Full reload then wait for re-hydration (used to prove DB persistence). */
  async reload(): Promise<void> {
    await this.page.reload()
    await waitHydrated(this.page)
  }

  // ── container ─────────────────────────────────────────────────────────────

  /**
   * Quick-create a container: the list page opens a title modal (there is no
   * `/dm/session/create` route) and navigates straight into the new container's
   * detail page on success, so this resolves once we are on that page.
   */
  async createContainer(title: string): Promise<string> {
    await this.page.getByTestId('dm-session-add').click()
    await this.page.locator('#dm-session-container-title').fill(title)
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          new URL(r.url()).pathname.endsWith('/dm-session-containers') &&
          r.ok(),
      ),
      this.page.getByTestId('dm-session-container-confirm').click(),
    ])
    await this.page.waitForURL(/\/dm\/session\/[0-9a-f-]+$/)
    const id = new URL(this.page.url()).pathname.split('/').pop()
    if (!id) throw new Error(`could not resolve container id from url: ${this.page.url()}`)
    return id
  }

  /**
   * The list card link for a container. Scoped to `<main>` so the BottomNavDrawer
   * (teleported outside it) can never match; the title segment is user data, so
   * it is locale-stable.
   */
  rowByTitle(title: string): Locator {
    return this.page.locator('main').getByRole('link', { name: title })
  }

  /** The container / log detail heading (PageHeader `<h2>`), a non-i18n identity probe. */
  detailHeading(name: string): Locator {
    return this.page.getByRole('heading', { name, level: 2 })
  }

  async gotoContainer(id: string): Promise<void> {
    await this.page.goto(`/dm/session/${id}`)
    await waitHydrated(this.page)
  }

  /**
   * Click a card's delete button. Pinned by testid (the verb) + the container
   * title in its `aria-label` (the row), so no grid-DOM nesting is assumed.
   */
  async clickDeleteContainer(title: string): Promise<void> {
    await this.page.locator(`[data-testid="dm-session-delete"][aria-label*="${title}"]`).click()
  }

  /** Confirm the container delete modal; resolves when the DELETE succeeds. */
  async confirmDeleteContainer(id: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'DELETE' &&
          new URL(r.url()).pathname.endsWith(`/dm-session-containers/${id}`) &&
          r.ok(),
      ),
      this.page.getByTestId('dm-session-delete-confirm').click(),
    ])
  }

  // ── session log ───────────────────────────────────────────────────────────

  /**
   * Open the log create form from the container detail page. Both the empty-state
   * card and the timeline's trailing tile are `NuxtLink`s to the same route, so
   * the href matches whichever one is rendered — no testid needed.
   */
  async clickAddLog(containerId: string): Promise<void> {
    await this.page.locator(`main a[href="/dm/session/${containerId}/log/create"]`).click()
    await this.page.waitForURL(`/dm/session/${containerId}/log/create`)
  }

  /**
   * Fill the log fields the slice asserts on (date is prefilled with today).
   * Goes through `fillSettled` — see its doc for why back-to-back fills must not
   * share an animation frame.
   */
  async fillLog({ title, content }: { title: string; content?: string }): Promise<void> {
    await fillSettled(this.page, '#dm-session-log-title', title)
    if (content !== undefined) await fillSettled(this.page, '#dm-session-log-content', content)
  }

  /** A log form field, for reading a value back after a reload. */
  logField(id: 'dm-session-log-title' | 'dm-session-log-content'): Locator {
    return this.page.locator(`#${id}`)
  }

  /**
   * Save the log create form; the page navigates to the freshly written log's
   * detail page (deliberately *not* back to the container), so the new log id is
   * read off the resulting URL.
   */
  async saveLogCreate(containerId: string): Promise<string> {
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          new URL(r.url()).pathname.endsWith(
            `/dm-session-containers/${containerId}/session-logs`,
          ) &&
          r.ok(),
      ),
      this.page.getByTestId('dm-session-log-save').click(),
    ])
    await this.page.waitForURL(new RegExp(`/dm/session/${containerId}/log/[0-9a-f-]+$`))
    const logId = new URL(this.page.url()).pathname.split('/').pop()
    if (!logId) throw new Error(`could not resolve log id from url: ${this.page.url()}`)
    return logId
  }

  /** Save the log update form; resolves when the PATCH succeeds and detail is back. */
  async saveLogUpdate(containerId: string, logId: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' &&
          new URL(r.url()).pathname.endsWith(
            `/dm-session-containers/${containerId}/session-logs/${logId}`,
          ) &&
          r.ok(),
      ),
      this.page.getByTestId('dm-session-log-save').click(),
    ])
    await this.page.waitForURL(`/dm/session/${containerId}/log/${logId}`)
  }

  /** The timeline entry link for a log, matched by its route (not its i18n seq badge). */
  timelineEntry(containerId: string, logId: string): Locator {
    return this.page.locator(`main a[href="/dm/session/${containerId}/log/${logId}"]`)
  }

  /** Follow the log detail page's edit link; matched by href, not its i18n label. */
  async gotoLogUpdate(containerId: string, logId: string): Promise<void> {
    await this.page.locator(`main a[href="/dm/session/${containerId}/log/${logId}/update"]`).click()
    await this.page.waitForURL(`/dm/session/${containerId}/log/${logId}/update`)
  }

  /** Open the log create form directly (for containers seeded through the API). */
  async gotoLogCreate(containerId: string): Promise<void> {
    await this.page.goto(`/dm/session/${containerId}/log/create`)
    await waitHydrated(this.page)
  }

  /** Open a log's edit form directly, e.g. to read saved values back. */
  async gotoLogUpdateDirect(containerId: string, logId: string): Promise<void> {
    await this.page.goto(`/dm/session/${containerId}/log/${logId}/update`)
    await waitHydrated(this.page)
  }

  // ── attendance ────────────────────────────────────────────────────────────

  /**
   * A standing-roster attendance chip. The chip is a toggle button whose
   * accessible name is the member's player name (user data, locale-stable), and
   * whose `aria-pressed` carries the attending state — so no testid is needed.
   * Attendance is prefilled as "everyone attends"; the DM de-selects absentees.
   */
  attendanceChip(playerName: string): Locator {
    return this.page.getByRole('button', { name: playerName })
  }

  // ── rewards ───────────────────────────────────────────────────────────────

  /** A coin field of the log's money rewards, by its existing element id. */
  moneyField(key: CurrencyKey): Locator {
    return this.page.locator(`#dm-session-log-money-${key}`)
  }

  expField(): Locator {
    return this.page.locator('#dm-session-log-exp')
  }

  async addRewardRow(): Promise<void> {
    await this.page.getByTestId('dm-session-reward-add').click()
  }

  async removeRewardRow(): Promise<void> {
    await this.page.getByTestId('dm-session-reward-delete').click()
  }

  /**
   * An item-reward row field. All three share a translated `aria-label` that
   * repeats per row, so they are pinned by testid; the slice holds a single row,
   * so no row scoping is needed.
   */
  rewardField(kind: 'item' | 'player' | 'remark'): Locator {
    return this.page.getByTestId(`dm-session-reward-${kind}`)
  }

  /** Fill the reward row through `fillSettled` — three adjacent inputs. */
  async fillRewardRow(row: { item: string; player: string; remark: string }): Promise<void> {
    await fillSettled(this.page, '[data-testid="dm-session-reward-item"]', row.item)
    await fillSettled(this.page, '[data-testid="dm-session-reward-player"]', row.player)
    await fillSettled(this.page, '[data-testid="dm-session-reward-remark"]', row.remark)
  }

  /** Fill the numeric reward fields; `fillSettled` for the same rAF reason. */
  async fillRewardTotals({ gp, exp }: { gp: string; exp: string }): Promise<void> {
    await fillSettled(this.page, '#dm-session-log-money-gp', gp)
    await fillSettled(this.page, '#dm-session-log-exp', exp)
  }
}
