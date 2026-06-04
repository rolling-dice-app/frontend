import { randomBytes } from 'node:crypto'

/**
 * Dedicated harness ports, deliberately off the default dev ports (3000/3001) so a
 * running local dev stack never collides with — or worse, gets silently used by —
 * the e2e run. Cookie host-sharing is port-agnostic (host=localhost), so isolation
 * across these ports is preserved. Override via env if these clash too.
 */
export const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? 3100)
export const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? 3101)

export const FRONTEND_ORIGIN = `http://localhost:${FRONTEND_PORT}`
export const BACKEND_ORIGIN = `http://localhost:${BACKEND_PORT}`
export const BACKEND_HEALTHZ_URL = `http://127.0.0.1:${BACKEND_PORT}/healthz`

/**
 * Backend dummy env, single source of truth for the throwaway stack.
 *
 * Every field below is required by `backend/src/config/env.ts` (zod). A missing
 * or malformed value makes the backend `process.exit(1)` at boot, which surfaces
 * here as a `/healthz` poll timeout — so keep this aligned with that schema.
 *
 * NODE_ENV='test' deliberately skips the production-only TRUSTED_EDGE requirement.
 * R2_* and GOOGLE_OAUTH_* are unconditionally required by the schema but are never
 * actually contacted by the character CRUD flow, so dummy values are safe.
 */
export function buildBackendEnv(databaseUrl: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(BACKEND_PORT),
    DATABASE_URL: databaseUrl,
    // schema requires min(32)
    COOKIE_SECRET: randomBytes(24).toString('hex'),
    BACKEND_BASE_URL: BACKEND_ORIGIN,
    FRONTEND_BASE_URL: FRONTEND_ORIGIN,
    // must pass requireSameOrigin against the Nuxt dev origin
    CORS_ALLOWED_ORIGINS: FRONTEND_ORIGIN,
    GOOGLE_OAUTH_CLIENT_ID: 'dummy',
    GOOGLE_OAUTH_CLIENT_SECRET: 'dummy',
    R2_ACCOUNT_ID: 'dummy',
    R2_ACCESS_KEY_ID: 'dummy',
    R2_SECRET_ACCESS_KEY: 'dummy',
    R2_BUCKET_NAME: 'dummy',
    // schema: valid https URL, no trailing slash
    R2_PUBLIC_URL_BASE: 'https://r2.e2e.invalid',
  }
}

/** Backend source dir; override with BACKEND_DIR env when the layout differs. */
export function backendDir(): string {
  return process.env.BACKEND_DIR ?? new URL('../../../backend', import.meta.url).pathname
}
