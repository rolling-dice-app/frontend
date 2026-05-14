<template>
  <div class="mx-auto max-w-6xl px-4 pb-6">
    <CommonPageHeader title="Character Detail" :show-back="true">
      <template v-if="character" #actions>
        <NuxtLink
          :to="`/character/${id}/update`"
          class="rounded-sm border border-border bg-surface py-2 w-22 text-center text-content transition-colors hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          {{ t('ui.action.edit') }}
        </NuxtLink>
      </template>
    </CommonPageHeader>

    <!-- Tier 1: SSR idle + client pending 都顯示 loading；
         server: false 時 SSR 初值是 idle，避免落入 NotFound 分支。 -->
    <div
      v-if="status === 'idle' || status === 'pending'"
      class="flex min-h-[60dvh] items-center justify-center text-content-muted"
      role="status"
      aria-live="polite"
    >
      {{ t('ui.state.loading') }}
    </div>

    <!-- Tier 1: 主幹載入失敗 / 找不到 -->
    <CommonNotFound
      v-else-if="status === 'error' || !character"
      :message="t('character.notFound')"
      back-to="/character"
      :back-label="t('character.backToList')"
    />

    <div v-else>
      <Tabs
        v-model="activeTab"
        type="border"
        active-color="var(--color-canvas-elevated)"
        inactive-color="var(--color-canvas)"
        :label="t('character.info')"
      >
        <Tab value="profile">
          <template #label>
            <span class="text-content">{{ t('character.detail') }}</span>
          </template>
          <BusinessCharacterDetailTab :character="character" />
        </Tab>
        <Tab value="combat">
          <template #label>
            <span class="text-content">{{ t('character.combatQuickView') }}</span>
          </template>
          <ClientOnly>
            <BusinessCharacterCombatQuickView :character="character" />
          </ClientOnly>
        </Tab>
        <Tab value="spells">
          <template #label>
            <span class="text-content">{{ t('spell.table') }}</span>
          </template>
          <BusinessCharacterSpellsQuickView />
        </Tab>
        <Tab value="backpack">
          <template #label>
            <span class="text-content">{{ t('character.inventoryTab') }}</span>
          </template>
          <!-- Tier 2: inventory + currency 各自 fetch -->
          <div class="min-h-[40dvh] bg-canvas-elevated p-4">
            <div
              v-if="inventoryPending"
              class="flex min-h-[calc(40dvh-2rem)] items-center justify-center text-content-muted"
              role="status"
              aria-live="polite"
            >
              {{ t('ui.state.loading') }}
            </div>
            <div
              v-else-if="inventoryError || !currency"
              class="flex flex-col items-center gap-3 py-12 text-center"
            >
              <p class="text-danger">{{ t('ui.state.loadFailed') }}</p>
              <button
                type="button"
                class="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-content hover:bg-bg-elevated"
                @click="retryInventory"
              >
                {{ t('ui.state.retry') }}
              </button>
            </div>
            <BusinessCharacterFormInventoryTab
              v-else
              :backpack-items="backpackItems"
              :dimensional-bag-items="dimensionalBagItems"
              :attuned-items="attunedItems"
              :attuned-cap="attunedCap"
              :currency="currency"
              :backpack-load="backpackLoad"
              :max-carry-weight="maxCarryWeight"
              :is-over-encumbered="isOverEncumbered"
              @add-item="(draft) => runInventoryOp(() => inventoryStore.addItem(draft))"
              @remove-item="(itemId) => runInventoryOp(() => inventoryStore.removeItem(itemId))"
              @update-item="
                (itemId, draft) => runInventoryOp(() => inventoryStore.updateItem(itemId, draft))
              "
              @move-item="(itemId) => runInventoryOp(() => inventoryStore.moveItem(itemId))"
              @update-currency="
                (value) => runInventoryOp(() => inventoryStore.updateCurrency(value))
              "
              @update-attunement="
                (slotIndex, itemId) =>
                  runInventoryOp(() => inventoryStore.setAttunement(slotIndex, itemId))
              "
            />
          </div>
        </Tab>
        <Tab value="campaigns">
          <template #label>
            <span class="text-content">{{ t('character.campaign') }}</span>
          </template>
          <BusinessCharacterCampaignsTab
            :entries="campaignEntries"
            :total-exp-earned="campaignTotalExp"
            :is-loading="campaignsLoading"
            :load-error="campaignsLoadError"
            :is-ready="campaignsReady"
            :conflict-signal="campaignConflictSignal"
            @retry="retryCampaigns"
            @add="(draft) => void campaigns.addCampaign(draft)"
            @update="(entryId, draft) => void campaigns.updateCampaign(entryId, draft)"
            @remove="(entryId) => void campaigns.removeCampaign(entryId)"
          />
        </Tab>
      </Tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Tab, Tabs } from '@ui'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()

useHead({ title: t('character.detailTitle') })

const activeTab = ref('profile')

const route = useRoute()
const id = getRouteParam(route.params.id)
const characterStore = useCharacterStore()
const inventoryStore = useCharacterInventoryStore()
const spellsStore = useCharacterSpellsStore()

// Tier 1：主幹 client-only fetch
// 與 list 頁同步：私有資料不進 SSR HTML / payload，避免 Vercel edge cache
// 把某使用者的角色細節共享給其他人。
const { status } = await useAsyncData(
  () => `character-${id}`,
  () => characterStore.loadDetail(id),
  { server: false, lazy: false, watch: [() => id] },
)

const character = computed(() => characterStore.getById(id))

// Tier 2：四個 sub-resource onMounted 平行載入
onMounted(() => {
  void Promise.allSettled([inventoryStore.load(id), spellsStore.load(id), campaigns.load()])
})

onBeforeUnmount(() => {
  spellsStore.flushPending()
  inventoryStore.reset()
  spellsStore.reset()
})

const {
  currency,
  backpackItems,
  dimensionalBagItems,
  attunedItems,
  attunedCap,
  backpackLoad,
  maxCarryWeight,
  isOverEncumbered,
  itemsLoading,
  itemsError,
  currencyLoading,
  currencyError,
} = storeToRefs(inventoryStore)

const inventoryPending = computed(
  () => (itemsLoading.value || currencyLoading.value) && !currency.value,
)
const inventoryError = computed(() => itemsError.value ?? currencyError.value)
const retryInventory = (): void => {
  void inventoryStore.load(id)
}

const campaigns = useCharacterCampaigns(id)
const {
  entries: campaignEntries,
  totalExpEarned: campaignTotalExp,
  isLoading: campaignsLoading,
  loadError: campaignsLoadError,
  isReady: campaignsReady,
  conflictSignal: campaignConflictSignal,
} = campaigns
const retryCampaigns = (): void => {
  void campaigns.load()
}

const apiErrorToast = useApiErrorToast()
const runInventoryOp = async (op: () => Promise<unknown>): Promise<void> => {
  try {
    await op()
  } catch (err) {
    apiErrorToast.handle(err)
  }
}
</script>
