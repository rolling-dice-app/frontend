import { createPinia, setActivePinia } from 'pinia'
import { onMounted } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CharacterDTO } from '@rolling-dice-app/core'
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
const mockApiErrorHandle = vi.fn()

async function getComposable(character: CharacterDTO) {
  const { useCharacterStore } = await import('~/stores/character')
  vi.stubGlobal('useCharacterStore', useCharacterStore)

  const { useCharacterSpellsStore } = await import('~/stores/character-spells')
  const spellsStore = useCharacterSpellsStore()
  spellsStore.characterId = character.id
  spellsStore.entries = []
  vi.stubGlobal('useCharacterSpellsStore', useCharacterSpellsStore)

  const { useCharacterDerivedStats } = await import('~/composables/domain/useCharacterDerivedStats')
  vi.stubGlobal('useCharacterDerivedStats', useCharacterDerivedStats)

  vi.stubGlobal('useToast', () => ({ error: mockToastError, success: mockToastSuccess }))
  vi.stubGlobal('useApiErrorToast', () => ({ handle: mockApiErrorHandle }))
  vi.stubGlobal('useSpells', () => ({ refresh: vi.fn(), spells: { value: [] } }))

  const { useCharacterUpdate } = await import('~/composables/domain/useCharacterUpdate')
  return useCharacterUpdate(character)
}

beforeEach(() => {
  vi.resetModules()
  setActivePinia(createPinia())
  vi.stubGlobal('navigateTo', mockNavigateTo)
  vi.stubGlobal('onMounted', onMounted)
  seedCharacterInStore(MOCK_CHARACTER)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  localStorage.clear()
})

// ─── 初始狀態 ──────────────────────────────────────────────────────────────────

describe('useCharacterUpdate — 初始狀態', () => {
  it('應將傳入 character 映射至 formState', async () => {
    const { formState } = await getComposable(MOCK_CHARACTER)
    expect(formState.id).toBe('update-001')
    expect(formState.name).toBe('測試角色')
    expect(formState.gender).toBe('male')
    expect(formState.race).toBe('human')
  })

  it('應正確映射 abilities（保留 basicScore 與 bonusScore）', async () => {
    const { formState } = await getComposable(MOCK_CHARACTER)
    expect(formState.abilities.strength).toEqual({ origin: 15, race: 0, bonusScore: 2 })
    expect(formState.abilities.constitution).toEqual({ origin: 13, race: 0, bonusScore: 1 })
  })

  it('應正確映射 optional 欄位', async () => {
    const { formState } = await getComposable(MOCK_CHARACTER)
    expect(formState.faith).toBe('坦帕斯')
    expect(formState.age).toBe(35)
    expect(formState.height).toBe('180cm')
  })

  it('應正確映射 isTough', async () => {
    const { formState } = await getComposable(MOCK_CHARACTER)
    expect(formState.isTough).toBe(true)
  })

  it('應正確映射 classes', async () => {
    const { formState } = await getComposable(MOCK_CHARACTER)
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
    const { formState } = await getComposable(character)
    expect(formState.classes[0]!.subclass).toBe('battleMaster')
    expect(formState.classes[1]!.subclass).toBeNull()
  })

  it('應正確映射 skills', async () => {
    const { formState } = await getComposable(MOCK_CHARACTER)
    expect(formState.skills).toEqual({ athletics: 'proficient' })
  })

  it('應正確映射 spellcastingAbilities', async () => {
    const character = createMockCharacter({
      id: 'update-spell-001',
      spellcastingAbilities: ['intelligence', 'charisma'],
    })
    seedCharacterInStore(character)
    const { formState } = await getComposable(character)
    expect(formState.spellcastingAbilities).toEqual(['intelligence', 'charisma'])
  })

  it('應正確映射 customSpellcastingBonuses', async () => {
    const character = createMockCharacter({
      id: 'update-spell-002',
      customSpellcastingBonuses: { intelligence: 2 },
    })
    seedCharacterInStore(character)
    const { formState } = await getComposable(character)
    expect(formState.customSpellcastingBonuses).toEqual({ intelligence: 2 })
  })

  it('activeTab 初始值應為 "basic"', async () => {
    const { activeTab } = await getComposable(MOCK_CHARACTER)
    expect(activeTab.value).toBe('basic')
  })
})

// ─── 職業管理 ──────────────────────────────────────────────────────────────────

