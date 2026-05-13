export const CHARACTER_VIEW_MODE_KEY = 'rd:character-view-mode'

export const ADVENTURES_STORAGE_PREFIX = 'roll-dice:adventures:'

/** 取得指定角色的冒險紀錄 localStorage key（事件流與角色主資料隔離儲存） */
export function getAdventuresStorageKey(characterId: string): string {
  return `${ADVENTURES_STORAGE_PREFIX}${characterId}`
}
