<template>
  <div class="space-y-4">
    <!-- Currency + Attunement (parallel) -->
    <div class="grid gap-4 md:grid-cols-2">
      <BusinessCharacterFormInventoryCurrencyPanel
        :currency="currency"
        @update:currency="$emit('update-currency', $event)"
      />
      <BusinessCharacterFormInventoryAttunementPanel
        :all-items="allItems"
        :attuned-items="attunedItems"
        :cap="attunedCap"
        @update="(slotIndex, itemId) => $emit('update-attunement', slotIndex, itemId)"
      />
    </div>

    <!-- Bag lists -->
    <div class="grid gap-4 md:grid-cols-2">
      <BusinessCharacterFormInventoryItemList
        :items="backpackItems"
        :total-item-count="allItems.length"
        section="backpack"
        :title="t('inventory.backpack')"
        @add="$emit('add-item', $event)"
        @remove="$emit('remove-item', $event)"
        @update="(id, draft) => $emit('update-item', id, draft)"
        @move-item="$emit('move-item', $event)"
      />
      <BusinessCharacterFormInventoryItemList
        :items="dimensionalBagItems"
        :total-item-count="allItems.length"
        section="dimensionalBag"
        :title="t('inventory.dimensionalBag')"
        @add="$emit('add-item', $event)"
        @remove="$emit('remove-item', $event)"
        @update="(id, draft) => $emit('update-item', id, draft)"
        @move-item="$emit('move-item', $event)"
      />
    </div>

    <!-- Weight summary -->
    <div
      class="flex items-center justify-end gap-1.5"
      :class="isOverEncumbered ? 'font-semibold text-danger' : 'text-content-muted'"
    >
      <span v-if="isOverEncumbered" class="flex items-center gap-0.5">
        <Icon name="alert-triangle" :size="16" />
      </span>
      <span>
        {{ t('inventory.load') }} {{ formatWeight(backpackLoad) }} /
        {{ formatWeight(maxCarryWeight) }} {{ t('inventory.unitWeight') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import { formatWeight } from '~/helpers/inventory'
import type { CharacterCurrencyDTO, InventoryItemDTO } from '@rolling-dice-app/core'
import type { InventoryItemDraft } from '~/types/business/character-form'

const { t } = useI18n()

const props = defineProps<{
  backpackItems: InventoryItemDTO[]
  dimensionalBagItems: InventoryItemDTO[]
  attunedItems: InventoryItemDTO[]
  attunedCap: number
  currency: CharacterCurrencyDTO
  backpackLoad: number
  maxCarryWeight: number
  isOverEncumbered: boolean
}>()

defineEmits<{
  'add-item': [draft: InventoryItemDraft]
  'remove-item': [id: string]
  'update-item': [id: string, draft: InventoryItemDraft]
  'move-item': [id: string]
  'update-currency': [value: CharacterCurrencyDTO]
  'update-attunement': [slotIndex: number, itemId: string | null]
}>()

const allItems = computed(() => [...props.backpackItems, ...props.dimensionalBagItems])
</script>
