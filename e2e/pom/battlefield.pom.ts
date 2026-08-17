import type { Locator, Page } from '@playwright/test'
import { fillSettled } from '../helpers/form'
import { waitHydrated } from '../helpers/hydrate'

/**
 * Thin page object for the DM battlefield: the entry list (`/dm/battlefield`,
 * one card per DM session that can host a battlefield) and the workspace
 * (`/dm/battlefield/:id`).
 *
 * Selector policy (see e2e/README.md): stable, non-i18n hooks first —
 *   - combat rows by `data-unit-name` (user data mirrored onto the row) and
 *     roster rows by `battlefield-roster-row` + the name they render
 *   - the setup drawer's tabs by `data-tab` (mirrors `@ui` Tabs' `data-value`)
 *   - the ad-hoc unit fields by their element ids (`#battlefield-adhoc-*`)
 *   - `data-testid` only on the i18n-only buttons, each per-row one pinned by
 *     testid (the verb) + `aria-label*=<name>` (the row)
 *
 * Persistence is a debounced PATCH of the whole `units` projection followed by a
 * re-GET that refreshes the optimistic-lock token, so any assertion that
 * survives a reload has to go through `waitForPersist` first — a hard reload
 * does not run the route-leave flush.
 */
export class BattlefieldPom {
  constructor(private readonly page: Page) {}

  // ── entry list ────────────────────────────────────────────────────────────

  async gotoList(): Promise<void> {
    await this.page.goto('/dm/battlefield')
    await waitHydrated(this.page)
  }

  /** A session card's "create battlefield" button (disabled once a sibling session of the same container owns one). */
  createButton(sessionTitle: string): Locator {
    return this.page.locator(`[data-testid="battlefield-create"][aria-label*="${sessionTitle}"]`)
  }

  enterButton(sessionTitle: string): Locator {
    return this.page.locator(`[data-testid="battlefield-enter"][aria-label*="${sessionTitle}"]`)
  }

