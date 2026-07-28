import type { MonsterTemplateCreateBody, MonsterTemplateDTO } from '@rolling-dice-app/core'
import { seedPost } from './api'

/**
 * Seed a monster template. Only `name` is required by the create contract; the
 * rest is filled by `buildMonsterTemplateCreateDefaults` on the server, so a
 * flow that just needs "a template exists to instantiate from" can pass the
 * couple of stats it asserts on and nothing else.
 */
export async function seedMonsterTemplate(
  sessionId: string,
  body: MonsterTemplateCreateBody,
): Promise<MonsterTemplateDTO> {
  return seedPost<MonsterTemplateDTO>('/monster-templates', sessionId, body)
}
