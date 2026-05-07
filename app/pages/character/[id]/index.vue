<template>
  <div class="mx-auto max-w-6xl px-4 pb-6">
    <CommonPageHeader title="Character Detail" :show-back="true">
      <template #actions>
        <NuxtLink
          v-if="character"
          :to="`/character/${character.id}/update`"
          class="rounded-sm border border-border bg-surface py-2 w-20 text-center text-content-soft transition-colors hover:bg-surface-2 hover:text-content"
        >
          編輯
        </NuxtLink>
      </template>
    </CommonPageHeader>

    <div v-if="character">
      <Tabs
        v-model="activeTab"
        type="border"
        active-color="var(--color-canvas-elevated)"
        inactive-color="var(--color-canvas)"
        label="角色資訊"
      >
        <Tab value="profile">
          <template #label>
            <span class="text-content">角色詳情</span>
          </template>
          <BusinessCharacterDetailTab :character="character" />
        </Tab>
        <Tab value="combat">
          <template #label>
            <span class="text-content">戰鬥速查</span>
          </template>
          <BusinessCharacterCombatQuickView :character="character" />
        </Tab>
        <Tab value="spells">
          <template #label>
            <span class="text-content">法術表</span>
          </template>
          <BusinessCharacterSpellsQuickView :character="character" />
        </Tab>
        <Tab value="backpack">
          <template #label>
            <span class="text-content">背包</span>
          </template>
          <BusinessCharacterFormInventoryTab
            :backpack-items="backpackItems"
            :dimensional-bag-items="dimensionalBagItems"
            :attuned-items="attunedItems"
            :currency="currency"
            :backpack-load="backpackLoad"
            :max-carry-weight="maxCarryWeight"
            :is-over-encumbered="isOverEncumbered"
            @add-item="addItem"
            @remove-item="removeItem"
            @update-item="updateItem"
            @move-item="moveItem"
            @update-currency="updateCurrency"
            @update-attunement="setAttunement"
          />
        </Tab>
        <Tab value="adventures">
          <template #label>
            <span class="text-content">冒險</span>
          </template>
          <BusinessCharacterAdventuresTab
            :entries="adventureEntries"
            :total-exp-earned="totalExpEarned"
            :sync-money-to-currency="syncMoneyToCurrency"
            @add="addAdventure"
            @update="updateAdventure"
            @remove="removeAdventure"
            @update:sync-money-to-currency="setSyncMoneyToCurrency"
          />
        </Tab>
      </Tabs>
    </div>

    <CommonNotFound v-else message="找不到此角色" back-to="/character" back-label="返回角色列表" />
  </div>
</template>

<script setup lang="ts">
import { Tab, Tabs } from '@ui'

definePageMeta({ middleware: 'auth' })

useHead({ title: '角色卡詳情' })

const activeTab = ref('profile')

const route = useRoute()
const id = getRouteParam(route.params.id)
const characterStore = useCharacterStore()
const character = computed(() => characterStore.getById(id))

const inventory = useCharacterInventory(id)
const adventures = useCharacterAdventures(id)

const {
  currency,
  backpackItems,
  dimensionalBagItems,
  attunedItems,
  backpackLoad,
  maxCarryWeight,
  isOverEncumbered,
} = inventory
const { entries: adventureEntries, totalExpEarned, syncMoneyToCurrency } = adventures

const toast = useToast()
function withSaveErrorToast<TArgs extends unknown[]>(
  action: (...args: TArgs) => boolean,
): (...args: TArgs) => void {
  return (...args) => {
    if (!action(...args)) toast.error('儲存失敗，請稍後再試')
  }
}

const addItem = withSaveErrorToast(inventory.addItem)
const removeItem = withSaveErrorToast(inventory.removeItem)
const updateItem = withSaveErrorToast(inventory.updateItem)
const moveItem = withSaveErrorToast(inventory.moveItem)
const updateCurrency = withSaveErrorToast(inventory.updateCurrency)
const setAttunement = withSaveErrorToast(inventory.setAttunement)

const addAdventure = withSaveErrorToast(adventures.addAdventure)
const updateAdventure = withSaveErrorToast(adventures.updateAdventure)
const removeAdventure = withSaveErrorToast(adventures.removeAdventure)
const setSyncMoneyToCurrency = withSaveErrorToast(adventures.setSyncMoneyToCurrency)
</script>
