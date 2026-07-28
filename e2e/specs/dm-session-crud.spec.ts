import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { DmSessionPom } from '../pom/dm-session.pom'

/**
 * DM session-container + session-log slice. Container and log are one usage
 * path (a container is created only to hold logs, and there is no standalone log
 * route), so a single round-trip covers both rather than duplicating the whole
 * container setup in a second spec.
 *
 * Covers frontend form/store/apiFetch → core contract → backend
 * `dm-session-containers` + its `session-logs` sub-resource → Postgres.
 * A plain `authedPage` suffices: free plan allows `maxDmSessionContainers: 10`
 * and `maxDmSessionLogsPerContainer: 100` (`backend/src/lib/plan-limits.ts`).
 *
 * Out of scope here, each with its own slice: the container's standing member
 * roster (`dm-session-members.spec.ts`) and the log's attendance / reward fields
 * (`dm-session-log-rewards.spec.ts`).
 */
test('DM session container + log round-trip persists to the database', async ({ authedPage }) => {
  const pom = new DmSessionPom(authedPage)
  // Non-overlapping names: `getByRole`'s `name` matches a substring, so a
  // `${title}-edited` rename would still match the original locator.
  const suffix = randomUUID().slice(0, 8)
  const title = `E2E-Campaign-${suffix}`
  const logTitle = `E2E-Log-${suffix}`
  const logRetitled = `E2E-Session-${suffix}`

  // 1. Fresh user → empty list.
  await pom.gotoList()
  await expect(pom.rowByTitle(title)).toHaveCount(0)

  // 2. Quick-create a container → lands straight on its detail page.
  const containerId = await pom.createContainer(title)
  await expect(pom.detailHeading(title)).toBeVisible()

  // 3. Add a session log from the empty timeline → lands on the new log's detail page.
  await pom.clickAddLog(containerId)
  await pom.fillLog({ title: logTitle, content: 'first session' })
  const logId = await pom.saveLogCreate(containerId)
  await expect(pom.detailHeading(logTitle)).toBeVisible()

  // 4. Edit the log via its detail-page edit link.
  await pom.gotoLogUpdate(containerId, logId)
  await expect(pom.logField('dm-session-log-title')).toHaveValue(logTitle)
  await pom.fillLog({ title: logRetitled, content: 'first session, revised' })
  await pom.saveLogUpdate(containerId, logId)
  await expect(pom.detailHeading(logRetitled)).toBeVisible()

  // 5. Reload → the edit survived a full round-trip through the DB, and the
  //    container's timeline now carries the log.
  await pom.reload()
  await expect(pom.detailHeading(logRetitled)).toBeVisible()

  await pom.gotoContainer(containerId)
  await expect(pom.timelineEntry(containerId, logId)).toBeVisible()
  await expect(pom.timelineEntry(containerId, logId)).toContainText(logRetitled)

  // 6. Delete the container from the list → gone, and stays gone after a reload.
  await pom.gotoList()
  await expect(pom.rowByTitle(title)).toBeVisible()
  await pom.clickDeleteContainer(title)
  await pom.confirmDeleteContainer(containerId)
  await expect(pom.rowByTitle(title)).toHaveCount(0)

  await pom.reload()
  await expect(pom.rowByTitle(title)).toHaveCount(0)
})
