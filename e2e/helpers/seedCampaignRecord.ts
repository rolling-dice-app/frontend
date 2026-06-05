import type { CampaignRecordCreateBody, CampaignRecordDTO } from '@rolling-dice-app/core'
import { DEFAULT_CURRENCY } from '@rolling-dice-app/core'
import { BACKEND_ORIGIN, FRONTEND_ORIGIN } from './env'

/** Minimal valid create body; teammates default empty (the share/teammate path is
 *  covered by its own slice) and money/exp default to zero. */
const SAMPLE_CREATE_BODY: CampaignRecordCreateBody = {
  title: 'E2E Campaign',
  subtitle: null,
  content: 'Seeded campaign record.',
  date: '2026-01-01',
  teammates: [],
  moneyEarning: { ...DEFAULT_CURRENCY },
  expEarning: 0,
}

/**
 * Seed one campaign record for an already-seeded session by POSTing the real
 * `/characters/:id/campaign-records` endpoint, mirroring how the app creates a
 * record so the create contract stays the single source of truth.
 *
 * `Origin` is required — the backend's `requireSameOrigin` gate is fail-closed
 * and 403s any mutation without an allowlisted Origin.
 */
export async function seedCampaignRecord(
  sessionId: string,
  characterId: string,
  overrides: Partial<CampaignRecordCreateBody> = {},
): Promise<CampaignRecordDTO> {
  const res = await fetch(
    `${BACKEND_ORIGIN}/characters/${encodeURIComponent(characterId)}/campaign-records`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `rd_session=${sessionId}`,
        origin: FRONTEND_ORIGIN,
      },
      body: JSON.stringify({ ...SAMPLE_CREATE_BODY, ...overrides }),
    },
  )
  if (res.status !== 201) {
    throw new Error(`seedCampaignRecord expected 201, got ${res.status}: ${await res.text()}`)
  }
  return (await res.json()) as CampaignRecordDTO
}
