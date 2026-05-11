import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockCharacter, seedCharacterInStore } from '~/tests/fixtures/character'

const mockNavigateTo = vi.fn()

const MOCK_CHARACTER = createMockCharacter({
  id: 'update-001',
  abilities: {
    strength: { origin: 15, race: 0, bonusScore: 2 },
    dexterity: { origin: 14, race: 0, bonusScore: 0 },
    constitution: { origin: 13, race: 0, bonusScore: 1 },
    intelligence: { origin: 12, race: 0, bonusScore: 0 },
    wisdom: { origin: 10, race: 0, bonusScore: 0 },
    charisma: { origin: 8, race: 0, bonusScore: 0 },
  },
  isTough: true,
  faith: '坦帕斯',
  age: 35,
  height: '180cm',
  weight: '75kg',
  appearance: '高大健壯',
  story: '曾是王國的士兵',
  languages: '通用語, 精靈語',
  tools: '鍛造工具',
  weaponProficiencies: '長劍',
  armorProficiencies: '鎧甲',
})

const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()

async function getComposable(characterId: string) {
  const { useCharacterStore } = await import('~/stores/character')
  vi.stubGlobal('useCharacterStore', useCharacterStore)

  const { useCharacterDerivedStats } = await import('~/composables/domain/useCharacterDerivedStats')
  vi.stubGlobal('useCharacterDerivedStats', useCharacterDerivedStats)

  vi.stubGlobal('useToast', () => ({ error: mockToastError, success: mockToastSuccess }))

  const { useCharacterUpdate } = await import('~/composables/domain/useCharacterUpdate')
  return useCharacterUpdate(characterId)
}

beforeEach(() => {
  vi.resetModules()
  setActivePinia(createPinia())
  vi.stubGlobal('navigateTo', mockNavigateTo)
  seedCharacterInStore(MOCK_CHARACTER)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  localStorage.clear()
})

// ─── 初始狀態 ──────────────────────────────────────────────────────────────────

describe('useCharacterUpdate — 初始狀態', () => {
  it('應從 store 載入角色並映射至 formState', async () => {
    const { formState, character } = await getComposable('update-001')
    expect(character.value).toBeTruthy()
    expect(formState.id).toBe('update-001')
    expect(formState.name).toBe('測試角色')
    expect(formState.gender).toBe('male')
    expect(formState.race).toBe('human')
  })

  it('應正確映射 abilities（保留 basicScore 與 bonusScore）', async () => {
    const { formState } = await getComposable('update-001')
    expect(formState.abilities.strength).toEqual({ origin: 15, race: 0, bonusScore: 2 })
    expect(formState.abilities.constitution).toEqual({ origin: 13, race: 0, bonusScore: 1 })
  })

  it('應正確映射 optional 欄位', async () => {
    const { formState } = await getComposable('update-001')
    expect(formState.faith).toBe('坦帕斯')
    expect(formState.age).toBe(35)
    expect(formState.height).toBe('180cm')
  })

  it('應正確映射 isTough', async () => {
    const { formState } = await getComposable('update-001')
    expect(formState.isTough).toBe(true)
  })

  it('應正確映射 classes', async () => {
    const { formState } = await getComposable('update-001')
    expect(formState.classes).toHaveLength(1)
    expect(formState.classes[0]).toEqual({
      classKey: 'fighter',
      level: 5,
      subclass: null,
    })
  })

  it('應正確映射 classes 上的 subclass', async () => {
    const character = createMockCharacter({
      id: 'update-sub-001',
      classes: [
        { classKey: 'fighter', level: 5, subclass: 'battleMaster' },
        { classKey: 'wizard', level: 3, subclass: null },
      ],
    })
    seedCharacterInStore(character)
    const { formState } = await getComposable('update-sub-001')
    expect(formState.classes[0]!.subclass).toBe('battleMaster')
    expect(formState.classes[1]!.subclass).toBeNull()
  })

  it('應正確映射 skills', async () => {
    const { formState } = await getComposable('update-001')
    expect(formState.skills).toEqual({ athletics: 'proficient' })
  })

  it('應正確映射 spellcastingAbilities', async () => {
    const character = createMockCharacter({
      id: 'update-spell-001',
      spellcastingAbilities: ['intelligence', 'charisma'],
    })
    seedCharacterInStore(character)
    const { formState } = await getComposable('update-spell-001')
    expect(formState.spellcastingAbilities).toEqual(['intelligence', 'charisma'])
  })

  it('應正確映射 customSpellcastingBonuses', async () => {
    const character = createMockCharacter({
      id: 'update-spell-002',
      customSpellcastingBonuses: { intelligence: 2 },
    })
    seedCharacterInStore(character)
    const { formState } = await getComposable('update-spell-002')
    expect(formState.customSpellcastingBonuses).toEqual({ intelligence: 2 })
  })

  it('找不到角色時 formState.spellcastingAbilities 應為空陣列', async () => {
    const { formState } = await getComposable('non-existent')
    expect(formState.spellcastingAbilities).toEqual([])
    expect(formState.customSpellcastingBonuses).toEqual({})
  })

  it('activeTab 初始值應為 "basic"', async () => {
    const { activeTab } = await getComposable('update-001')
    expect(activeTab.value).toBe('basic')
  })

  it('找不到角色時 character 應為 undefined', async () => {
    const { character } = await getComposable('non-existent')
    expect(character.value).toBeUndefined()
  })
})

