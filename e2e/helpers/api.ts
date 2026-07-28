import { BACKEND_ORIGIN, FRONTEND_ORIGIN } from './env'

/**
 * Shared transport for the seed helpers that drive the real backend as an
 * already-seeded user (see `seedCharacter.ts` for the rationale of seeding
 * through the real endpoints rather than hand-writing rows).
 *
 * `Origin` is required on every mutation — the backend's `requireSameOrigin`
 * gate is fail-closed and 403s anything without an allowlisted Origin (see
 * `backend/src/middleware/require-same-origin.ts`).
 */
function seedHeaders(sessionId: string): HeadersInit {
  return {
    'content-type': 'application/json',
    cookie: `rd_session=${sessionId}`,
    origin: FRONTEND_ORIGIN,
  }
}

/** POST a create endpoint and return its 201 body. */
export async function seedPost<T>(path: string, sessionId: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_ORIGIN}${path}`, {
    method: 'POST',
    headers: seedHeaders(sessionId),
    body: JSON.stringify(body),
  })
  if (res.status !== 201) {
    throw new Error(`POST ${path} expected 201, got ${res.status}: ${await res.text()}`)
  }
  return (await res.json()) as T
}

/** PATCH an endpoint whose success response is a bodyless 204. */
export async function seedPatch(path: string, sessionId: string, body: unknown): Promise<void> {
  const res = await fetch(`${BACKEND_ORIGIN}${path}`, {
    method: 'PATCH',
    headers: seedHeaders(sessionId),
    body: JSON.stringify(body),
  })
  if (res.status !== 204) {
    throw new Error(`PATCH ${path} expected 204, got ${res.status}: ${await res.text()}`)
  }
}
