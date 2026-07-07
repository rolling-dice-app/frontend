import { ref } from 'vue'
import {
  ABILITY_KEYS,
  buildMonsterTemplateCreateDefaults,
  type AbilityKey,
} from '@rolling-dice-app/core'
import type { MonsterTemplateView } from '~/types/business/monster'

/**
 * 怪物模板開發 fixture（m7.1 UI 階段）。
 *
 * 這是 backend 未串接前的本地暫存資料，採 module-level reactive `ref` 讓列表 / 檢視 /
 * 編輯三頁能共享同一份狀態（建立 → 導向編輯 → 看得到），純為呈現互動。
 * TODO(串接階段): 整份檔案由 `app/stores/monster-template.ts` + api client 取代後刪除。
 */

const buildAbilities = (partial: Partial<Record<AbilityKey, number>>): Record<AbilityKey, number> =>
  ABILITY_KEYS.reduce(
    (acc, key) => {
      acc[key] = partial[key] ?? 10
      return acc
    },
    {} as Record<AbilityKey, number>,
  )

const SEED: MonsterTemplateView[] = [
  {
    id: 'mock-goblin',
    name: '哥布林',
    size: 'small',
    alignment: 'neutralEvil',
    challengeRating: '1/4',
    ac: 15,
    hp: 7,
    speed: '30 ft.',
    initiativeBonus: 2,
    abilities: buildAbilities({
      strength: 8,
      dexterity: 14,
      constitution: 10,
      intelligence: 10,
      wisdom: 8,
      charisma: 8,
    }),
    savingThrows: {},
    skills: { stealth: 6 },
    damageVulnerabilities: null,
    damageResistances: null,
    damageImmunities: null,
    conditionImmunities: null,
    senses: '黑暗視覺 60 ft.，被動察覺 9',
    languages: '通用語、地侏語',
    attacks: [
      {
        id: 'mock-goblin-scimitar',
        name: '彎刀',
        hitBonus: 4,
        damageDice: [
          { id: 'mock-goblin-scimitar-d', count: 1, dieType: 6, bonus: 2, damageType: 'slashing' },
        ],
        comment: null,
      },
      {
        id: 'mock-goblin-bow',
        name: '短弓',
        hitBonus: 4,
        damageDice: [
          { id: 'mock-goblin-bow-d', count: 1, dieType: 6, bonus: 2, damageType: 'piercing' },
        ],
        comment: '射程 80/320 ft.',
      },
    ],
    features: [
      {
        id: 'mock-goblin-nimble',
        name: '靈活逃脫',
        description: '哥布林可在每個回合以附贈動作脫離或躲藏。',
      },
    ],
  },
  {
    id: 'mock-owlbear',
    name: '貓頭鷹熊',
    size: 'large',
    alignment: 'trueNeutral',
    challengeRating: '3',
    ac: 13,
    hp: 59,
    speed: '40 ft.',
    initiativeBonus: 1,
    abilities: buildAbilities({
      strength: 20,
      dexterity: 12,
      constitution: 17,
      intelligence: 3,
      wisdom: 12,
      charisma: 7,
    }),
    savingThrows: {},
    skills: { perception: 3 },
    damageVulnerabilities: null,
    damageResistances: null,
    damageImmunities: null,
    conditionImmunities: null,
    senses: '黑暗視覺 60 ft.，被動察覺 13',
    languages: null,
    attacks: [
      {
        id: 'mock-owlbear-beak',
        name: '喙啄',
        hitBonus: 7,
        damageDice: [
          { id: 'mock-owlbear-beak-d', count: 1, dieType: 10, bonus: 5, damageType: 'piercing' },
        ],
        comment: null,
      },
      {
        id: 'mock-owlbear-claws',
        name: '利爪',
        hitBonus: 7,
        damageDice: [
          { id: 'mock-owlbear-claws-d', count: 2, dieType: 8, bonus: 5, damageType: 'slashing' },
        ],
        comment: null,
      },
    ],
    features: [
      {
        id: 'mock-owlbear-sight',
        name: '敏銳視覺',
        description: '貓頭鷹熊在依賴視覺的察覺檢定上具有優勢。',
      },
    ],
  },
]

/** 共享的怪物模板清單（reactive，跨頁共用）。 */
export const monsterTemplates = ref<MonsterTemplateView[]>(structuredClone(SEED))

/**
 * 預覽用旗標：列表頁「新增」入口是否呈現「達上限」狀態。
 * 走查時手動切 true 可看達上限提示。
 */
export const monsterTemplatesAtLimit = ref(false)

/** 依 id 取單筆（回傳實體引用，編輯頁需先自行 clone 再改）。 */
export function getMonsterTemplate(id: string): MonsterTemplateView | undefined {
  return monsterTemplates.value.find((m) => m.id === id)
}

/**
 * 建立頁用的空白草稿（保守預設）；`id` 留空，避免 SSR/CSR 產生不同 UUID，
 * 真正 id 於存檔（addMonsterTemplate）時才配。
 */
export function buildDefaultMonsterView(): MonsterTemplateView {
  return { id: '', name: '', ...buildMonsterTemplateCreateDefaults() }
}

/** 把一筆完整草稿加入清單（於 client 存檔時呼叫），配發新 id 後回傳。 */
export function addMonsterTemplate(view: MonsterTemplateView): MonsterTemplateView {
  const created: MonsterTemplateView = { ...structuredClone(view), id: crypto.randomUUID() }
  monsterTemplates.value.push(created)
  return created
}

/** 永久移除一筆（無 trash / restore）。 */
export function removeMonsterTemplate(id: string): void {
  const index = monsterTemplates.value.findIndex((m) => m.id === id)
  if (index !== -1) monsterTemplates.value.splice(index, 1)
}

/** 示意寫回：以編輯結果覆寫對應的怪物（本階段不送後端）。 */
export function saveMonsterTemplate(next: MonsterTemplateView): void {
  const index = monsterTemplates.value.findIndex((m) => m.id === next.id)
  if (index !== -1) monsterTemplates.value[index] = structuredClone(next)
}
