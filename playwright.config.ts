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
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: FRONTEND_ORIGIN,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm dev --port ${FRONTEND_PORT}`,
    url: FRONTEND_ORIGIN,
    env: { NUXT_PUBLIC_API_BASE: BACKEND_ORIGIN },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
