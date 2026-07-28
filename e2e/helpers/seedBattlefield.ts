import type { BattlefieldDTO } from '@rolling-dice-app/core'
import { seedPost } from './api'

/**
 * Create a battlefield for a seeded session log, skipping the entry-page
 * create step for slices that are about what happens *inside* a battlefield.
 *
 * `logId` is the battlefield's `sessionId` (a session log id, not a container
 * id). At most one battlefield exists per container, so a second call for a
 * sibling log of the same container fails with `BATTLEFIELD_ALREADY_EXISTS`.
 */
export async function seedBattlefield(sessionId: string, logId: string): Promise<BattlefieldDTO> {
  return seedPost<BattlefieldDTO>('/battlefields', sessionId, { sessionId: logId })
}
