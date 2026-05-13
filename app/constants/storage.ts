export const CHARACTER_VIEW_MODE_KEY = 'rd:character-view-mode'

export const CAMPAIGNS_STORAGE_PREFIX = 'roll-dice:campaigns:'

/** 取得指定角色的戰役紀錄 localStorage key（事件流與角色主資料隔離儲存） */
export function getCampaignsStorageKey(characterId: string): string {
  return `${CAMPAIGNS_STORAGE_PREFIX}${characterId}`
}