  /** Create a battlefield from a session card; resolves on the new workspace with its id. */
  async createBattlefield(sessionTitle: string): Promise<string> {
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          new URL(r.url()).pathname.endsWith('/battlefields') &&
          r.ok(),
      ),
      this.createButton(sessionTitle).click(),
    ])
    await this.page.waitForURL(/\/dm\/battlefield\/[0-9a-f-]+$/)
    const id = new URL(this.page.url()).pathname.split('/').pop()
    if (!id) throw new Error(`could not resolve battlefield id from url: ${this.page.url()}`)
    return id
  }

  async enterBattlefield(sessionTitle: string, battlefieldId: string): Promise<void> {
    await this.enterButton(sessionTitle).click()
    await this.page.waitForURL(`/dm/battlefield/${battlefieldId}`)
  }

  // ── workspace ─────────────────────────────────────────────────────────────

  async goto(battlefieldId: string): Promise<void> {
    await this.page.goto(`/dm/battlefield/${battlefieldId}`)
    await waitHydrated(this.page)
  }

  async reload(): Promise<void> {
    await this.page.reload()
    await waitHydrated(this.page)
  }

  /**
   * A unit's row in the combat list, matched on the name mirrored onto
   * `data-unit-name`. The row itself is not a button — the row holds an input and
   * two move buttons, so only the name block carries the button semantics.
   */
  unitRow(name: string): Locator {
    return this.page.locator(`[data-testid="battlefield-combat-row"][data-unit-name="${name}"]`)
  }

  /**
   * A unit's row in the left-hand roster (units on the battlefield but not in
   * the current fight). Ad-hoc units and monsters land here when a battle ends.
   */
  rosterEntry(name: string): Locator {
    return this.page.getByTestId('battlefield-roster-row').filter({ hasText: name })
  }

  /** A unit's position in the combat list, for ordering assertions. */
  async unitIndex(name: string): Promise<number> {
    // Reading the list is a one-shot evaluate with no auto-waiting, and the
    // workspace fetches client-only — so wait for the row itself first.
    await this.unitRow(name).waitFor()
    const names = await this.page
      .getByTestId('battlefield-combat-list')
      .locator('[data-testid="battlefield-combat-row"]')
      .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-unit-name') ?? ''))
    const index = names.indexOf(name)
    if (index < 0) throw new Error(`unit "${name}" is not in the combat list`)
    return index
  }

  /** Select a unit so the right-hand panel acts on it. */
  async selectUnit(name: string): Promise<void> {
    await this.unitRow(name).click()
  }

  /**
   * The row's initiative field. Both the row and the detail panel label their
   * initiative input with the same translated sentence, so the row-scoped one is
   * taken here (the row holds exactly one input).
   */
  initiativeField(name: string): Locator {
    return this.unitRow(name).locator('input')
  }

  async setInitiative(name: string, value: string): Promise<void> {
    await this.initiativeField(name).fill(value)
    await this.initiativeField(name).press('Enter')
  }

  async sortByInitiative(): Promise<void> {
    await this.page.getByTestId('battlefield-sort-initiative').click()
  }

  async nextTurn(): Promise<void> {
    await this.page.getByTestId('battlefield-next-turn').click()
  }

  /** Apply damage to the selected unit through the detail panel's HP quick controls. */
  async damageSelected(amount: string): Promise<void> {
    await this.page.getByTestId('battlefield-hp-amount').fill(amount)
    await this.page.getByTestId('battlefield-damage').click()
  }

  /**
   * The toolbar chip carrying the battle sequence and round. Both numbers are
   * mirrored onto `data-*` attributes so assertions never read a translated
   * string ("第 N 場 | Round N").
   */
  roundMeta(): Locator {
    return this.page.getByTestId('battlefield-round-meta')
  }

  /**
   * End the current battle. Ending rolls straight into the next segment
   * (sequence +1, round 1) — there is no "ended" intermediate state, so the
   * modal is a plain confirmation.
   */
  async endBattle(): Promise<void> {
    await this.page.getByTestId('battlefield-end-battle').click()
    await this.page.getByTestId('battlefield-end-battle-confirm').click()
  }

  // ── reinforcement drawer ──────────────────────────────────────────────────

  async openSetup(): Promise<void> {
    await this.page.getByTestId('battlefield-reinforce').click()
    await this.page.getByRole('dialog').waitFor()
  }

  /** Close the drawer with Escape so assertions run against the workspace. */
  async closeSetup(): Promise<void> {
    await this.page.getByRole('dialog').press('Escape')
    await this.page.getByRole('dialog').waitFor({ state: 'hidden' })
  }

  async setupTab(tab: 'members' | 'templates' | 'adhoc'): Promise<void> {
    await this.page.locator(`[role="tab"][data-tab="${tab}"]`).click()
  }

  async importMember(characterName: string): Promise<void> {
    await this.page
      .locator(`[data-testid="battlefield-import-member"][aria-label*="${characterName}"]`)
      .click()
  }

  async addTemplate(templateName: string): Promise<void> {
    await this.page
      .locator(`[data-testid="battlefield-add-template"][aria-label*="${templateName}"]`)
      .click()
  }

  /** Fill the ad-hoc unit form and create it already in combat. */
  async createAdhocUnit({ name, maxHp }: { name: string; maxHp: string }): Promise<void> {
    await fillSettled(this.page, '#battlefield-adhoc-name', name)
    await fillSettled(this.page, '#battlefield-adhoc-max-hp', maxHp)
    await this.page.getByTestId('battlefield-create-adhoc-join').click()
  }

  // ── persistence ───────────────────────────────────────────────────────────

  /**
   * Run `action` and wait until its edit has reached the database: the store
   * debounces a PATCH of the whole battlefield and then re-GETs to pick up the
   * fresh `updatedAt` lock token, so both are awaited.
   */
  async waitForPersist(battlefieldId: string, action: () => Promise<void>): Promise<void> {
    const patched = this.page.waitForResponse(
      (r) =>
        r.request().method() === 'PATCH' &&
        new URL(r.url()).pathname.endsWith(`/battlefields/${battlefieldId}`) &&
        r.ok(),
    )
    const refetched = this.page.waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        new URL(r.url()).pathname.endsWith(`/battlefields/${battlefieldId}`) &&
        r.ok(),
    )
    await action()
    await patched
    await refetched
  }

  // ── delete ────────────────────────────────────────────────────────────────

  /** Delete the battlefield (hard delete, no restore) and land back on the list. */
  async deleteBattlefield(battlefieldId: string): Promise<void> {
    await this.page.getByTestId('battlefield-delete').click()
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'DELETE' &&
          new URL(r.url()).pathname.endsWith(`/battlefields/${battlefieldId}`) &&
          r.ok(),
      ),
      this.page.getByTestId('battlefield-delete-confirm').click(),
    ])
    await this.page.waitForURL('/dm/battlefield')
  }
}
