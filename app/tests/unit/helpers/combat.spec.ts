import { describe, expect, it, vi } from 'vitest'
import { formatDamageSummary, getHitBonusColorClass } from '~/helpers/combat'
import { getAbilityModifier } from '~/helpers/ability'
import type { AttackDraft, TotalAbilityScores } from '~/types/business/character-form'

vi.stubGlobal('getAbilityModifier', getAbilityModifier)

const baseDraft = (): AttackDraft => ({
  name: '',
  abilityKey: null,
  damageDice: [],
  extraHitBonus: null,
  applyAbilityToDamage: true,
  comment: null,
})

const emptyScores = (): TotalAbilityScores => ({
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
})

describe('formatDamageSummary', () => {
  it('沒有任何傷害行回傳 —', () => {
    expect(formatDamageSummary(baseDraft(), emptyScores())).toBe('—')
  })

  it('count 與 bonus 皆為 0 的行不渲染', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      damageDice: [
        { id: 'a', dieType: 'd6', count: 0, bonus: 0, damageType: 'fire' },
        { id: 'b', dieType: 'd8', count: 1, bonus: null, damageType: null },
      ],
    }
    expect(formatDamageSummary(draft, emptyScores())).toBe('1d8')
  })

  it('dieType 為 null 即使 count > 0 也不渲染骰部分', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      damageDice: [{ id: 'a', dieType: null, count: 3, bonus: null, damageType: null }],
    }
    expect(formatDamageSummary(draft, emptyScores())).toBe('—')
  })

  it('dieType 為 null + count > 0 + bonus 有值，只渲染 bonus', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      damageDice: [{ id: 'a', dieType: null, count: 2, bonus: 4, damageType: 'fire' }],
    }
    expect(formatDamageSummary(draft, emptyScores())).toBe('4 火焰')
  })

  it('未指定類型的行只顯示骰數', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      damageDice: [{ id: 'a', dieType: 'd6', count: 2, bonus: null, damageType: null }],
    }
    expect(formatDamageSummary(draft, emptyScores())).toBe('2d6')
  })

  it('有類型的行附中文 label', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      damageDice: [{ id: 'a', dieType: 'd4', count: 2, bonus: null, damageType: 'slashing' }],
    }
    expect(formatDamageSummary(draft, emptyScores())).toBe('2d4 劈砍')
  })

  it('行內正 bonus 緊接 dice 顯示為 +N', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      damageDice: [{ id: 'a', dieType: 'd8', count: 1, bonus: 5, damageType: 'slashing' }],
    }
    expect(formatDamageSummary(draft, emptyScores())).toBe('1d8+5 劈砍')
  })

  it('行內負 bonus 緊接 dice 顯示為 -N', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      damageDice: [{ id: 'a', dieType: 'd8', count: 1, bonus: -2, damageType: null }],
    }
    expect(formatDamageSummary(draft, emptyScores())).toBe('1d8-2')
  })

  it('count = 0 但有 bonus 的行視為純定額傷害', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      damageDice: [{ id: 'a', dieType: null, count: 0, bonus: 10, damageType: 'acid' }],
    }
    expect(formatDamageSummary(draft, emptyScores())).toBe('10 酸蝕')
  })

  it('多行不同骰面 / 加值 / 類型應以 + 串接', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      damageDice: [
        { id: 'a', dieType: 'd8', count: 1, bonus: 5, damageType: 'slashing' },
        { id: 'b', dieType: 'd8', count: 4, bonus: 10, damageType: 'radiant' },
      ],
    }
    expect(formatDamageSummary(draft, emptyScores())).toBe('1d8+5 劈砍 + 4d8+10 光耀')
  })

  // ─── 屬性調整值併入第一行傷害 ──────────────────────────────────────────────────

  it('abilityKey=null 時 applyAbilityToDamage=true 也不影響輸出', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      abilityKey: null,
      applyAbilityToDamage: true,
      damageDice: [{ id: 'a', dieType: 'd8', count: 1, bonus: null, damageType: 'slashing' }],
    }
    const scores: TotalAbilityScores = { ...emptyScores(), strength: 16 }
    expect(formatDamageSummary(draft, scores)).toBe('1d8 劈砍')
  })

  it('開關開啟：屬性調整值併入第一行 bonus', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      abilityKey: 'strength',
      applyAbilityToDamage: true,
      damageDice: [{ id: 'a', dieType: 'd8', count: 1, bonus: null, damageType: 'slashing' }],
    }
    const scores: TotalAbilityScores = { ...emptyScores(), strength: 16 }
    expect(formatDamageSummary(draft, scores)).toBe('1d8+3 劈砍')
  })

  it('開關關閉：不加入屬性調整值', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      abilityKey: 'strength',
      applyAbilityToDamage: false,
      damageDice: [{ id: 'a', dieType: 'd8', count: 1, bonus: null, damageType: 'slashing' }],
    }
    const scores: TotalAbilityScores = { ...emptyScores(), strength: 16 }
    expect(formatDamageSummary(draft, scores)).toBe('1d8 劈砍')
  })

  it('開關開啟：屬性調整值與使用者輸入 bonus 疊加', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      abilityKey: 'strength',
      applyAbilityToDamage: true,
      damageDice: [{ id: 'a', dieType: 'd8', count: 1, bonus: 2, damageType: 'slashing' }],
    }
    const scores: TotalAbilityScores = { ...emptyScores(), strength: 16 }
    expect(formatDamageSummary(draft, scores)).toBe('1d8+5 劈砍')
  })

  it('開關關閉：使用者輸入 bonus 仍保留', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      abilityKey: 'strength',
      applyAbilityToDamage: false,
      damageDice: [{ id: 'a', dieType: 'd8', count: 1, bonus: 2, damageType: 'slashing' }],
    }
    const scores: TotalAbilityScores = { ...emptyScores(), strength: 16 }
    expect(formatDamageSummary(draft, scores)).toBe('1d8+2 劈砍')
  })

  it('屬性調整值正好抵銷使用者 bonus 時不顯示加號', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      abilityKey: 'strength',
      applyAbilityToDamage: true,
      damageDice: [{ id: 'a', dieType: 'd8', count: 1, bonus: -3, damageType: 'slashing' }],
    }
    const scores: TotalAbilityScores = { ...emptyScores(), strength: 16 }
    expect(formatDamageSummary(draft, scores)).toBe('1d8 劈砍')
  })

  it('純定額第一行 bonus 與屬性調整值疊加', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      abilityKey: 'strength',
      applyAbilityToDamage: true,
      damageDice: [{ id: 'a', dieType: null, count: 0, bonus: 10, damageType: 'acid' }],
    }
    const scores: TotalAbilityScores = { ...emptyScores(), strength: 16 }
    expect(formatDamageSummary(draft, scores)).toBe('13 酸蝕')
  })

  it('多行時屬性調整值只加到第一行', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      abilityKey: 'strength',
      applyAbilityToDamage: true,
      damageDice: [
        { id: 'a', dieType: 'd8', count: 1, bonus: null, damageType: 'slashing' },
        { id: 'b', dieType: 'd8', count: 2, bonus: null, damageType: 'radiant' },
      ],
    }
    const scores: TotalAbilityScores = { ...emptyScores(), strength: 16 }
    expect(formatDamageSummary(draft, scores)).toBe('1d8+3 劈砍 + 2d8 光耀')
  })

  it('第一行為空 placeholder（被過濾）時，屬性調整值加到第一個 renderable 行', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      abilityKey: 'strength',
      applyAbilityToDamage: true,
      damageDice: [
        { id: 'a', dieType: null, count: 0, bonus: null, damageType: null },
        { id: 'b', dieType: 'd8', count: 1, bonus: null, damageType: 'slashing' },
      ],
    }
    const scores: TotalAbilityScores = { ...emptyScores(), strength: 16 }
    expect(formatDamageSummary(draft, scores)).toBe('1d8+3 劈砍')
  })

  it('全空 damageDice 即使有 ability 也回傳 —', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      abilityKey: 'strength',
      applyAbilityToDamage: true,
      damageDice: [],
    }
    const scores: TotalAbilityScores = { ...emptyScores(), strength: 16 }
    expect(formatDamageSummary(draft, scores)).toBe('—')
  })

  it('負屬性調整值會減少第一行傷害', () => {
    const draft: AttackDraft = {
      ...baseDraft(),
      abilityKey: 'strength',
      applyAbilityToDamage: true,
      damageDice: [{ id: 'a', dieType: 'd6', count: 1, bonus: null, damageType: null }],
    }
    const scores: TotalAbilityScores = { ...emptyScores(), strength: 8 }
    expect(formatDamageSummary(draft, scores)).toBe('1d6-1')
  })
})

describe('getHitBonusColorClass', () => {
  it('正數回傳 success 色', () => {
    expect(getHitBonusColorClass(3)).toBe('text-success')
  })

  it('0 回傳 muted 色', () => {
    expect(getHitBonusColorClass(0)).toBe('text-content-muted')
  })

  it('負數回傳 danger 色', () => {
    expect(getHitBonusColorClass(-1)).toBe('text-danger')
  })
})
