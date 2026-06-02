import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { onMounted } from 'vue'
import { useCharacterListCardView } from '~/composables/ui/useCharacterListCardView'
import { calculateTotalLevel, getCharacterTier } from '~/helpers/character'
import { CLASS_IMAGES } from '~/utils/images'
import placeholderCover from '~/assets/images/rolling-dice.png'
import type { CharacterListItem } from '~/types/business/character-list'

beforeEach(() => {
  vi.stubGlobal('onMounted', onMounted)
  vi.stubGlobal('calculateTotalLevel', calculateTotalLevel)
  vi.stubGlobal('getCharacterTier', getCharacterTier)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const makeCharacter = (overrides: Partial<CharacterListItem> = {}): CharacterListItem =>
  ({
    id: 'c-1',
    name: '測試',
    race: null,
    classes: [{ classKey: 'fighter', level: 3, subclass: null }],
    level: 3,
    avatar: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    shareable: false,
    shareId: 'chs_aaaaaaaaaaaaaaaaaaaaaa',
    deletedAt: null,
    restoredAt: null,
    ...overrides,
  }) as CharacterListItem

describe('useCharacterListCardView', () => {
  describe('封面與職業 null-safety（C24）', () => {
    it('有職業且無頭像：封面用首個職業圖、firstClassKey 為該職業', () => {
      const vm = useCharacterListCardView(
        () => makeCharacter(),
        () => 'active',
        '24px',
      )
      expect(vm.firstClassKey.value).toBe('fighter')
      expect(vm.coverSrc.value).toBe(CLASS_IMAGES.fighter)
      expect(vm.hasAvatar.value).toBe(false)
    })

    it('空 classes（畸形資料）：firstClassKey 為 null、封面退回 placeholder', () => {
      const vm = useCharacterListCardView(
        () => makeCharacter({ classes: [] }),
        () => 'active',
        '24px',
      )
      expect(vm.firstClassKey.value).toBeNull()
      expect(vm.coverSrc.value).toBe(placeholderCover)
      expect(vm.totalLevel.value).toBe(0)
    })

    it('有頭像時封面用頭像、hasAvatar 為 true', () => {
      const vm = useCharacterListCardView(
        () => makeCharacter({ avatar: 'https://x.test/a.png' }),
        () => 'active',
        '24px',
      )
      expect(vm.hasAvatar.value).toBe(true)
      expect(vm.coverSrc.value).toBe('https://x.test/a.png')
    })
  })

  describe('tier 與 glow', () => {
    it('glow 半徑由參數帶入', () => {
      const vm = useCharacterListCardView(
        () => makeCharacter(),
        () => 'active',
        '16px',
      )
      expect(vm.tierGlowStyle.value['--tier-glow-radius']).toBe('16px')
      expect(vm.tierGlowStyle.value['--tier-glow-level']).toBe(3)
    })

    it('總等級 20 為 isMaxLevel', () => {
      const vm = useCharacterListCardView(
        () => makeCharacter({ classes: [{ classKey: 'fighter', level: 20, subclass: null }] }),
        () => 'active',
        '24px',
      )
      expect(vm.isMaxLevel.value).toBe(true)
    })
  })

  describe('導頁攔截', () => {
    it('trash mode 點卡片 preventDefault', () => {
      const vm = useCharacterListCardView(
        () => makeCharacter(),
        () => 'trashed',
        '24px',
      )
      const e = { preventDefault: vi.fn() } as unknown as MouseEvent
      vm.onCardClick(e)
      expect(e.preventDefault).toHaveBeenCalledOnce()
    })

    it('active mode 點卡片不 preventDefault', () => {
      const vm = useCharacterListCardView(
        () => makeCharacter(),
        () => 'active',
        '24px',
      )
      const e = { preventDefault: vi.fn() } as unknown as MouseEvent
      vm.onCardClick(e)
      expect(e.preventDefault).not.toHaveBeenCalled()
    })
  })
})
