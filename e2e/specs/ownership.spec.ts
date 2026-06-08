import { test, expect } from '../fixtures'
import { seedAuthedUser } from '../helpers/auth'
import { seedCharacter } from '../helpers/seedCharacter'
import { CharacterOwnershipPom } from '../pom/character-ownership.pom'

/**
 * Ownership 隱私切片。A 開 B 的 detail / update route 只會見到 NotFound，看不到 B 的資料：
 * backend 對非擁有者回 404 而非 403（`backend/src/middleware/ownership.ts`），
 * 與「id 不存在」無法區分。
 */
test('使用者無法讀取他人的角色（回 404，而非洩漏資料）', async ({ authedPage }) => {
  // 只有 B 的 session 擁有這張卡；B 的 cookie 從不放進瀏覽器——
  // 打下面 route 的是 A 的 cookie（透過 authedPage）。
  const userB = await seedAuthedUser()
  const { id, name } = await seedCharacter(userB.sessionId, { name: "B's Private Character" })

  const pom = new CharacterOwnershipPom(authedPage)

  await pom.gotoDetail(id)
  await expect(pom.notFound()).toBeVisible()
  await expect(pom.nameHeading(name)).toBeHidden()

  await pom.gotoUpdate(id)
  await expect(pom.notFound()).toBeVisible()
  await expect(pom.nameHeading(name)).toBeHidden()
})
