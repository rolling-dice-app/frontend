import { describe, expect, it } from 'vitest'
import { t, useI18n } from '~/i18n'

const tAny = t as unknown as (path: string) => string

describe('useI18n — 預設狀態', () => {
  it('locale 預設為 zh-TW', () => {
    const { locale } = useI18n()
    expect(locale.value).toBe('zh-TW')
  })
})

describe('t() — leaf 取值', () => {
  it('ability / skill 直接 leaf', () => {
    expect(t('ability.strength')).toBe('力量')
    expect(t('skill.athletics')).toBe('運動')
  })

  it('character namespace（alignment / gender / size）', () => {
    expect(t('character.alignment.lawfulGood')).toBe('守序善良')
  })

  it('class namespace（label / subclass）', () => {
    expect(t('class.label.artificer')).toBe('奇械師')
  })

  it('class.subclass 嵌套 leaf 可取值', () => {
    const value = t('class.subclass.barbarian.berserker')
    expect(typeof value).toBe('string')
    expect(value.length).toBeGreaterThan(0)
  })

  it('error.oauth 對應 OAuthErrorCode', () => {
    expect(t('error.oauth.OAUTH_USER_DENIED')).toBe('你在 Google 取消了授權')
  })
})

describe('t() — 動態 path（template literal）', () => {
  it('動態 OAuth code 仍 type-safe 且可取值', () => {
    const code = 'OAUTH_EMAIL_UNVERIFIED' as const
    expect(t(`error.oauth.${code}`)).toBe('你的 Google 帳號 email 尚未驗證')
  })
})

describe('useI18n — messages tree 走原生結構（動態列舉用）', () => {
  it('inventory.armorType 與 itemType 都可取整個 Record', () => {
    const { messages } = useI18n()
    expect(typeof messages.value.inventory.armorType).toBe('object')
    expect(typeof messages.value.inventory.itemType).toBe('object')
  })
})

describe('t() — 找不到 leaf 時 fallback（dev 期 logger.warn，跨環境不驗）', () => {
  it('中途 part 不存在 → fallback 回 path 字串', () => {
    expect(tAny('does.not.exist')).toBe('does.not.exist')
  })

  it('path 走到非 string value（中間節點） → fallback', () => {
    expect(tAny('character.alignment')).toBe('character.alignment')
  })
})

describe('useI18n — setLocale', () => {
  it('切換到當前唯一支援的 locale 不會出錯', () => {
    const { locale, setLocale } = useI18n()
    setLocale('zh-TW')
    expect(locale.value).toBe('zh-TW')
  })
})
