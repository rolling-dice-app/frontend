<template>
  <section
    class="space-y-5 rounded-lg border border-border bg-canvas-elevated p-4"
    aria-labelledby="share-inventory-label"
  >
    <h2 id="share-inventory-label" class="font-display text-lg font-bold text-content">
      {{ t('character.inventoryTab') }}
    </h2>

    <!-- Currency + Attunement -->
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-lg border border-border-soft bg-surface p-3">
        <h3 class="mb-2 text-sm font-semibold text-content">{{ t('inventory.asset') }}</h3>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular">
          <span v-for="coin in coinParts" :key="coin.key">
            <span class="text-content-muted">{{ coin.label }}</span>
            <span class="ml-1 font-medium text-content">{{ coin.value }}</span>
          </span>
        </div>
      </div>

      <div class="rounded-lg border border-border-soft bg-surface p-3">
        <h3 class="mb-2 text-sm font-semibold text-content">
          {{ t('inventory.attunement') }}
          <span class="ml-1 text-xs font-normal text-content-muted">
            {{ attunedItems.length }} / {{ attunedCap }}
          </span>
        </h3>
        <ul v-if="attunedItems.length > 0" class="space-y-1 text-sm text-content-soft">
          <li v-for="item in attunedItems" :key="item.id" class="truncate">{{ item.name }}</li>
        </ul>
        <p v-else class="text-xs text-content-muted">{{ t('inventory.noAttuned') }}</p>
      </div>
    </div>

    <!-- Bag lists -->
    <div class="grid gap-4 sm:grid-cols-2">
      <div v-for="bag in bags" :key="bag.section">
        <h3 class="mb-2 text-sm font-semibold text-content">{{ bag.title }}</h3>
        <p
          v-if="bag.items.length === 0"
          class="rounded-lg border border-dashed border-border-soft px-3 py-6 text-center text-xs text-content-muted"
        >
          {{ t('inventory.emptyBag') }}
        </p>
        <ul v-else class="space-y-2">
          <li
            v-for="item in bag.items"
            :key="item.id"
            class="rounded-lg border border-border-soft bg-surface px-3 py-2"
          >
            <component
              :is="item.description ? 'button' : 'div'"
              :type="item.description ? 'button' : undefined"
              class="flex w-full items-center gap-2 text-left"
              :class="item.description ? 'cursor-pointer' : ''"
              :aria-expanded="item.description ? isExpanded(item.id) : undefined"
              :aria-controls="item.description ? `share-inv-desc-${item.id}` : undefined"
              @click="item.description && toggleExpand(item.id)"
            >
              <div class="min-w-0 flex-1">
                <div class="flex min-w-0 items-center gap-1.5">
                  <p class="min-w-0 flex-1 truncate text-sm font-semibold text-content">
                    {{ item.name }}
                  </p>
                  <Icon
                    v-if="item.isAttuned"
                    name="star"
                    class="shrink-0 text-primary"
                    :size="10"
                    :aria-label="t('inventory.attuned')"
                  />
                  <CommonAppBadge
                    variant="status"
                    size="sm"
                    bg-color="var(--color-surface-3)"
                    class="shrink-0"
                  >
                    <span class="text-content-muted">
                      {{ t(`inventory.itemType.${item.type}`) }}
                    </span>
                  </CommonAppBadge>
                  <Icon
                    v-if="item.description"
                    name="chevron-down"
                    :size="12"
                    class="shrink-0 text-content-muted transition-transform duration-300 ease-in-out"
                    :class="{ 'rotate-180': isExpanded(item.id) }"
                  />
                </div>
              </div>

              <div class="flex shrink-0 items-center gap-3 text-xs text-content-muted tabular">
                <span>×{{ item.quantity }}</span>
                <span class="hidden xxs:inline">
                  {{ formatWeight(item.weight) }} {{ t('inventory.unitWeight') }}
                </span>
                <span class="hidden font-medium text-content xxs:inline">
                  {{ formatWeight(item.weight * item.quantity) }} {{ t('inventory.unitWeight') }}
                </span>
              </div>
            </component>

            <!-- Description panel -->
            <div
              :id="`share-inv-desc-${item.id}`"
              role="region"
              class="grid transition-[grid-template-rows] duration-300 ease-in-out"
              :class="isExpanded(item.id) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
            >
              <div class="overflow-hidden">
                <p class="whitespace-pre-wrap py-1 text-xs text-content-muted">
                  {{ item.description }}
                </p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Weight summary -->
    <div
      class="flex items-center justify-end gap-1.5 text-sm"
      :class="isOverEncumbered ? 'font-semibold text-danger' : 'text-content-muted'"
    >
      <Icon v-if="isOverEncumbered" name="alert-triangle" :size="16" />
      <span>
        {{ t('inventory.load') }} {{ formatWeight(backpackLoad) }} /
        {{ formatWeight(maxCarryWeight) }} {{ t('inventory.unitWeight') }}
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import type { CurrencyAmount, CurrencyKey, SharedCharacterProfileDTO } from '@rolling-dice-app/core'
import type { SharedInventoryItemViewModel } from '~/types/business/share'

const { t } = useI18n()

const props = defineProps<{
  character: SharedCharacterProfileDTO
  items: SharedInventoryItemViewModel[]
  currency: CurrencyAmount
  attunedCap: number
}>()

const expandedIds = ref<Set<string>>(new Set())
const isExpanded = (id: string): boolean => expandedIds.value.has(id)
const toggleExpand = (id: string): void => {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

const backpackBagItems = computed(() => props.items.filter((item) => item.location === 'backpack'))
const dimensionalBagItems = computed(() =>
  props.items.filter((item) => item.location === 'dimensionalBag'),
)

const bags = computed(() => [
  { section: 'backpack', title: t('inventory.backpack'), items: backpackBagItems.value },
  {
    section: 'dimensionalBag',
    title: t('inventory.dimensionalBag'),
    items: dimensionalBagItems.value,
  },
])

const attunedItems = computed(() =>
  props.items.filter((item) => item.isAttuned).slice(0, props.attunedCap),
)

const backpackLoad = computed(() => calculateBackpackLoad(backpackBagItems.value, props.currency))
const maxCarryWeight = computed(() =>
  calculateMaxCarryWeight(getTotalScore(props.character.abilities.strength)),
)
const isOverEncumbered = computed(() => backpackLoad.value > maxCarryWeight.value)

const currencyLabels = computed<Record<CurrencyKey, string>>(() => ({
  cp: t('inventory.cpShort'),
  sp: t('inventory.spShort'),
  gp: t('inventory.gpShort'),
  pp: t('inventory.ppShort'),
}))

const coinParts = computed(() => {
  const keys: CurrencyKey[] = ['pp', 'gp', 'sp', 'cp']
  return keys.map((key) => ({
    key,
    label: currencyLabels.value[key],
    value: props.currency[key],
  }))
})
</script>
