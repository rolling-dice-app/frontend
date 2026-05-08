import { ARMOR_TYPE_NAMES } from '~/constants/dnd'
import { ITEM_TYPE_LABELS } from '~/constants/inventory'

/** 庫存相關 enum + 物品 / 同調 / 金幣 / 重量 用詞 */
export default {
  // T1 enum
  armorType: ARMOR_TYPE_NAMES,
  itemType: ITEM_TYPE_LABELS,

  // 物品
  item: '物品',
  addItem: '新增物品',
  editItem: '編輯物品',
  itemName: '名稱',
  itemDescription: '物品說明',
  itemQuantity: '數量',
  typeLabel: '類型',

  // 重量 / 件數
  unitWeight: '磅',
  unitCount: '件',
  coinWeight: '硬幣重量',

  // 存放位置
  backpack: '背包',
  dimensionalBag: '次元袋',

  // 同調 (attunement)
  attunement: '同調',
  attuned: '已同調',
  notAttuned: '未同調',
  detachAttunement: '— 解除同調 —',

  // 金幣
  asset: '資產',
  cp: '銅幣 (cp)',
  sp: '銀幣 (sp)',
  gp: '金幣 (gp)',
  pp: '鉑金幣 (pp)',
}
