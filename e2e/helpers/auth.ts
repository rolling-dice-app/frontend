import { randomUUID } from 'node:crypto'
import { getDb } from './db'

export interface SeededUser {
  userId: string
  sessionId: string
}

/**
 * Seed one active user + a non-expired session directly into the throwaway DB,
 * returning the session id to drop into the `rd_session` cookie.
 *
 * Pass `email` to seed a specific address — e.g. `SUPER_ADMIN_EMAIL` so the
 * backend derives `isSuperAdmin` and bypasses plan limits. Otherwise a uuid email
 * keeps each user unique.
 *
 * Field shapes are kept in sync with `backend/tests/helpers/auth.ts` (the single
 * source of truth). We write raw SQL via `postgres` rather than importing the
 * backend's drizzle client across repos. Column names below are the snake_case
 * DB columns from `backend/src/db/schema.ts`; the unique-per-active indexes on
 * email / (oauth_provider, oauth_subject) are why both carry a uuid.
 */
export async function seedAuthedUser(email?: string): Promise<SeededUser> {
  const sql = getDb()
  const unique = randomUUID()

  const [user] = await sql<{ id: string }[]>`
    insert into users (email, display_name, oauth_provider, oauth_subject)
    values (${email ?? `user-${unique}@test.local`}, 'Test User', 'google', ${`oauth-${unique}`})
    returning id
  `
  if (!user) throw new Error('seedAuthedUser: user insert returned empty')

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const [session] = await sql<{ id: string }[]>`
    insert into sessions (user_id, expires_at)
    values (${user.id}, ${expiresAt})
    returning id
  `
  if (!session) throw new Error('seedAuthedUser: session insert returned empty')

  return { userId: user.id, sessionId: session.id }
}
