import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { seedCharacter } from '../helpers/seedCharacter'
import { seedDmSessionLog, seedDmSessionContainer, memberInput } from '../helpers/seedDmSession'
import { seedMonsterTemplate } from '../helpers/seedMonsterTemplate'
import { shareCharacter } from '../helpers/shareCharacter'
import { BattlefieldPom } from '../pom/battlefield.pom'

/**
 * Battlefield lifecycle slice: the entry list's session projection, the
 * one-battlefield-per-container rule, all three unit sources, and hard delete.
 *
 * The three sources take different snapshot paths, which is why all three are
 * driven here: a party member is snapshotted from a *shared* character
 * (`GET /share/characters/:shareId`), a monster is snapshotted from a template,
 * and an ad-hoc unit is typed in. Everything upstream of the battlefield is
 * seeded through the API — the roster / log editing paths have their own slices.
 *
 * Note the entry list is keyed by *session logs*: a battlefield's `sessionId` is
 * a log id, and two logs of one container yield two cards but only one may own a
 * battlefield.
 */
test('battlefield creation, unit sources and deletion round-trip', async ({
  authedPage,
  seededUser,
}) => {
  const suffix = randomUUID().slice(0, 8)
  const sessionA = `Session-A-${suffix}`
  const sessionB = `Session-B-${suffix}`
  const templateName = `E2E-Goblin-${suffix}`
  // Monster instances are always numbered, so the first one added is "<template> 1".
  const monsterInstanceName = `${templateName} 1`
  const adhocName = `E2E-Bandit-${suffix}`

  const character = await seedCharacter(seededUser.sessionId)
  await shareCharacter(seededUser.sessionId, character.id)
  await seedMonsterTemplate(seededUser.sessionId, { name: templateName, hp: 12, ac: 13 })

  // One roster entry, shared by the container and both logs (the drawer's member
  // sources are read off the *log's* attendance, not the container roster).
  const roster = [memberInput('Alpha', character.shareId)]
  const container = await seedDmSessionContainer(seededUser.sessionId, {
    title: `E2E-Campaign-${suffix}`,
    members: roster,
  })
  await seedDmSessionLog(seededUser.sessionId, container.id, {
    title: sessionA,
    date: '2026-01-01',
    members: roster,
  })
  await seedDmSessionLog(seededUser.sessionId, container.id, {
    title: sessionB,
    date: '2026-01-02',
    members: roster,
  })

  const pom = new BattlefieldPom(authedPage)

  // 1. Both sessions offer to open a battlefield.
  await pom.gotoList()
  await expect(pom.createButton(sessionA)).toBeEnabled()
  await expect(pom.createButton(sessionB)).toBeEnabled()

  // 2. Create one for session A → lands straight in the workspace.
  const battlefieldId = await pom.createBattlefield(sessionA)

  // 3. Back on the list: A now enters, and B can no longer create one — a
  //    container holds at most one battlefield (the UI pre-blocks the DB UNIQUE).
  await pom.gotoList()
  await expect(pom.enterButton(sessionA)).toBeVisible()
  await expect(pom.createButton(sessionB)).toBeDisabled()
  await pom.enterBattlefield(sessionA, battlefieldId)

  // 4. Bring in one unit from each source; all three join combat immediately.
  await pom.openSetup()
  await pom.setupTab('members')
  await pom.importMember(character.name)
  await pom.setupTab('templates')
  await pom.addTemplate(templateName)
  await pom.setupTab('adhoc')
  await pom.waitForPersist(battlefieldId, () =>
    pom.createAdhocUnit({ name: adhocName, maxHp: '20' }),
  )
  await pom.closeSetup()

  await expect(pom.unitRow(character.name)).toBeVisible()
  await expect(pom.unitRow(monsterInstanceName)).toBeVisible()
  await expect(pom.unitRow(adhocName)).toBeVisible()

  // 5. Reload → all three units came back from the database.
  await pom.reload()
  await expect(pom.unitRow(character.name)).toBeVisible()
  await expect(pom.unitRow(monsterInstanceName)).toBeVisible()
  await expect(pom.unitRow(adhocName)).toBeVisible()

  // 6. Delete the battlefield → session A can host a new one again.
  await pom.deleteBattlefield(battlefieldId)
  await expect(pom.createButton(sessionA)).toBeEnabled()
  await expect(pom.enterButton(sessionA)).toHaveCount(0)
})
