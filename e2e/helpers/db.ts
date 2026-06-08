import { readFileSync } from 'node:fs'
import postgres from 'postgres'

/** Path of the runtime handoff file written by global-setup. */
export const RUNTIME_FILE = new URL('../.runtime.json', import.meta.url).pathname

interface Runtime {
  databaseUrl: string
}

function readRuntime(): Runtime {
  try {
    return JSON.parse(readFileSync(RUNTIME_FILE, 'utf8')) as Runtime
  } catch {
    throw new Error(
      `e2e/.runtime.json not found or unreadable. global-setup must run before the test DB client is used.`,
    )
  }
}

let client: ReturnType<typeof postgres> | undefined

/**
 * Test-side Postgres client against the throwaway container. Separate connection
 * from the backend process; used only to seed users/sessions per test.
 */
export function getDb(): ReturnType<typeof postgres> {
  if (!client) {
    client = postgres(readRuntime().databaseUrl, { max: 4 })
  }
  return client
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end({ timeout: 5 })
    client = undefined
  }
}
