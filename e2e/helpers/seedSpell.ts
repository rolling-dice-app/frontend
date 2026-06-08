import type { SpellDTO, SpellEntryDTO } from '@rolling-dice-app/core'
import { BACKEND_ORIGIN, FRONTEND_ORIGIN } from './env'

/**
 * Fetch the SRD spell catalog. `GET /spells` is a public, unauthenticated
 * endpoint, so no session cookie is needed; the catalog itself is seeded once
 * per stack in global-setup.
 */
export async function fetchSpellCatalog(): Promise<SpellDTO[]> {
  const res = await fetch(`${BACKEND_ORIGIN}/spells`)
  if (!res.ok) {
    throw new Error(`fetchSpellCatalog expected 200, got ${res.status}: ${await res.text()}`)
  }
  return (await res.json()) as SpellDTO[]
}

/**
 * Seed one learned spell entry on a character by POSTing the real
 * `/characters/:id/spells` endpoint (body = { spellId }), mirroring how the app
 * learns a spell so the create contract stays the single source of truth.
 *
 * `Origin` is required — the backend's `requireSameOrigin` gate is fail-closed
 * and 403s any mutation without an allowlisted Origin.
 */
export async function seedSpellEntry(
  sessionId: string,
  characterId: string,
  spellId: string,
): Promise<SpellEntryDTO> {
  const res = await fetch(
    `${BACKEND_ORIGIN}/characters/${encodeURIComponent(characterId)}/spells`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `rd_session=${sessionId}`,
        origin: FRONTEND_ORIGIN,
      },
      body: JSON.stringify({ spellId }),
    },
  )
  if (res.status !== 201) {
    throw new Error(`seedSpellEntry expected 201, got ${res.status}: ${await res.text()}`)
  }
  return (await res.json()) as SpellEntryDTO
}
