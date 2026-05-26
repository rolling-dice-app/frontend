import { describe, expect, it } from 'vitest'
import { parseShareIdFromLink } from '~/utils/parseShareId'

const VALID = 'chs_AbCdEfGhIjKlMnOpQrStUv'

describe('parseShareIdFromLink', () => {
  it('從 https URL 擷取 shareId', () => {
    expect(parseShareIdFromLink(`https://app.example.com/share/${VALID}`)).toBe(VALID)
  })

  it('容忍末尾斜線', () => {
    expect(parseShareIdFromLink(`https://app.example.com/share/${VALID}/`)).toBe(VALID)
  })

  it('容忍 query / hash', () => {
    expect(parseShareIdFromLink(`https://app.example.com/share/${VALID}?foo=1`)).toBe(VALID)
    expect(parseShareIdFromLink(`https://app.example.com/share/${VALID}#section`)).toBe(VALID)
  })

  it('容忍前後空白', () => {
    expect(parseShareIdFromLink(`  https://app.example.com/share/${VALID}  `)).toBe(VALID)
  })

  it('localhost 連結也能擷取', () => {
    expect(parseShareIdFromLink(`http://localhost:3000/share/${VALID}`)).toBe(VALID)
  })

  it('純 shareId（沒有路徑前綴）不接受', () => {
    expect(parseShareIdFromLink(VALID)).toBeNull()
  })

  it('完全無關字串回 null', () => {
    expect(parseShareIdFromLink('https://example.com/about')).toBeNull()
    expect(parseShareIdFromLink('hello world')).toBeNull()
    expect(parseShareIdFromLink('')).toBeNull()
    expect(parseShareIdFromLink('   ')).toBeNull()
  })

  it('shareId 長度不對不接受', () => {
    expect(parseShareIdFromLink('https://app.example.com/share/chs_tooShort')).toBeNull()
    expect(
      parseShareIdFromLink('https://app.example.com/share/chs_TooooooooooooooLooooong'),
    ).toBeNull()
  })

  it('prefix 不是 chs_ 不接受', () => {
    expect(
      parseShareIdFromLink('https://app.example.com/share/usr_AbCdEfGhIjKlMnOpQrStUv'),
    ).toBeNull()
  })
})
