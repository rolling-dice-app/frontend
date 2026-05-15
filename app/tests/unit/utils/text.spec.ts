import { describe, expect, it } from 'vitest'
import { cleanText, cleanTextOrNull } from '~/utils/text'

describe('cleanText', () => {
  it('null / undefined 回傳空字串', () => {
    expect(cleanText(null)).toBe('')
    expect(cleanText(undefined)).toBe('')
  })

  it('空字串回傳空字串', () => {
    expect(cleanText('')).toBe('')
  })

  it('純空白回傳空字串', () => {
    expect(cleanText('   ')).toBe('')
    expect(cleanText('\t\n')).toBe('')
  })

  it('去除前後空白並保留中間空白', () => {
    expect(cleanText('  Roger  ')).toBe('Roger')
    expect(cleanText(' a  b ')).toBe('a  b')
  })

  it('無前後空白時原值返回', () => {
    expect(cleanText('Roger')).toBe('Roger')
  })
})

describe('cleanTextOrNull', () => {
  it('null / undefined 回傳 null', () => {
    expect(cleanTextOrNull(null)).toBeNull()
    expect(cleanTextOrNull(undefined)).toBeNull()
  })

  it('空字串 / 純空白回傳 null', () => {
    expect(cleanTextOrNull('')).toBeNull()
    expect(cleanTextOrNull('   ')).toBeNull()
    expect(cleanTextOrNull('\t\n')).toBeNull()
  })

  it('去除前後空白後若仍有內容則回傳 trimmed string', () => {
    expect(cleanTextOrNull('  Roger  ')).toBe('Roger')
    expect(cleanTextOrNull(' a  b ')).toBe('a  b')
  })
})
