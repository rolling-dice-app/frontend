<template>
  <div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
    <CommonPageHeader :title="character?.name || ''" :show-back="true">
      <template v-if="character" #actions>
        <NuxtLink
          :to="`/character/${id}/update`"
          class="ml-auto rounded-sm border border-border bg-surface py-2 w-22 text-center text-content transition-colors hover:bg-canvas-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
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

    <!-- Tier 1: 真 404 / 載入後查無角色 -->
    <CommonNotFound
      v-else-if="isNotFound"
      :message="t('character.notFound')"
      back-to="/character"
      :back-label="t('character.backToList')"
    />

    <!-- Tier 1: 暫時性錯誤，可重試 -->
    <div
      v-else-if="isTransientError"
      class="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center"
      role="alert"
    >
      <p class="text-danger">{{ t('ui.state.loadFailed') }}</p>
      <CommonAppButton variant="warning" @click="retryDetail">
        {{ t('ui.state.retry') }}
      </CommonAppButton>
    </div>

    <div v-else-if="character">
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
          <BusinessCharacterDetailProfileTab :character="character" />
        </Tab>
        <Tab value="combat">
          <template #label>
            <span class="text-content">{{ t('character.combatQuickView') }}</span>
          </template>
          <ClientOnly>
            <BusinessCharacterDetailCombatQuickView
              ref="combatQuickViewRef"
              :character="character"
            />
          </ClientOnly>
        </Tab>
        <Tab value="spells">
          <template #label>
            <span class="text-content">{{ t('spell.table') }}</span>
          </template>
          <BusinessCharacterDetailSpellsQuickView />
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
              <CommonAppButton variant="warning" @click="retryInventory">
                {{ t('ui.state.retry') }}
              </CommonAppButton>
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
          <BusinessCharacterDetailCampaignsTab
            :entries="campaignEntries"
            :total-exp-earned="campaignTotalExp"
            :is-loading="campaignsLoading"
            :load-error="campaignsLoadError"
            :is-ready="campaignsReady"
            :conflict-signal="campaignConflictSignal"
            :add-campaign="campaigns.addCampaign"
            :update-campaign="campaigns.updateCampaign"
            @retry="retryCampaigns"
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

// key 綁 route.params.id：直接切換 /character/a → /character/b（同 route record）時整頁 remount，
// 讓以常數捕獲 id 的子 composable（campaigns / combat state）都以新 id 重跑 setup。
definePageMeta({
  middleware: 'auth',
  noindex: true,
  key: (route) => route.params.id as string,
})

const { t } = useI18n()

useHead({ title: t('character.detailTitle') })

const activeTab = ref('profile')

const route = useRoute()
const id = getRouteParam(route.params.id)
const characterStore = useCharacterStore()
const inventoryStore = useCharacterInventoryStore()
const spellsStore = useCharacterSpellsStore()

const combatQuickViewRef = useTemplateRef<{ flushPersist: () => Promise<void> }>(
  'combatQuickViewRef',
)

// Tier 1：主幹 client-only fetch
// 與 list 頁同步：私有資料不進 SSR HTML / payload，避免 Vercel edge cache
// 把某使用者的角色細節共享給其他人。
// id 在本次 mount 內恆定（route 變動走 page key remount），故不需 watch。
const { status, error, refresh } = useAsyncData(
  () => `character-${id}`,
  () => characterStore.loadDetail(id),
  { server: false, lazy: true },
)

const character = computed(() => characterStore.getById(id))

// 真 404（角色不存在）走 NotFound；其餘暫時性錯誤走可重試三態。
const isNotFound = computed(
  () =>
    (status.value === 'error' && isFetchError(error.value) && error.value.statusCode === 404) ||
    (status.value === 'success' && !character.value),
)
const isTransientError = computed(() => status.value === 'error' && !isNotFound.value)
const retryDetail = (): void => {
  void refresh()
}

// Tier 2：主角色載入成功且存在後，才平行載四個 sub-resource，
// 避免角色不存在 / 載入失敗時仍對子資源發出注定無意義的 GET。
watch(
  () => status.value === 'success' && !!character.value,
  (ready) => {
    if (ready) {
      void Promise.allSettled([inventoryStore.load(id), spellsStore.load(id), campaigns.load()])
    }
  },
  { immediate: true },
)

// 路由離開時 await 戰況 quickview 的 flushPersist 保存最後一次寫入；
// 此 hook 在 unmount 前 fire 且支援 await，比 onBeforeUnmount 的 fire-and-forget 更可靠。
// store 清理也放這裡：Suspense 下 onBeforeUnmount 會晚於下一頁的 load() 而把它蓋掉，
// route-leave 相對下一頁 setup 有明確先後，能保證「先 reset 再由下一頁 load」。
onBeforeRouteLeave(async () => {
  await combatQuickViewRef.value?.flushPersist()
  await spellsStore.flushPending()
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
