import { rmSync } from 'node:fs'
import { RUNTIME_FILE } from './helpers/db'
import { getStack } from './helpers/stack'

const KILL_TIMEOUT_MS = 5_000

/**
 * Tear down everything global-setup may have started. Written to be safe against a
 * half-built stack: every resource is collected in its own try/finally so one
 * failure never blocks the rest (and never leaves a dangling container).
 */
export async function teardownStack(): Promise<void> {
  const stack = getStack()
  try {
    if (stack.backend) {
      const backend = stack.backend
      backend.kill('SIGTERM')
      const timer = setTimeout(() => backend.kill('SIGKILL'), KILL_TIMEOUT_MS)
      try {
        await backend
      } catch {
        // expected: killed process rejects
      } finally {
        clearTimeout(timer)
      }
      stack.backend = undefined
    }
  } finally {
    try {
      if (stack.container) {
        await stack.container.stop()
        stack.container = undefined
      }
    } finally {
      rmSync(RUNTIME_FILE, { force: true })
    }
  }
}

export default async function globalTeardown(): Promise<void> {
  await teardownStack()
}
