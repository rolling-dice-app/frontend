import { describe, expect, it } from 'vitest'
import { MONSTER_DEFAULT_AC, MONSTER_DEFAULT_HP, type DamageDieEntry } from '@rolling-dice-app/core'
import {
  buildDefaultMonsterView,
  buildMonsterTemplateCreateBody,
  buildMonsterTemplateUpdatePatch,
  isMeaningfulDamageEntry,
  monsterTemplateToSummary,
  monsterTemplateToView,
  resolveMonsterSavingThrow,
  resolveMonsterSkillBonus,
} from '~/helpers/monster'
import { createMockMonsterFormState, createMockMonsterTemplate } from '~/tests/fixtures/monster'

describe('buildDefaultMonsterView', () => {
  it('id / name 留空，其餘吃 core 保守預設', () => {
    const view = buildDefaultMonsterView()
    expect(view.id).toBe('')
    expect(view.name).toBe('')
    expect(view.ac).toBe(MONSTER_DEFAULT_AC)
    expect(view.hp).toBe(MONSTER_DEFAULT_HP)
    expect(view.size).toBeNull()
    expect(view.attacks).toEqual([])
    expect(view.features).toEqual([])
  })
})

describe('monsterTemplateToView / monsterTemplateToSummary', () => {
  it('toView 剝除 server 欄位，業務欄位原樣保留', () => {
    const dto = createMockMonsterTemplate()
    const view = monsterTemplateToView(dto)
    expect(view).not.toHaveProperty('userId')
    expect(view).not.toHaveProperty('createdAt')
    expect(view).not.toHaveProperty('updatedAt')
    expect(view.id).toBe(dto.id)
    expect(view.attacks).toEqual(dto.attacks)
  })

  it('toSummary 只取列表欄位', () => {
    const dto = createMockMonsterTemplate()
    expect(monsterTemplateToSummary(dto)).toEqual({
      id: dto.id,
      name: dto.name,
      size: dto.size,
      challengeRating: dto.challengeRating,
      ac: dto.ac,
      hp: dto.hp,
    })
  })
})

describe('resolveMonsterSavingThrow / resolveMonsterSkillBonus', () => {
  // STR 8（-1）、DEX 15（+2）、WIS 7（-2）：推導值與 0 可區分，才驗得出三態
  const monster = createMockMonsterTemplate({
    abilities: {
      strength: 8,
      dexterity: 15,
      constitution: 10,
      intelligence: 10,
      wisdom: 7,
      charisma: 10,
    },
    savingThrows: { dexterity: 4, strength: 0 },
    skills: { stealth: 6, acrobatics: 0 },
  })

  it('有列出的豁免用列出的值', () => {
    expect(resolveMonsterSavingThrow(monster, 'dexterity')).toBe(4)
  })

  it('明確填 0 的豁免維持 0，不退回屬性調整值', () => {
    expect(resolveMonsterSavingThrow(monster, 'strength')).toBe(0)
  })

  it('未列出的豁免用該屬性的調整值', () => {
    expect(resolveMonsterSavingThrow(monster, 'wisdom')).toBe(-2)
  })

  it('有列出的技能用列出的值，明確填 0 維持 0', () => {
    expect(resolveMonsterSkillBonus(monster, 'stealth')).toBe(6)
    expect(resolveMonsterSkillBonus(monster, 'acrobatics')).toBe(0)
  })

  it('未列出的技能依 SKILL_TO_ABILITY_MAP 取所屬屬性的調整值', () => {
    expect(resolveMonsterSkillBonus(monster, 'athletics')).toBe(-1) // STR 8
    expect(resolveMonsterSkillBonus(monster, 'sleightOfHand')).toBe(2) // DEX 15
    expect(resolveMonsterSkillBonus(monster, 'perception')).toBe(-2) // WIS 7
  })
})

describe('isMeaningfulDamageEntry', () => {
  const entry = (overrides: Partial<DamageDieEntry> = {}): DamageDieEntry => ({
    id: 'dd-x',
    count: 0,
    dieType: null,
    bonus: null,
    damageType: null,
    ...overrides,
  })

  it('四欄全空的新增列不算有意義', () => {
    expect(isMeaningfulDamageEntry(entry())).toBe(false)
  })

  it('只填 count 沒選骰面的半填列不算有意義', () => {
    expect(isMeaningfulDamageEntry(entry({ count: 2 }))).toBe(false)
  })

  it('只選傷害類型不構成傷害', () => {
    expect(isMeaningfulDamageEntry(entry({ damageType: 'slashing' }))).toBe(false)
  })

  it('bonus 為 0 等同未填', () => {
    expect(isMeaningfulDamageEntry(entry({ bonus: 0 }))).toBe(false)
  })

  it('完整骰式算有意義', () => {
    expect(isMeaningfulDamageEntry(entry({ count: 1, dieType: 6 }))).toBe(true)
  })

  it('無骰但有非零加值的純定額傷害算有意義', () => {
    expect(isMeaningfulDamageEntry(entry({ bonus: 3 }))).toBe(true)
    expect(isMeaningfulDamageEntry(entry({ bonus: -1 }))).toBe(true)
  })
})

