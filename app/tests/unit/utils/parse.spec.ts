import { describe, expect, it } from 'vitest'
import { parseIntegerInput } from '~/utils/parse'

describe('parseIntegerInput', () => {
  describe('未傳 fallback / cap（向後相容）', () => {
    it('空字串回傳 null', () => {
      expect(parseIntegerInput('')).toBeNull()
    })

    it('純空白回傳 null', () => {
      expect(parseIntegerInput('   ')).toBeNull()
    })

    it('非數字回傳 null', () => {
      expect(parseIntegerInput('abc')).toBeNull()
    })

    it('Infinity / NaN 視為非法回傳 null', () => {
      expect(parseIntegerInput('Infinity')).toBeNull()
      expect(parseIntegerInput('-Infinity')).toBeNull()
      expect(parseIntegerInput('NaN')).toBeNull()
    })

    it('科學記號 / 前綴 + / 缺整數部分等 UI 非預期格式回傳 null', () => {
      expect(parseIntegerInput('1e5')).toBeNull()
      expect(parseIntegerInput('1.5e2')).toBeNull()
      expect(parseIntegerInput('+5')).toBeNull()
      expect(parseIntegerInput('.5')).toBeNull()
      expect(parseIntegerInput('5.')).toBeNull()
      expect(parseIntegerInput('-.5')).toBeNull()
    })

    it('合法整數直接回傳', () => {
      expect(parseIntegerInput('42')).toBe(42)
      expect(parseIntegerInput('-7')).toBe(-7)
    })

    it('小數以 trunc 截斷', () => {
      expect(parseIntegerInput('3.9')).toBe(3)
      expect(parseIntegerInput('-3.9')).toBe(-3)
    })
  })

  describe('傳入 fallback', () => {
    it('空字串 / 非法輸入回傳 fallback', () => {
      expect(parseIntegerInput('', 0)).toBe(0)
      expect(parseIntegerInput('abc', 5)).toBe(5)
    })

    it('合法值不受 fallback 影響', () => {
      expect(parseIntegerInput('10', 0)).toBe(10)
    })
  })

  describe('傳入 cap', () => {
    it('合法值在 cap 內維持原值', () => {
      expect(parseIntegerInput('50', 0, 99)).toBe(50)
      expect(parseIntegerInput('-50', 0, 99)).toBe(-50)
    })

    it('正值超出 cap 被 clamp 到 +cap', () => {
      expect(parseIntegerInput('9999', 0, 99)).toBe(99)
    })

    it('負值超出 cap 被 clamp 到 -cap（bonus 允許 debuff）', () => {
      expect(parseIntegerInput('-9999', 0, 99)).toBe(-99)
    })

    it('邊界值剛好等於 cap 維持原值', () => {
      expect(parseIntegerInput('99', 0, 99)).toBe(99)
      expect(parseIntegerInput('-99', 0, 99)).toBe(-99)
    })

    it('cap 不影響 fallback（fallback 不被 clamp）', () => {
      expect(parseIntegerInput('', 999, 99)).toBe(999)
    })

    it('未傳 fallback 但傳 cap：合法值仍 clamp，非法回 null', () => {
      expect(parseIntegerInput('500', undefined, 99)).toBe(99)
      expect(parseIntegerInput('', undefined, 99)).toBeNull()
    })
  })
})