// ─── 職業管理 ──────────────────────────────────────────────────────────────────

describe('useCharacterUpdate — 職業管理', () => {
  it('totalLevel 應正確計算所有職業等級總和', async () => {
    const { formState, derived } = await getComposable('update-001')
    formState.classes.push({ classKey: null, level: 3, subclass: null })
    expect(derived.totalLevel.value).toBe(8)
  })
})

// ─── canSubmit / submit ──────────────────────────────────────────────────────

describe('useCharacterUpdate — canSubmit', () => {
  it('未變更時為 false', async () => {
    const { canSubmit } = await getComposable('update-001')
    expect(canSubmit.value).toBe(false)
  })

  it('變更 name 後為 true', async () => {
    const { canSubmit, formState } = await getComposable('update-001')
    formState.name = '其他名字'
    expect(canSubmit.value).toBe(true)
  })

  it('name 清空時為 false', async () => {
    const { canSubmit, formState } = await getComposable('update-001')
    formState.name = '   '
    expect(canSubmit.value).toBe(false)
  })

  it('任一 class 未選時為 false', async () => {
    const { canSubmit, formState } = await getComposable('update-001')
    formState.classes.push({ classKey: null, level: 1, subclass: null })
    expect(canSubmit.value).toBe(false)
  })
})

describe('useCharacterUpdate — submit', () => {
  it('成功時呼叫 store.updateCharacter、顯示 success toast、刷新 formState', async () => {
    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    const next = { ...MOCK_CHARACTER, name: '已改名', updatedAt: '2026-02-01T00:00:00.000Z' }
    const spy = vi.spyOn(store, 'updateCharacter').mockImplementation(async () => {
      store.detailCache.set(next.id, next)
      return next
    })

    const { submit, formState } = await getComposable('update-001')
    formState.name = '已改名'
    await submit()

    expect(spy).toHaveBeenCalledWith('update-001', formState)
    expect(mockToastSuccess).toHaveBeenCalledWith('已儲存')
    expect(formState.name).toBe('已改名')
  })

  it('409 stale 時顯示提示並導回 detail 頁', async () => {
    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    vi.spyOn(store, 'updateCharacter').mockRejectedValue({ response: { status: 409 } })

    const { submit, formState } = await getComposable('update-001')
    formState.name = '已改名'
    await submit()

    expect(mockToastError).toHaveBeenCalledWith('此角色已被其他裝置更新，將返回詳情頁')
    expect(mockNavigateTo).toHaveBeenCalledWith('/character/update-001')
  })

  it('其他錯誤顯示 saveFailed toast', async () => {
    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    vi.spyOn(store, 'updateCharacter').mockRejectedValue(new Error('boom'))

    const { submit, formState } = await getComposable('update-001')
    formState.name = '已改名'
    await submit()

    expect(mockToastError).toHaveBeenCalledWith('儲存失敗，請稍後再試')
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('未滿足 canSubmit 時不呼叫 store', async () => {
    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    const spy = vi.spyOn(store, 'updateCharacter')

    const { submit } = await getComposable('update-001')
    await submit()

    expect(spy).not.toHaveBeenCalled()
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })
})
