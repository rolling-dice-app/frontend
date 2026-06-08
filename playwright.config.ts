import { defineConfig, devices } from '@playwright/test'
import { BACKEND_ORIGIN, FRONTEND_ORIGIN, FRONTEND_PORT } from './e2e/helpers/env'

/**
 * Local-stage e2e config. A throwaway Postgres + backend process is brought up
 * once by global-setup; the Nuxt dev server is managed by `webServer`. Isolation
 * is per-test (each test seeds its own user) rather than per-worker, so a single
 * worker shares one backend process without boot contention.
 *
 * The dev server runs on a dedicated port (FRONTEND_PORT, default 3100) pointed at
 * the harness backend (BACKEND_ORIGIN), so a developer's normal `pnpm dev` stack on
 * 3000/3001 is never reused or collided with.
 */
export default defineConfig({
  testDir: 'e2e/specs',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // One retry in CI buys a flake buffer for the merge-gate and is what makes
  // `trace: 'on-first-retry'` actually fire (the retry captures a trace for the
  // failure artifact). Locally stays 0 so a failure surfaces immediately.
  retries: process.env.CI ? 1 : 0,
  // CI also emits an HTML report (uploaded as an artifact); locally the list
  // reporter is enough.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: FRONTEND_ORIGIN,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm dev --port ${FRONTEND_PORT}`,
    url: FRONTEND_ORIGIN,
    env: { NUXT_PUBLIC_API_BASE: BACKEND_ORIGIN },
    // Never reuse: the env above only applies when Playwright starts the server, so a
    // reused one would keep its old API base. Fresh start also fails loud if :3100 is taken.
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
