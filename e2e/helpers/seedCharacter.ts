import type { CharacterCreateDTO, CharacterDTO } from '@rolling-dice-app/core'
import { BACKEND_ORIGIN, FRONTEND_ORIGIN } from './env'

/**
 * Minimal valid create payload; only `classes` / `abilities` carry real values,
 * the rest of CharacterCreateDTO is nullable. Per-test name uniqueness isn't
 * needed (each test owns a fresh user), so a fixed name is fine.
 */
const SAMPLE_CREATE_INPUT: CharacterCreateDTO = {
  name: 'E2E Character',
  gender: null,
  race: null,
  subrace: null,
  alignment: null,
  background: null,
  faith: null,
  age: null,
  height: null,
  weight: null,
  appearance: null,
  story: null,
  languages: null,
  tools: null,
  weaponProficiencies: null,
  armorProficiencies: null,
  classes: [{ classKey: 'fighter', level: 1, subclass: null }],
  abilities: {
    strength: { origin: 10, race: 0, bonusScore: 0 },
    dexterity: { origin: 10, race: 0, bonusScore: 0 },
    constitution: { origin: 10, race: 0, bonusScore: 0 },
    intelligence: { origin: 10, race: 0, bonusScore: 0 },
    wisdom: { origin: 10, race: 0, bonusScore: 0 },
    charisma: { origin: 10, race: 0, bonusScore: 0 },
  },
  skills: {},
  isJackOfAllTrades: false,
  isTough: false,
}

/**
 * Seed a character for an already-seeded session by POSTing the real
 * `/characters` endpoint (mirrors `backend/tests/helpers/characters.ts`) rather
 * than hand-writing the four derived jsonb columns: the endpoint derives
 * `stats` / `capabilities` and creates the currency row, so it stays the single
 * source of truth for the create contract.
 *
 * `Origin` is required — the backend's `requireSameOrigin` gate is fail-closed
 * and 403s any mutation without an allowlisted Origin (see
 * `backend/src/middleware/require-same-origin.ts`).
 */
export async function seedCharacter(
  sessionId: string,
  overrides: Partial<CharacterCreateDTO> = {},
): Promise<CharacterDTO> {
  const res = await fetch(`${BACKEND_ORIGIN}/characters`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `rd_session=${sessionId}`,
      origin: FRONTEND_ORIGIN,
    },
    body: JSON.stringify({ ...SAMPLE_CREATE_INPUT, ...overrides }),
  })
  if (res.status !== 201) {
    throw new Error(`seedCharacter expected 201, got ${res.status}: ${await res.text()}`)
  }
  return (await res.json()) as CharacterDTO
}
