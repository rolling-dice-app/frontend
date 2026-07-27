import { describe, expect, it, vi } from 'vitest'
import type { CharacterAbilityScores, SharedCharacterProfileDTO } from '@rolling-dice-app/core'
import { getAbilityModifier } from '~/helpers/ability'
import { buildBattlefieldMemberSource } from '~/helpers/battlefield-snapshot'

// helpers/combat.ts 的 getAttackHit 走 auto-import 呼叫 getAbilityModifier
vi.stubGlobal('getAbilityModifier', getAbilityModifier)

const score = (origin: number): { origin: number; race: number; bonusScore: number } => ({
  origin,
  race: 0,
  bonusScore: 0,
})

const abilities: CharacterAbilityScores = {
  strength: score(16), // +3
  dexterity: score(14), // +2
  constitution: score(14), // +2
  intelligence: score(10),
  wisdom: score(12), // +1
  charisma: score(8),
}

/** 只填 builder 會讀到的欄位；型別以結構相容餵入 */
const character = {
  name: '艾莉亞',
  race: '人類',
  classes: [{ classKey: 'fighter', level: 5, subclass: null }], // 熟練 +3
  abilities,
  skills: { athletics: 'proficient', stealth: 'expertise' },
  isJackOfAllTrades: false,
  isTough: false,
  customHpBonus: 0,
  armorClass: { type: null, value: 16, abilityKey: null, shieldValue: 2 },
  speedBonus: 10,
  initiativeBonus: 1,
  initiativeAbilityKey: 'wisdom',
  attacks: [
    {
      id: 'atk-1',
      name: '長劍',
      abilityKey: 'strength',
      damageDice: [
        { id: 'dd-1', dieType: 8, count: 1, bonus: null, damageType: 'slashing' },
        { id: 'dd-2', dieType: 6, count: 2, bonus: 1, damageType: 'fire' },
      ],
      extraHitBonus: 2,
      applyAbilityToDamage: true,
      comment: '雙手劍',
    },
    {
      id: 'atk-2',
      name: '毒鏢',
      abilityKey: 'dexterity',
      damageDice: [{ id: 'dd-3', dieType: 4, count: 1, bonus: null, damageType: 'poison' }],
      extraHitBonus: null,
      applyAbilityToDamage: false,
      comment: null,
    },
  ],
} as unknown as SharedCharacterProfileDTO

const member = { id: 'member-1', playerName: '玩家A' }

describe('buildBattlefieldMemberSource', () => {
  it('走角色衍生管線攤平總值（HP／AC／速度／先攻總修正）', () => {
    const source = buildBattlefieldMemberSource(member, 'chs_x', character)
    if (!source.available) throw new Error('unexpected unavailable')
    expect(source).toMatchObject({
      memberId: 'member-1',
      shareId: 'chs_x',
      playerName: '玩家A',
      name: '艾莉亞',
      race: '人類',
    })
    // fighter Lv.5（d10、CON +2）：首級 10+2、後續 4×(6+2) = 44
    expect(source.maxHp).toBe(44)
    // AC：基礎 16 + DEX +2（未選 armor type 比照無甲加 DEX）+ 盾 2
    expect(source.ac).toBe(20)
    // 速度：30 + 10
    expect(source.speed).toBe(40)
    // 先攻：DEX +2 + WIS +1 + 額外 1
    expect(source.totalInitiative).toBe(4)
  })

  it('攻擊命中攤平（屬性＋熟練＋額外）；applyAbilityToDamage 折進第一行傷害', () => {
    const source = buildBattlefieldMemberSource(member, 'chs_x', character)
    if (!source.available) throw new Error('unexpected unavailable')
    // STR +3 + 熟練 +3 + 額外 2 = 8
    expect(source.attacks[0]).toMatchObject({
      id: 'atk-1',
      name: '長劍',
      hitBonus: 8,
      comment: '雙手劍',
    })
    // 第一行折入 STR +3；第二行不動
    expect(source.attacks[0]?.damageDice[0]).toMatchObject({ bonus: 3 })
    expect(source.attacks[0]?.damageDice[1]).toMatchObject({ bonus: 1 })
    // 不吃屬性傷害的攻擊：命中 DEX +2 + 熟練 +3、傷害行不動
    expect(source.attacks[1]).toMatchObject({ hitBonus: 5 })
    expect(source.attacks[1]?.damageDice[0]).toMatchObject({ bonus: null })
  })

  it('技能只快照有熟練者（none 不進快照），值為攤平總值', () => {
    const source = buildBattlefieldMemberSource(member, 'chs_x', character)
    if (!source.available) throw new Error('unexpected unavailable')
    // athletics：STR +3 + 熟練 3 = 6；stealth：DEX +2 + 專精 6 = 8
    expect(source.skills).toEqual({ athletics: 6, stealth: 8 })
  })

  it('不共享參照：classes / attacks 均為 clone', () => {
    const source = buildBattlefieldMemberSource(member, 'chs_x', character)
    if (!source.available) throw new Error('unexpected unavailable')
    expect(source.classes[0]).not.toBe(character.classes[0])
    expect(source.attacks[0]?.damageDice[0]).not.toBe(character.attacks[0]?.damageDice[0])
  })
})