describe('buildMonsterTemplateCreateBody', () => {
  it('剝除佔位 id（backend strict schema 多帶會 400）', () => {
    const body = buildMonsterTemplateCreateBody({ ...buildDefaultMonsterView(), name: '紅龍' })
    expect(body).not.toHaveProperty('id')
    expect(body.name).toBe('紅龍')
  })

  it('文字欄位淨化：name trim、自由文字空字串收斂為 null', () => {
    const body = buildMonsterTemplateCreateBody({
      ...buildDefaultMonsterView(),
      name: '  紅龍  ',
      senses: '   ',
      languages: '龍語',
      remark: '   ',
    })
    expect(body.name).toBe('紅龍')
    expect(body.senses).toBeNull()
    expect(body.languages).toBe('龍語')
    expect(body.remark).toBeNull()
  })
})

describe('buildMonsterTemplateUpdatePatch', () => {
  it('無變更時只剩 updatedAt（呼叫端據此 no-op）', () => {
    const dto = createMockMonsterTemplate()
    const patch = buildMonsterTemplateUpdatePatch(dto, createMockMonsterFormState(dto))
    expect(patch).toEqual({ updatedAt: dto.updatedAt })
  })

  it('scalar / nullable 欄位變更才入 patch，並帶原 updatedAt 作樂觀鎖', () => {
    const dto = createMockMonsterTemplate()
    const patch = buildMonsterTemplateUpdatePatch(
      dto,
      createMockMonsterFormState(dto, { ac: 16, languages: '地精語' }),
    )
    expect(patch).toEqual({ updatedAt: dto.updatedAt, ac: 16, languages: '地精語' })
  })

  it('record / array 欄位以深比對判斷變更（同值不入 patch）', () => {
    const dto = createMockMonsterTemplate()
    const form = createMockMonsterFormState(dto, {
      skills: { ...dto.skills },
      damageModifiers: { ...dto.damageModifiers },
      conditionImmunityKeys: [...dto.conditionImmunityKeys],
      attacks: structuredClone(dto.attacks),
    })
    const patch = buildMonsterTemplateUpdatePatch(dto, form)
    expect(patch).toEqual({ updatedAt: dto.updatedAt })
  })

  it('attacks 條目內容變更（如傷害骰）視為變更', () => {
    const dto = createMockMonsterTemplate()
    const attacks = structuredClone(dto.attacks)
    attacks[0]!.damageDice[0]!.bonus = 5
    const patch = buildMonsterTemplateUpdatePatch(dto, createMockMonsterFormState(dto, { attacks }))
    expect(patch.attacks).toEqual(attacks)
    expect(Object.keys(patch)).toEqual(['updatedAt', 'attacks'])
  })

  it('全欄位變更時逐欄入 patch', () => {
    const dto = createMockMonsterTemplate()
    const form = createMockMonsterFormState(dto, {
      name: '獸人',
      size: 'medium',
      alignment: 'chaoticEvil',
      challengeRating: '1/2',
      ac: 13,
      hp: 15,
      speed: 40,
      initiativeBonus: 1,
      abilities: { ...dto.abilities, strength: 16 },
      savingThrows: { strength: 3 },
      skills: { intimidation: 2 },
      damageModifiers: { radiant: 'vulnerability', bludgeoning: 'resistance' },
      conditionImmunityKeys: ['frightened'],
      senses: '黑暗視覺 120 ft.',
      languages: '獸人語',
      attacks: [],
      features: [],
      remark: '抗性僅對非魔法攻擊生效',
    })
    const patch = buildMonsterTemplateUpdatePatch(dto, form)
    expect(Object.keys(patch).sort()).toEqual(
      [
        'updatedAt',
        'name',
        'size',
        'alignment',
        'challengeRating',
        'ac',
        'hp',
        'speed',
        'initiativeBonus',
        'abilities',
        'savingThrows',
        'skills',
        'damageModifiers',
        'conditionImmunityKeys',
        'senses',
        'languages',
        'attacks',
        'features',
        'remark',
      ].sort(),
    )
    expect(patch.updatedAt).toBe(dto.updatedAt)
    expect(patch.abilities?.strength).toBe(16)
    expect(patch.attacks).toEqual([])
  })

  it('文字欄位先淨化再比對：只補空白不算變更', () => {
    const dto = createMockMonsterTemplate()
    const patch = buildMonsterTemplateUpdatePatch(
      dto,
      createMockMonsterFormState(dto, { name: `  ${dto.name}  ` }),
    )
    expect(patch).toEqual({ updatedAt: dto.updatedAt })
  })
})
