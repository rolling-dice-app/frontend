import { test, expect } from '../fixtures'
import { AuthGuardPom } from '../pom/auth-guard.pom'

/**
 * Auth-guard 切片。未登入造訪受保護 route 會被 `auth` middleware 導回首頁：
 * middleware client-only，等 boot 的 `/auth/me`（無 cookie → 401 → user 維持 null）
 * 後判 `isLoggedIn` false，初次 hydration 走 `navigateTo('/', { external: true })`。
 *
 * 用 base `page`（非 `authedPage`，無 `rd_session` cookie）模擬未登入。detail / update
 * 用固定的不存在 id 但無關緊要——守衛在 client-only fetch 前就導走，根本不會打到 404；
 * id 須為常數（非 randomUUID）以免 test title 在 collection / worker 兩階段漂移。
 */
const DUMMY_ID = '00000000-0000-4000-8000-000000000000'
const PROTECTED_ROUTES = [
  '/settings',
  '/character',
  '/character/build',
  `/character/${DUMMY_ID}`,
  `/character/${DUMMY_ID}/update`,
  // DM 工具三入口。`/dm` 本身是 `redirect: '/dm/monster'`（route-level redirect 在比對
  // 階段就解析掉），故它實際是靠 `/dm/monster` 的 auth middleware 落回 `/`——斷言的是
  // 「未登入進 /dm 最終停在 /」這個可觀察契約，不假設是哪一層擋下的。
  '/dm',
  '/dm/monster',
  '/dm/session',
]

for (const path of PROTECTED_ROUTES) {
  test(`未登入造訪 ${path} 會被導回首頁`, async ({ page }) => {
    const pom = new AuthGuardPom(page)

    await pom.gotoProtected(path)

    await expect(page).toHaveURL('/')
    await expect(pom.homeHero()).toBeVisible()
  })
}
