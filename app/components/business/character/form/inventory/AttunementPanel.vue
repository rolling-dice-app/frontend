<template>
  <div class="space-y-2">
    <h2 class="font-display text-lg font-bold text-content">同調</h2>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div v-for="slot in ATTUNEMENT_SLOT_COUNT" :key="slot">
        <label :for="`attunement-slot-${slot}`" class="mb-1 block text-xs text-content-muted">
          Slot {{ slot }}
        </label>
        <CommonAppSelect
          :id="`attunement-slot-${slot}`"
          size="sm"
          :model-value="attunedItems[slot - 1]?.id ?? null"
          :options="optionsForSlot(slot - 1)"
          placeholder="未同調"
          searchable
          class="w-full"
          @update:model-value="(v: string | number | null) => onChange(slot - 1, v)"
        />
      </div>
    </div>
    <p class="text-xs text-content-muted">
      已同調：{{ attunedCount }} / {{ ATTUNEMENT_SLOT_COUNT }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { SelectItem, SelectOptionGroup } from '@ui'
import { ATTUNEMENT_SLOT_COUNT, ITEM_TYPE_LABELS } from '~/constants/inventory'
import type { InventoryItem, ItemType } from '@rolling-dice-app/types'

const props = defineProps<{
  allItems: InventoryItem[]
  attunedItems: InventoryItem[]
}>()

const emit = defineEmits<{
  update: [slotIndex: number, itemId: string | null]
}>()

const attunedCount = computed(() => props.attunedItems.length)

const optionsForSlot = (slotIndex: number): SelectItem[] => {
  const occupiedByOthers = new Set(
    props.attunedItems
      .map((item, idx) => (idx === slotIndex ? null : item.id))
      .filter((id): id is string => id !== null),
  )

  const result: SelectItem[] = [{ value: 'none', label: '— 解除同調 —' }]
  for (const [type, label] of Object.entries(ITEM_TYPE_LABELS) as [ItemType, string][]) {
    const options = props.allItems
      .filter((item) => item.type === type)
      .map((item) => ({
        value: item.id,
        label: item.name,
        disabled: occupiedByOthers.has(item.id),
      }))
    if (options.length === 0) continue
    result.push({ group: label, options } satisfies SelectOptionGroup)
  }
  return result
}

const onChange = (slotIndex: number, value: string | number | null): void => {
  if (value === null || value === 'none') {
    emit('update', slotIndex, null)
    return
  }
  emit('update', slotIndex, String(value))
}
</script>
