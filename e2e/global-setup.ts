import { writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { execa } from 'execa'
import { backendDir, buildBackendEnv, BACKEND_HEALTHZ_URL, BACKEND_PORT } from './helpers/env'
import { RUNTIME_FILE } from './helpers/db'
import { getStack } from './helpers/stack'
import { teardownStack } from './global-teardown'

const HEALTHZ_TIMEOUT_MS = 30_000
const HEALTHZ_INTERVAL_MS = 500

/** Fail fast if the harness backend port is taken — otherwise we could silently run
 *  the whole suite against a foreign backend (wrong DB), which looks healthy but has
 *  none of our seeded sessions. */
function assertPortFree(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', (err: NodeJS.ErrnoException) => {
      probe.close()
      reject(
        err.code === 'EADDRINUSE'
          ? new Error(
              `port ${port} is already in use. Stop whatever is listening there (e.g. a dev backend) or set E2E_BACKEND_PORT.`,
            )
          : err,
      )
    })
    probe.once('listening', () => probe.close(() => resolve()))
    probe.listen(port, '0.0.0.0')
  })
}

async function waitForHealthz(deadline: number): Promise<void> {
  for (;;) {
    try {
      const res = await fetch(BACKEND_HEALTHZ_URL)
      if (res.ok) return
    } catch {
      // backend not listening yet
    }
    if (Date.now() > deadline)
      throw new Error(`backend /healthz not ready within ${HEALTHZ_TIMEOUT_MS}ms`)
    await new Promise((r) => setTimeout(r, HEALTHZ_INTERVAL_MS))
  }
}

/**
 * Brings up the throwaway stack once for the whole run:
 *   1. start a disposable postgres:16 container (random host port — never Neon)
 *   2. apply committed migrations via the backend's drizzle-kit
 *   3. spawn the backend with `tsx src/index.ts` (no build step)
 *   4. poll /healthz until it answers, racing against an early backend crash
 *   5. hand DATABASE_URL to the test side via e2e/.runtime.json
 *
 * Any failure tears down whatever already started, so a half-built stack never leaks.
 */
export default async function globalSetup(): Promise<void> {
  const stack = getStack()
  try {
    await assertPortFree(BACKEND_PORT)

    const container = await new PostgreSqlContainer('postgres:16').start()
    stack.container = container
    const databaseUrl = container.getConnectionUri()

    const cwd = backendDir()
    await execa('pnpm', ['exec', 'drizzle-kit', 'migrate'], {
      cwd,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    })

    // Seed the SRD spell catalog so spell flows (learn / forget / prepare) have a
    // catalog to reference. Idempotent upsert, run once per stack. Uses the full
    // backend env because seed-spells.ts imports src/db/client.ts → config/env.ts,
    // which validates the whole schema at import (unlike drizzle-kit, which only
    // reads DATABASE_URL).
    await execa('pnpm', ['exec', 'tsx', 'scripts/seed-spells.ts'], {
      cwd,
      env: buildBackendEnv(databaseUrl),
      stdio: 'inherit',
    })

    // `detached` makes the backend its own process-group leader so teardown can
    // signal the whole tree (`pnpm exec` → `tsx` → node), not just the `pnpm` child.
    const backend = execa('pnpm', ['exec', 'tsx', 'src/index.ts'], {
      cwd,
      env: buildBackendEnv(databaseUrl),
      stdout: 'inherit',
      stderr: 'inherit',
      detached: true,
    })
    stack.backend = backend

    // Race readiness against an early exit so a crashed backend fails loudly instead
    // of hanging the healthz poll for 30s.
    const exited = backend.then(
      () => Promise.reject(new Error('backend process exited before /healthz became ready')),
      (err) => Promise.reject(new Error(`backend process failed to start: ${String(err)}`)),
    )
    await Promise.race([waitForHealthz(Date.now() + HEALTHZ_TIMEOUT_MS), exited])
    // healthz won the race; the backend stays alive until teardown kills it, so mark
    // the now-irrelevant `exited` rejection as handled to avoid an unhandled rejection.
    void exited.catch(() => undefined)

    writeFileSync(RUNTIME_FILE, JSON.stringify({ databaseUrl }), 'utf8')
  } catch (err) {
    await teardownStack()
    throw err
  }
}
