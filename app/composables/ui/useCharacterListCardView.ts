import { type MaybeRefOrGetter, computed, onMounted, ref, toValue, watch } from 'vue'
import { RESTORE_COOLDOWN_DAYS } from '@rolling-dice-app/core'
import type { CharacterTier } from '~/helpers/character'
import type { CharacterListItem } from '~/types/business/character-list'
import { CLASS_IMAGES } from '~/utils/images'
import placeholderCover from '~/assets/images/rolling-dice.png'

interface TierStyle {
  textColor: string
  badgeBg: string
  shadowRgb: string
}

const TIER_CONFIG: Record<CharacterTier, TierStyle> = {
  common: {
    textColor: 'var(--rd--color-text-muted)',
    badgeBg: 'var(--rd--tier-common-soft)',
    shadowRgb: '160, 150, 140',
  },
  elite: {
    textColor: 'var(--rd--tier-elite)',
    badgeBg: 'var(--rd--tier-elite-soft)',
    shadowRgb: '74, 158, 108',
  },
  master: {
    textColor: 'var(--rd--tier-master)',
    badgeBg: 'var(--rd--tier-master-soft)',
    shadowRgb: '74, 122, 207',
  },
  legendary: {
    textColor: 'var(--rd--color-primary)',
    badgeBg: 'var(--rd--color-primary-soft)',
    shadowRgb: '184, 134, 14',
  },
}

const COOLDOWN_MS = RESTORE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000

/**
 * 角色列表卡片（grid `Card` / list `Item`）的共用 view-model：tier 配色、glow style、
 * 封面圖、刪除冷卻 pre-check 與導頁攔截。兩種版型差異僅 glow 半徑與 `Card` 多畫一個職業 icon，
 * 故以 `glowRadius` 參數化、另回傳 `firstClassKey` 供 `Card` 決定是否渲染職業 icon。
 */
export function useCharacterListCardView(
  character: MaybeRefOrGetter<CharacterListItem>,
  mode: MaybeRefOrGetter<'active' | 'trashed'>,
  glowRadius: string,
) {
  const char = computed(() => toValue(character))

  // 卡片背景區塊在 trash mode 不導頁；restore 鈕另以 @click.prevent.stop 保證不冒泡到此。
  const onCardClick = (e: MouseEvent): void => {
    if (toValue(mode) === 'trashed') e.preventDefault()
  }

  // 剛還原的角色 RESTORE_COOLDOWN_DAYS 天內擋 DELETE（後端權威；前端 pre-empt disable 刪除鈕）。
  // now 為 client-derived，避免 SSR 首幀與 client 首幀不一致造成 hydration mismatch。
  const now = ref<number | null>(null)
  onMounted(() => {
    now.value = Date.now()
  })
  const isInDeleteCooldown = computed(() => {
    if (now.value === null || !char.value.restoredAt) return false
    return new Date(char.value.restoredAt).getTime() + COOLDOWN_MS > now.value
  })

  const totalLevel = computed(() => calculateTotalLevel(char.value.classes))
  const tier = computed(() => getCharacterTier(totalLevel.value))
  const tierConfig = computed(() => TIER_CONFIG[tier.value])
  const isMaxLevel = computed(() => totalLevel.value === 20)

  // tier-glow 強度/顏色由 .tier-glow class 用 token calc() 算（design-language §9）；
  // 此處只餵 tier 色 RGB、總等級與卡片半徑（grid 24px / list 16px）。
  const tierGlowStyle = computed(() => ({
    '--tier-glow-rgb': tierConfig.value.shadowRgb,
    '--tier-glow-level': totalLevel.value,
    '--tier-glow-radius': glowRadius,
  }))

  // 首個職業：空 classes（畸形資料）時為 null —— 不渲染職業 icon、封面退回 placeholder。
  const firstClassKey = computed(() => char.value.classes[0]?.classKey ?? null)

  const coverError = ref(false)
  watch(
    () => char.value.avatar,
    () => {
      coverError.value = false
    },
  )

  const hasAvatar = computed(() => !!char.value.avatar && !coverError.value)
  const coverSrc = computed(() => {
    if (hasAvatar.value) return char.value.avatar!
    const key = firstClassKey.value
    return (key && CLASS_IMAGES[key]) || placeholderCover
  })

  const onCoverError = (): void => {
    coverError.value = true
  }

  return {
    onCardClick,
    isInDeleteCooldown,
    totalLevel,
    tierConfig,
    isMaxLevel,
    tierGlowStyle,
    firstClassKey,
    hasAvatar,
    coverSrc,
    onCoverError,
  }
}
