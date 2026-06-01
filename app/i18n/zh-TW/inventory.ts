import type { ArmorType, InventoryLocation, ItemType } from '@rolling-dice-app/core'

const armorType: Readonly<Record<ArmorType, string>> = {
  none: '無甲',
  light: '輕甲',
  medium: '中甲',
  heavy: '重甲',
}

/** 存放位置 label；綁定 core InventoryLocation 以確保涵蓋全 enum（spread 回 default 保留 t('inventory.backpack') 存取） */
const location: Readonly<Record<InventoryLocation, string>> = {
  backpack: '背包',
  dimensionalBag: '次元袋',
}

const itemType: Readonly<Record<ItemType, string>> = {
  weapon: '武器',
  armor: '護甲',
  consumable: '消耗品',
  other: '其他',
}

/** 庫存相關 enum + 物品 / 同調 / 金幣 / 重量 用詞 */
export default {
  // T1 enum
  armorType,
  itemType,
  // 存放位置（flat 存取：t('inventory.backpack') / t('inventory.dimensionalBag')）
  ...location,

  // 物品
  item: '物品',
  addItem: '新增物品',
  editItem: '編輯物品',
  itemLimitReached: '物品數量已達上限，請先刪除舊項目',
  itemName: '名稱',
  itemDescription: '物品說明',
  itemDescriptionOptional: '描述（選填）',
  itemQuantity: '數量',
  typeLabel: '類型',
  weightLabel: '重量（磅/件）',
  totalWeight: '總重',
  moveTo: '移至另一袋',

  // 重量 / 件數
  unitWeight: '磅',
  unitCount: '件',
  coinWeight: '硬幣重量',
  load: '負重',

  // 同調 (attunement)
  attunement: '同調',
  attuned: '已同調',
  notAttuned: '未同調',
  noAttuned: '無同調物品',
  detachAttunement: '— 解除同調 —',

  // 唯讀檢視
  emptyBag: '無物品',

  // 金幣
  asset: '資產',
  editCurrency: '編輯資產',
  cp: '銅幣 (cp)',
  sp: '銀幣 (sp)',
  gp: '金幣 (gp)',
  pp: '鉑金幣 (pp)',
  cpName: '銅幣',
  spName: '銀幣',
  gpName: '金幣',
  ppName: '鉑金',
  cpShort: '銅',
  spShort: '銀',
  gpShort: '金',
  ppShort: '鉑',
  noMoneyEarned: '無金錢獲得',
  expGained: '經驗',
  emptyContent: '（無內容）',
}
