<template>
  <div class="mx-auto max-w-6xl px-4 pb-6">
    <CommonPageHeader title="Character Detail" :show-back="true">
      <template v-if="character" #actions>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="編輯功能尚未開放"
          class="rounded-sm border border-border bg-surface py-2 w-20 text-center text-content-faint cursor-not-allowed opacity-60"
        >
          編輯
        </button>
      </template>
    </CommonPageHeader>

    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="flex min-h-[60dvh] items-center justify-center text-content-muted"
      role="status"
      aria-live="polite"
    >
      載入中...
    </div>

    <!-- Error / Not found -->
    <CommonNotFound
      v-else-if="status === 'error' || !character"
      message="找不到此角色"
      back-to="/character"
      back-label="返回角色列表"
    />

    <div v-else>
      <!-- Read-only banner -->
      <div
        class="mb-4 rounded-md border border-border bg-surface px-4 py-3 text-sm text-content-muted"
        role="status"
      >
        目前為唯讀模式，背包與冒險編輯尚未開放，待後端編輯端點上線後恢復。
      </div>

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
            @add-item="notifyReadOnly"
            @remove-item="notifyReadOnly"
            @update-item="notifyReadOnly"
            @move-item="notifyReadOnly"
            @update-currency="notifyReadOnly"
            @update-attunement="notifyReadOnly"
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
            @add="notifyReadOnly"
            @update="notifyReadOnly"
            @remove="notifyReadOnly"
            @update:sync-money-to-currency="notifyReadOnly"
          />
        </Tab>
      </Tabs>
    </div>
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

const { status } = await useAsyncData(
  () => `character-${id}`,
  () => characterStore.loadDetail(id),
  { lazy: false, watch: [() => id] },
)

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
const notifyReadOnly = () => {
  toast.error('編輯功能尚未開放')
}
</script>
