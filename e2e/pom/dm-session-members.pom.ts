import type { Locator, Page } from '@playwright/test'
import { FRONTEND_ORIGIN } from '../helpers/env'
import { fillSettled } from '../helpers/form'

/**
 * Thin page object for the DM session container's standing member roster
 * (`MemberEditModal`, reached from the container detail page's info card).
 *
 * Selector policy (see e2e/README.md): stable, non-i18n hooks first —
 *   - the roster chip by its `href="/share/:shareId"` (route shape, not a label)
 *   - the modal's row fields and its two action buttons by `data-testid`: every
 *     row field is labelled by a translated `aria-label` that repeats per row,
 *     and the add / confirm buttons are i18n-only
 *   - the per-row delete button by the player name in its `aria-label` (user
 *     data); it is a `button`, so it can never collide with the roster chip link
 *
 * The slice only ever holds one row, so the field selectors are unqualified
 * rather than assuming a row-nesting shape.
 */
const PLAYER_NAME = '[data-testid="dm-session-member-player-name"]'
const CHARACTER_NAME = '[data-testid="dm-session-member-character-name"]'
const LINK = '[data-testid="dm-session-member-link"]'

export class DmSessionMembersPom {
  constructor(private readonly page: Page) {}

  /** Open the roster modal from the container detail page's info card. */
  async openModal(): Promise<void> {
    await this.page.getByTestId('dm-session-edit-members').click()
  }

  async addRow(): Promise<void> {
    await this.page.getByTestId('dm-session-member-add').click()
  }

  playerNameField(): Locator {
    return this.page.locator(PLAYER_NAME)
  }

  characterNameField(): Locator {
    return this.page.locator(CHARACTER_NAME)
  }

  async fillPlayerName(value: string): Promise<void> {
    await fillSettled(this.page, PLAYER_NAME, value)
  }

  /**
   * Paste a share link into the row and commit it. `onLinkCommit` fires on blur
   * (or Enter) only — not on input — so the field is committed with Enter, and
   * the resolve POST is awaited because the character name and the read-only
   * player-name snapshot only land once it resolves.
   */
  async linkCharacter(shareId: string): Promise<void> {
    await fillSettled(this.page, LINK, `${FRONTEND_ORIGIN}/share/${shareId}`)
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          new URL(r.url()).pathname.endsWith('/share/characters/resolve') &&
          r.ok(),
      ),
      this.page.locator(LINK).press('Enter'),
    ])
  }

  /** Remove a row via its trash button, matched by the player name it carries. */
  async removeRow(playerName: string): Promise<void> {
    await this.page.getByRole('button', { name: playerName }).click()
  }

  /** Confirm the modal; resolves once the container PATCH succeeds. */
  async confirm(containerId: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' &&
          new URL(r.url()).pathname.endsWith(`/dm-session-containers/${containerId}`) &&
          r.ok(),
      ),
      this.page.getByTestId('dm-session-members-confirm').click(),
    ])
  }

  /**
   * The info card's roster chip for a linked member. A linked chip is a link to
   * the public share page, so its href is a locale-stable identity probe.
   */
  chip(shareId: string): Locator {
    return this.page.locator(`main a[href="/share/${shareId}"]`)
  }
}
