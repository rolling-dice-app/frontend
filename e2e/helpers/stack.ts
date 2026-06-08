import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { ResultPromise } from 'execa'

/**
 * Handoff of live resources from global-setup to global-teardown. Playwright runs
 * both in the same Node process, so a module-level singleton survives between them
 * (the container handle and child process can't be serialized through .runtime.json).
 */
export interface E2EStack {
  container?: StartedPostgreSqlContainer
  backend?: ResultPromise
}

const KEY = '__RD_E2E_STACK__'

export function getStack(): E2EStack {
  const g = globalThis as Record<string, unknown>
  if (!g[KEY]) g[KEY] = {} as E2EStack
  return g[KEY] as E2EStack
}
