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
})

describe('t() — 動態 path（template literal）', () => {
  it('動態 spell school code 仍 type-safe 且可取值', () => {
    const code = 'abjuration' as const
    expect(t(`spell.school.${code}`)).toBe('防護')
  })
})

describe('t() — character namespace 擴張（基本資料 / tab / 列表）', () => {
  it('基本資料欄位', () => {
    expect(t('character.race')).toBe('種族')
    expect(t('character.background')).toBe('背景')
    expect(t('character.faith')).toBe('信仰')
    expect(t('character.appearance')).toBe('外貌')
  })

  it('屬性分配 panel', () => {
    expect(t('character.abilityScores')).toBe('屬性分配')
    expect(t('character.racial')).toBe('種族加值')
    expect(t('character.unassigned')).toBe('未指派')
  })

  it('tab / section 名稱', () => {
    expect(t('character.basicInfo')).toBe('基本資訊')
    expect(t('character.combatQuickView')).toBe('戰鬥速查')
    expect(t('character.campaign')).toBe('戰役')
  })

  it('列表 / 互動', () => {
    expect(t('character.createCharacter')).toBe('建立角色卡')
    expect(t('character.deleteConfirm')).toBe('刪除後無法復原，確定要刪除這張角色卡嗎？')
    expect(t('character.empty')).toBe('尚無角色卡')
  })
})

describe('t() — class namespace 擴張', () => {
  it('主職業 / 兼職 / 等級', () => {
    expect(t('class.className')).toBe('職業')
    expect(t('class.primary')).toBe('主職業')
    expect(t('class.multiclass')).toBe('兼職')
    expect(t('class.level')).toBe('等級')
  })

  it('生命骰 / 技能熟練', () => {
    expect(t('class.hitDie')).toBe('生命骰')
    expect(t('class.skillProficiency')).toBe('技能熟練')
  })
})

describe('t() — inventory namespace 擴張', () => {
  it('物品操作', () => {
    expect(t('inventory.item')).toBe('物品')
    expect(t('inventory.addItem')).toBe('新增物品')
    expect(t('inventory.itemDescription')).toBe('物品說明')
  })

  it('存放位置 / 同調', () => {
    expect(t('inventory.backpack')).toBe('背包')
    expect(t('inventory.dimensionalBag')).toBe('次元袋')
    expect(t('inventory.attunement')).toBe('同調')
    expect(t('inventory.attuned')).toBe('已同調')
  })

  it('金幣 / 資產', () => {
    expect(t('inventory.cp')).toBe('銅幣 (cp)')
    expect(t('inventory.gp')).toBe('金幣 (gp)')
    expect(t('inventory.asset')).toBe('資產')
  })
})

describe('t() — combat namespace（戰鬥 / 規則用詞）', () => {
  it('HP / 受傷 / 治療', () => {
    expect(t('combat.hp')).toBe('生命值')
    expect(t('combat.hpCurrent')).toBe('當前生命')
    expect(t('combat.hpTemp')).toBe('臨時生命')
    expect(t('combat.hurt')).toBe('受傷')
    expect(t('combat.heal')).toBe('治療')
  })

  it('衍生加值 / 規則計算', () => {
    expect(t('combat.proficiencyBonus')).toBe('熟練加值')
    expect(t('combat.initiative')).toBe('先攻')
    expect(t('combat.passivePerception')).toBe('被動察覺')
    expect(t('combat.speed')).toBe('移動速度')
    expect(t('combat.jackOfAllTrades')).toBe('全能高手')
    expect(t('combat.tough')).toBe('健壯')
  })

  it('豁免 / 死亡豁免', () => {
    expect(t('combat.savingThrow')).toBe('豁免')
    expect(t('combat.deathSave')).toBe('死亡豁免')
  })

  it('AC 相關', () => {
    expect(t('combat.ac')).toBe('護甲等級')
    expect(t('combat.shield')).toBe('盾牌')
    expect(t('combat.unarmored')).toBe('無甲防禦')
  })

  it('攻擊 / 傷害', () => {
    expect(t('combat.attack')).toBe('攻擊')
    expect(t('combat.addAttack')).toBe('新增攻擊')
    expect(t('combat.damageRoll')).toBe('傷害骰')
    expect(t('combat.applyAbilityToDamage')).toBe('套用屬性調整到傷害')
  })

  it('特性 / 擲骰 / 休息', () => {
    expect(t('combat.feature')).toBe('特性')
    expect(t('combat.roll')).toBe('擲骰')
    expect(t('combat.shortRest')).toBe('短休')
    expect(t('combat.longRest')).toBe('長休')
  })

  it('damageType enum 仍可取（T1 並存）', () => {
    const { messages } = useI18n()
    expect(typeof messages.value.combat.damageType).toBe('object')
    expect(typeof messages.value.combat.featureRecovery).toBe('object')
  })
})

describe('t() — spell namespace（法術 UI 用詞）', () => {
  it('環位 / 級別', () => {
    expect(t('spell.cantrip')).toBe('戲法')
    expect(t('spell.level')).toBe('環')
    expect(t('spell.slot')).toBe('環位')
    expect(t('spell.pactSlot')).toBe('契術環位')
  })

  it('metadata 屬性 label', () => {
    expect(t('spell.attribute.castingTime')).toBe('施法時間')
    expect(t('spell.attribute.duration')).toBe('持續時間')
    expect(t('spell.attribute.range')).toBe('距離')
  })

  it('flag / state', () => {
    expect(t('spell.ritual')).toBe('儀式')
    expect(t('spell.concentration')).toBe('專注')
    expect(t('spell.prepared')).toBe('已準備')
    expect(t('spell.favorite')).toBe('常用')
  })

  it('section / panel 名稱', () => {
    expect(t('spell.book')).toBe('法術書')
    expect(t('spell.database')).toBe('法術資料庫')
    expect(t('spell.castingModule')).toBe('施法模組')
  })

  it('互動 / filter', () => {
    expect(t('spell.favoriteAction')).toBe('標記為常用')
    expect(t('spell.searchPlaceholder')).toBe('搜尋法術名稱')
    expect(t('spell.filterRitual')).toBe('只顯示儀式法術')
  })

  it('school enum 仍可取（T1 並存）', () => {
    const { messages } = useI18n()
    expect(typeof messages.value.spell.school).toBe('object')
  })
})

describe('t() — ui namespace（通用 UI 用詞）', () => {
  it('action 動詞', () => {
    expect(t('ui.action.save')).toBe('儲存')
    expect(t('ui.action.cancel')).toBe('取消')
    expect(t('ui.action.delete')).toBe('刪除')
  })

  it('form 提示', () => {
    expect(t('ui.form.required')).toBe('必填')
    expect(t('ui.form.selectPlaceholder')).toBe('請選擇')
  })

  it('auth 入口 / 流程', () => {
    expect(t('ui.auth.login')).toBe('登入')
    expect(t('ui.auth.logout')).toBe('登出')
    expect(t('ui.auth.loginRequired')).toBe('請先登入後再訪問此頁')
  })

  it('message 通用提示', () => {
    expect(t('ui.message.saveFailed')).toBe('儲存失敗，請稍後再試')
    expect(t('ui.message.unknownError')).toBe('發生未知錯誤，請稍後再試')
    expect(t('ui.message.systemError')).toBe('系統錯誤，請稍後再試')
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
