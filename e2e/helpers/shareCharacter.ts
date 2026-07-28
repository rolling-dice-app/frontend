import { seedPatch } from './api'

/**
 * Turn public sharing on (or off) for an already-seeded character.
 *
 * A character is created un-shared, and an un-shared `shareId` resolves to
 * nothing — so any flow that consumes a share link (the DM session member
 * roster, the battlefield member import) has to flip this first.
 */
export async function shareCharacter(
  sessionId: string,
  characterId: string,
  shareable = true,
): Promise<void> {
  await seedPatch(`/characters/${encodeURIComponent(characterId)}/share`, sessionId, { shareable })
}