describe('useCharacterUpdate — 職業管理', () => {
  it('totalLevel 應正確計算所有職業等級總和', async () => {
    const { formState, derived } = await getComposable(MOCK_CHARACTER)
    formState.classes.push({ classKey: null, level: 3, subclass: null })
    expect(derived.totalLevel.value).toBe(8)
  })
})

// ─── canSubmit / submit ──────────────────────────────────────────────────────

describe('useCharacterUpdate — canSubmit', () => {
  it('未變更時為 false', async () => {
    const { canSubmit } = await getComposable(MOCK_CHARACTER)
    expect(canSubmit.value).toBe(false)
  })

  it('變更 name 後為 true', async () => {
    const { canSubmit, formState } = await getComposable(MOCK_CHARACTER)
    formState.name = '其他名字'
    expect(canSubmit.value).toBe(true)
  })

  it('name 清空時為 false', async () => {
    const { canSubmit, formState } = await getComposable(MOCK_CHARACTER)
    formState.name = '   '
    expect(canSubmit.value).toBe(false)
  })

  it('任一 class 未選時為 false', async () => {
    const { canSubmit, formState } = await getComposable(MOCK_CHARACTER)
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

    const { submit, formState } = await getComposable(MOCK_CHARACTER)
    formState.name = '已改名'
    await submit()

    expect(spy).toHaveBeenCalledWith('update-001', formState)
    expect(mockToastSuccess).toHaveBeenCalledWith('已儲存')
    expect(formState.name).toBe('已改名')
  })

  it('主幹失敗（含 409）一律交給 useApiErrorToast，不在前端判狀態碼', async () => {
    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    const err = { response: { status: 409 } }
    vi.spyOn(store, 'updateCharacter').mockRejectedValue(err)

    const { submit, formState } = await getComposable(MOCK_CHARACTER)
    formState.name = '已改名'
    await submit()

    expect(mockApiErrorHandle).toHaveBeenCalledWith(err)
    expect(mockNavigateTo).not.toHaveBeenCalled()
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('主幹丟出非 FetchError 也交給 useApiErrorToast', async () => {
    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    const err = new Error('boom')
    vi.spyOn(store, 'updateCharacter').mockRejectedValue(err)

    const { submit, formState } = await getComposable(MOCK_CHARACTER)
    formState.name = '已改名'
    await submit()

    expect(mockApiErrorHandle).toHaveBeenCalledWith(err)
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('未滿足 canSubmit 時不呼叫 store', async () => {
    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    const spy = vi.spyOn(store, 'updateCharacter')

    const { submit } = await getComposable(MOCK_CHARACTER)
    await submit()

    expect(spy).not.toHaveBeenCalled()
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })

  it('主幹失敗時保留主表單草稿（不重設回 baseline）', async () => {
    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    vi.spyOn(store, 'updateCharacter').mockRejectedValue({ response: { status: 409 } })

    const { submit, formState } = await getComposable(MOCK_CHARACTER)
    formState.name = '草稿名'
    formState.faith = '草稿信仰'
    await submit()

    // baseline 仍是 MOCK_CHARACTER（store 未更新），但使用者的編輯不應被清掉
    expect(formState.name).toBe('草稿名')
    expect(formState.faith).toBe('草稿信仰')
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })

  it('spell 失敗但主幹成功時保留 spell 草稿讓使用者重試', async () => {
    const { useCharacterStore } = await import('~/stores/character')
    const store = useCharacterStore()
    vi.spyOn(store, 'updateCharacter').mockImplementation(async () => {
      const next = { ...MOCK_CHARACTER, name: '已改名' }
      store.detailCache.set(next.id, next)
      return next
    })

    const { submit, formState } = await getComposable(MOCK_CHARACTER)
    const { useCharacterSpellsStore } = await import('~/stores/character-spells')
    const spellsStore = useCharacterSpellsStore()
    vi.spyOn(spellsStore, 'learn').mockRejectedValue(new Error('learn fail'))
    const refetchSpy = vi.spyOn(spellsStore, 'refetch').mockResolvedValue([])

    formState.name = '已改名'
    formState.spells.push({
      spellId: 'fireball',
      isPrepared: false,
      isFavorite: false,
      sourceClass: 'wizard',
    })
    await submit()

    // 主幹成功 → 主表單以 server 重種；spell 失敗 → refetch 對齊但保留 spell 草稿
    expect(refetchSpy).toHaveBeenCalled()
    expect(formState.spells.some((s) => s.spellId === 'fireball')).toBe(true)
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })
})
