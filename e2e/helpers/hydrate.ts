import { expect, type Page } from '@playwright/test'

/**
 * Wait until the Nuxt app has hydrated on the client.
 *
 * SSR serves an interactive-looking but not-yet-wired DOM: a click landing before
 * hydration is a silent no-op (the toggle handler isn't attached yet), and a fill
 * sets a DOM value the not-yet-mounted v-model never sees. Vue sets `__vue_app__`
 * on the mount container (`#__nuxt`) once the app is mounted/hydrated, so that flag
 * is a reliable "now interactive" signal — used after every full document load.
 */
export async function waitHydrated(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const root = document.querySelector('#__nuxt') as
            | (Element & { __vue_app__?: unknown })
            | null
          return !!root?.__vue_app__
        }),
      { timeout: 15_000 },
    )
    .toBe(true)
}
