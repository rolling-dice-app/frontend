import { test, expect } from '../fixtures'
import { seedCharacter } from '../helpers/seedCharacter'
import { CharacterCombatPom } from '../pom/character-combat.pom'

/**
 * Combat-state vertical slice. CombatState has two distinct write models and this
 * round-trip exercises both:
 *   - a field edit (max-HP +1) fires the debounced PATCH → re-GET pipeline
 *   - reset is a POST that returns no body and then re-GETs the fresh (cleared)
 *     state ([[project_combat_state_rest_contract]])
 * Each step is re-checked after a reload to prove it hit the database.
 */
test('combat-state max-HP edit and reset round-trip persist to the database', async ({
  authedPage,
  seededUser,
}) => {
  const { id } = await seedCharacter(seededUser.sessionId)
  const pom = new CharacterCombatPom(authedPage)

  // 1. Open the combat tab → no max-HP adjustment yet.
  await pom.gotoDetail(id)
  await pom.openCombatTab()
  await expect(pom.maxHpAdjustment('+1')).toHaveCount(0)

  // 2. Bump max-HP (debounced PATCH) → the (+1) indicator shows, and survives a
  //    reload (proves it hit the DB).
  await pom.incrementMaxHp()
  await expect(pom.maxHpAdjustment('+1')).toBeVisible()
  await pom.reload()
  await pom.openCombatTab()
  await expect(pom.maxHpAdjustment('+1')).toBeVisible()

  // 3. Reset (POST returns no body → re-GET) clears the adjustment, and it stays
  //    cleared after a reload (proves the reset persisted).
  await pom.reset()
  await expect(pom.maxHpAdjustment('+1')).toHaveCount(0)
  await pom.reload()
  await pom.openCombatTab()
  await expect(pom.maxHpAdjustment('+1')).toHaveCount(0)
})
