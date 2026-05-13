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

    <!-- Tier 1: 主幹 SSR loading -->
    <div
      v-if="status === 'pending'"
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
      <!-- Read-only banner -->
      <div
        class="mb-4 rounded-md border border-border bg-surface px-4 py-3 text-sm text-content-muted"
        role="status"
      >
        {{ t('ui.readOnly.detailBanner') }}
      </div>

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
              @add-item="notifyReadOnly"
              @remove-item="notifyReadOnly"
              @update-item="notifyReadOnly"
              @move-item="notifyReadOnly"
              @update-currency="notifyReadOnly"
              @update-attunement="notifyReadOnly"
            />
          </div>
        </Tab>
        <Tab value="adventures">
          <template #label>
            <span class="text-content">{{ t('character.adventure') }}</span>
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

// Tier 1：主幹 SSR
const { status } = await useAsyncData(
  () => `character-${id}`,
  () => characterStore.loadDetail(id),
  { lazy: false, watch: [() => id] },
)

const character = computed(() => characterStore.getById(id))

// Tier 2：三個 sub-resource onMounted 平行載入
onMounted(() => {
  void Promise.allSettled([inventoryStore.load(id), spellsStore.load(id)])
})

onBeforeUnmount(() => {
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

const adventures = useCharacterAdventures(id)
const { entries: adventureEntries, totalExpEarned, syncMoneyToCurrency } = adventures

const toast = useToast()
const notifyReadOnly = (): void => {
  toast.error(t('ui.message.editingNotAvailable'))
}
</script>
