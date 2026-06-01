import { describe, expect, it } from 'vitest'
import { CLASS_KEYS, SUBCLASS_KEYS, type SubclassKey } from '@rolling-dice-app/core'
import classMessages from '~/i18n/zh-TW/class'

/**
 * 防 drift：subclass 的 key 集合以 core `SUBCLASS_KEYS` 為單一來源，i18n 僅持有 label。
 * 這組測試確保翻譯與 core 不漂移（core 新增 subclass 但忘了補翻譯、或翻譯殘留已移除的 key）。
 *
 * 決策 D3：subclass key 刻意允許「跨主職業共用同名」，例如 cleric 的「月亮領域」與
 * druid 的「月亮結社」同為 `moon`。因此這裡用 Set 聚合做涵蓋率、per-class 做子集檢查，
 * 皆容許同一 key 出現在多個主職業底下；不可斷言「每個 key 只屬於一個 class」。
 */
describe('class.subclass i18n — 與 core SUBCLASS_KEYS 的 drift 防護', () => {
  const subclass = classMessages.subclass
  const coreKeys = new Set<SubclassKey>(SUBCLASS_KEYS)

  it('subclass 翻譯涵蓋 core 全部主職業（key 與 CLASS_KEYS 一致）', () => {
    expect(Object.keys(subclass).sort()).toEqual([...CLASS_KEYS].sort())
  })

  it('每個翻譯到的 subclass key 都是合法 core SubclassKey（無殘留多餘 key）', () => {
    for (const [classKey, entries] of Object.entries(subclass)) {
      for (const key of Object.keys(entries)) {
        expect(
          coreKeys.has(key as SubclassKey),
          `${classKey}.${key} 不在 core SUBCLASS_KEYS 中`,
        ).toBe(true)
      }
    }
  })

  it('core SUBCLASS_KEYS 全數至少被一個主職業翻譯涵蓋（容許跨 class 共用 key）', () => {
    const translated = new Set<string>()
    for (const entries of Object.values(subclass)) {
      for (const key of Object.keys(entries)) translated.add(key)
    }
    const missing = SUBCLASS_KEYS.filter((key) => !translated.has(key))
    expect(missing).toEqual([])
  })

  it('每個 subclass 翻譯值為非空字串', () => {
    for (const entries of Object.values(subclass)) {
      for (const label of Object.values(entries)) {
        expect(typeof label).toBe('string')
        expect((label as string).length).toBeGreaterThan(0)
      }
    }
  })

  it('刻意允許跨 class 共用 key 名（決策 D3：moon = cleric 月亮領域 / druid 月亮結社）', () => {
    expect(subclass.cleric?.moon).toBeTruthy()
    expect(subclass.druid?.moon).toBeTruthy()
    // 同 key、不同 class、不同 label —— 共用合法、語意各自獨立
    expect(subclass.cleric?.moon).not.toBe(subclass.druid?.moon)
  })
})
