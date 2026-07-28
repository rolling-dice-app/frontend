import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { memberInput, seedDmSessionContainer } from '../helpers/seedDmSession'
import { DmSessionPom } from '../pom/dm-session.pom'

/**
 * DM session log attendance + rewards slice — the second half of the log form
 * that `dm-session-crud` deliberately leaves out (it covers title / content /
 * timeline only).
 *
 * Attendance is *prefilled with the whole standing roster* (the DM de-selects
 * absentees), so the round-trip toggles one member off rather than on. Rewards
 * are three shapes in one save: a coin amount, an exp amount, and the
 * semi-structured `itemRewards` row list.
 *
 * The container is seeded through the API with two roster members — this slice
 * is about the log form, and the roster editing path has its own slice.
 */
test('DM session log attendance and rewards round-trip persists to the database', async ({
  authedPage,
  seededUser,
}) => {
  const suffix = randomUUID().slice(0, 8)
  const attending = `Alpha-${suffix}`
  const absent = `Bravo-${suffix}`

  const container = await seedDmSessionContainer(seededUser.sessionId, {
    title: `E2E-Rewards-${suffix}`,
    members: [memberInput(attending), memberInput(absent)],
  })

  const pom = new DmSessionPom(authedPage)
  await pom.gotoLogCreate(container.id)

  // 1. Both roster members start attending (the form prefills the full roster).
  await expect(pom.attendanceChip(attending)).toHaveAttribute('aria-pressed', 'true')
  await expect(pom.attendanceChip(absent)).toHaveAttribute('aria-pressed', 'true')

  // 2. De-select one, fill the reward totals and add one item-reward row.
  await pom.fillLog({ title: `E2E-Log-${suffix}` })
  await pom.attendanceChip(absent).click()
  await expect(pom.attendanceChip(absent)).toHaveAttribute('aria-pressed', 'false')

  await pom.fillRewardTotals({ gp: '25', exp: '400' })
  await pom.addRewardRow()
  await pom.fillRewardRow({ item: 'Cloak of Elvenkind', player: attending, remark: 'attuned' })

  const logId = await pom.saveLogCreate(container.id)

  // 3. Re-open the edit form → every field came back from the DB.
  await pom.gotoLogUpdateDirect(container.id, logId)
  await expect(pom.attendanceChip(attending)).toHaveAttribute('aria-pressed', 'true')
  await expect(pom.attendanceChip(absent)).toHaveAttribute('aria-pressed', 'false')
  await expect(pom.moneyField('gp')).toHaveValue('25')
  await expect(pom.expField()).toHaveValue('400')
  await expect(pom.rewardField('item')).toHaveValue('Cloak of Elvenkind')
  await expect(pom.rewardField('player')).toHaveValue(attending)
  await expect(pom.rewardField('remark')).toHaveValue('attuned')

  // 4. Drop the reward row → the replace-whole-list write really removes it.
  await pom.removeRewardRow()
  await pom.saveLogUpdate(container.id, logId)

  await pom.gotoLogUpdateDirect(container.id, logId)
  await expect(pom.rewardField('item')).toHaveCount(0)
  await expect(pom.moneyField('gp')).toHaveValue('25')
})
