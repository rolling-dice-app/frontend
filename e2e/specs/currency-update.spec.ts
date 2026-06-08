import { test, expect } from '../fixtures'
import { seedCharacter } from '../helpers/seedCharacter'
import { CharacterCurrencyPom } from '../pom/character-currency.pom'

/**
 * Currency update vertical slice: seed a character through the real create
 * endpoint (which provisions a zeroed currency row), then edit a coin amount
 * from the detail page's inventory tab and prove the new amount persists to the
 * database across a reload. Currency is a per-character singleton, so there is
 * no create / delete — just a read + update round-trip.
 */
test('currency edit round-trip persists to the database', async ({ authedPage, seededUser }) => {
  const { id } = await seedCharacter(seededUser.sessionId)
  const pom = new CharacterCurrencyPom(authedPage)

  // 1. A freshly created character starts with zero gold.
  await pom.gotoDetail(id)
  await pom.openInventoryTab()
  await pom.openEditModal()
  await expect(pom.coinInput('gp')).toHaveValue('0')

  // 2. Set gold → confirm (single PATCH) → reload → re-open the modal: the new
  //    amount survives, proving it hit the DB.
  await pom.editCoin('gp', 777)
  await pom.reload()
  await pom.openInventoryTab()
  await pom.openEditModal()
  await expect(pom.coinInput('gp')).toHaveValue('777')
})
