import type { BattlefieldFaction } from '~/types/business/battlefield'

/** 陣營圓點底色（完整 class 字串，Tailwind 掃描需要字面值） */
export const FACTION_DOT_CLASS: Readonly<Record<BattlefieldFaction, string>> = {
  player: 'bg-faction-player',
  enemy: 'bg-faction-enemy',
  neutral: 'bg-faction-neutral',
}

/** 陣營 chip：soft 底 + 陣營主色文字 */
export const FACTION_CHIP_CLASS: Readonly<Record<BattlefieldFaction, string>> = {
  player: 'bg-faction-player-soft text-faction-player',
  enemy: 'bg-faction-enemy-soft text-faction-enemy',
  neutral: 'bg-faction-neutral-soft text-faction-neutral',
}

/** 陣營切換 segment 順序（demo 排序） */
export const FACTION_ORDER: readonly BattlefieldFaction[] = ['player', 'enemy', 'neutral']
