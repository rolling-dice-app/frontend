<template>
  <div class="mx-auto max-w-6xl px-4 pb-6">
    <CommonPageHeader title="Character Detail" :show-back="true">
      <template v-if="character" #actions>
        <button
          type="button"
          disabled
          aria-disabled="true"
          :title="t('ui.readOnly.editTooltip')"
          class="rounded-sm border border-border bg-surface py-2 w-20 text-center text-content-faint cursor-not-allowed opacity-60"
        >
          {{ t('ui.action.edit') }}
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
      {{ t('ui.state.loading') }}
    </div>

    <!-- Error / Not found -->
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
          <BusinessCharacterCombatQuickView :character="character" />
        </Tab>
        <Tab value="spells">
          <template #label>
            <span class="text-content">{{ t('spell.table') }}</span>
          </template>
          <BusinessCharacterSpellsQuickView :character="character" />
        </Tab>
        <Tab value="backpack">
          <template #label>
            <span class="text-content">{{ t('character.inventoryTab') }}</span>
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
import { Tab, Tabs } from '@ui'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()

useHead({ title: t('character.detailTitle') })

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
  toast.error(t('ui.message.editingNotAvailable'))
}
</script>
