import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { seedBattlefield } from '../helpers/seedBattlefield'
import { seedDmSessionContainer, seedDmSessionLog } from '../helpers/seedDmSession'
import { BattlefieldPom } from '../pom/battlefield.pom'

/**
 * Battlefield combat slice: initiative order, turn/round advance, HP edits and
 * the battle-segment state machine (end battle → start the next one), plus the
 * debounced persistence underneath all of them.
 *
 * Initiative is typed in rather than rolled: the dice paths are random by
 * design and already covered by
 * `app/tests/unit/composables/useBattlefieldDiceRolls.spec.ts`, so keeping them
 * out is what makes the ordering assertions deterministic.
 *
 * The battlefield itself is seeded through the API — creating one from the entry
 * list is the other slice's job.
 */
test('battlefield initiative, turns, damage and battle segments persist', async ({
  authedPage,
  seededUser,
}) => {
  const suffix = randomUUID().slice(0, 8)
  const slow = `Slow-${suffix}`
  const fast = `Fast-${suffix}`

  const container = await seedDmSessionContainer(seededUser.sessionId, {
    title: `E2E-Campaign-${suffix}`,
  })
  const log = await seedDmSessionLog(seededUser.sessionId, container.id, {
    title: `Session-${suffix}`,
    date: '2026-01-01',
  })
  const battlefield = await seedBattlefield(seededUser.sessionId, log.id)

  const pom = new BattlefieldPom(authedPage)
  await pom.goto(battlefield.id)

  // 1. Two ad-hoc combatants, created in the order slow → fast.
  await pom.openSetup()
  await pom.setupTab('adhoc')
  await pom.createAdhocUnit({ name: slow, maxHp: '20' })
  await pom.waitForPersist(battlefield.id, () => pom.createAdhocUnit({ name: fast, maxHp: '20' }))
  await pom.closeSetup()
  expect(await pom.unitIndex(slow)).toBeLessThan(await pom.unitIndex(fast))

  // 2. Type initiatives, then sort → the higher roll moves to the top.
  await pom.setInitiative(slow, '5')
  await pom.setInitiative(fast, '15')
  await pom.waitForPersist(battlefield.id, () => pom.sortByInitiative())
  expect(await pom.unitIndex(fast)).toBeLessThan(await pom.unitIndex(slow))

  // 3. One full cycle over the combatants wraps the order exactly once, so the
  //    round goes up by one. The first advance is spent pinning down where the
  //    turn marker sits (it may already be on a unit), and only the cycle after
  //    that is measured — the alternative, hard-coding "three clicks → round 2",
  //    silently depends on that starting position.
  await expect(pom.roundMeta()).toHaveAttribute('data-round', '1')
  await pom.nextTurn()
  const roundBefore = Number(await pom.roundMeta().getAttribute('data-round'))
  await pom.nextTurn()
  await pom.waitForPersist(battlefield.id, () => pom.nextTurn())
  const expectedRound = String(roundBefore + 1)
  await expect(pom.roundMeta()).toHaveAttribute('data-round', expectedRound)

  // 4. Damage the slow unit through the detail panel.
  await pom.selectUnit(slow)
  await pom.waitForPersist(battlefield.id, () => pom.damageSelected('7'))
  await expect(pom.unitRow(slow)).toContainText('13/20')

  // 5. Reload → order, round and HP all came back from the database.
  await pom.reload()
  expect(await pom.unitIndex(fast)).toBeLessThan(await pom.unitIndex(slow))
  await expect(pom.roundMeta()).toHaveAttribute('data-round', expectedRound)
  await expect(pom.unitRow(slow)).toContainText('13/20')
  await expect(pom.initiativeField(fast)).toHaveValue('15')

  // 6. End the battle (keeping everything) → the next-battle control appears;
  //    starting it bumps the sequence and resets the round.
  await expect(pom.roundMeta()).toHaveAttribute('data-battle-sequence', '1')
  await pom.waitForPersist(battlefield.id, () => pom.endBattle())
  await expect(pom.startNextBattleButton()).toBeVisible()

  await pom.waitForPersist(battlefield.id, () => pom.startNextBattleButton().click())
  await expect(pom.roundMeta()).toHaveAttribute('data-battle-sequence', '2')
  await expect(pom.roundMeta()).toHaveAttribute('data-round', '1')

  // 7. Reload → the new segment survived, and HP was kept as the modal asked.
  await pom.reload()
  await expect(pom.roundMeta()).toHaveAttribute('data-battle-sequence', '2')
  await expect(pom.unitRow(slow)).toContainText('13/20')
})
