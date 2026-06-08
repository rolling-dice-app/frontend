import { randomUUID } from 'node:crypto'
import { test, expect } from '../fixtures'
import { CharacterOwnershipPom } from '../pom/character-ownership.pom'

/**
 * Not-found 切片。合法格式但不存在的 id 進 detail / update route 會落在 NotFound 分支：
 * backend 對「查無此 row」丟 404（與「非擁有者」無法區分，見 ownership 切片），
 * 前端 client-only fetch 收 404 → 兩頁的 `CommonNotFound`。
 *
 * 用一個從未 seed 的隨機 UUID（必不存在）打穿；id 須為合法 UUID 才會通過
 * backend 的 `z.string().uuid()` params 驗證進到 handler。格式錯誤的 id 是另一個
 * 契約——zod 擋下回 400 → 前端走可重試的暫時性錯誤分支，非 NotFound——故刻意不在此涵蓋。
 *
 * 沿用 ownership 切片的 POM：兩者探的是同一個 NotFound 狀態、同一條 client-only
 * fetch 404 路徑，差別只在「為何 404」（不存在 vs 非擁有），那是後端/seed 的事。
 */
test('壞 id（不存在的角色）進 detail / update 頁皆落在 NotFound', async ({ authedPage }) => {
  const missingId = randomUUID()
  const pom = new CharacterOwnershipPom(authedPage)

  await pom.gotoDetail(missingId)
  await expect(pom.notFound()).toBeVisible()

  await pom.gotoUpdate(missingId)
  await expect(pom.notFound()).toBeVisible()
})
