import type { Page } from '@playwright/test'

/**
 * Fill a field, then drain one animation frame before returning.
 *
 * `CommonAppInput` defaults to `selectOnFocus`, implemented as
 * `requestAnimationFrame(() => target.select())` on focus (`app/components/common/AppInput.vue`).
 * `select()` focuses the input in Chromium, so a *pending* callback fires after
 * focus has already moved on and yanks it back. Playwright's `fill()` types into
 * whatever is focused at that moment, so two back-to-back fills — which land
 * ~5ms apart, well inside one 16ms frame — can send the second field's text into
 * the first field. That reproduces as a flaky "the edit went into the wrong
 * column" failure, and it is why every multi-field fill goes through here.
 *
 * Not a product bug worth a production change: a real user cannot move focus
 * between two fields inside a single frame, so the deferred `select()` always
 * fires while its own input still holds focus.
 */
export async function fillSettled(page: Page, selector: string, value: string): Promise<void> {
  await page.locator(selector).fill(value)
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))))
}
