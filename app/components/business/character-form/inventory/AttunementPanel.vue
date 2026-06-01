<template>
  <div class="space-y-2">
    <h2 class="font-display text-lg font-bold text-content">{{ t('inventory.attunement') }}</h2>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div v-for="slot in cap" :key="slot">
        <label :for="`attunement-slot-${slot}`" class="mb-1 block text-xs text-content-muted">
          Slot {{ slot }}
        </label>
        <CommonAppSelect
          :id="`attunement-slot-${slot}`"
          size="sm"
          :model-value="attunedItems[slot - 1]?.id ?? null"
          :options="optionsForSlot(slot - 1)"
          :placeholder="t('inventory.notAttuned')"
          :disabled="isSlotPending(slot - 1)"
          searchable
          class="w-full"
          @update:model-value="(v: string | number | null) => onChange(slot - 1, v)"
        />
      </div>
    </div>
    <p class="text-xs text-content-muted">
      {{ t('inventory.attuned') }}：{{ attunedCount }} / {{ cap }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { SelectItem, SelectOptionGroup } from '@ui'
import { ITEM_TYPES, type InventoryItemDTO } from '@rolling-dice-app/core'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    allItems: InventoryItemDTO[]
    attunedItems: InventoryItemDTO[]
    /** 同調上限；由 useCharacterInventoryStore 的 attunedCap getter（呼叫 core computeAttunedLimit）取得 */
    cap: number
    /** patch in-flight 的 item id；slot 目前同調 item 在此集合內時鎖該 slot，防樂觀鎖 conflict */
    pendingItemIds?: Set<string>
  }>(),
  { pendingItemIds: () => new Set() },
)

const emit = defineEmits<{
  update: [slotIndex: number, itemId: string | null]
}>()

const attunedCount = computed(() => props.attunedItems.length)

const isSlotPending = (slotIndex: number): boolean => {
  const current = props.attunedItems[slotIndex]
  return current ? props.pendingItemIds.has(current.id) : false
}

const optionsForSlot = (slotIndex: number): SelectItem[] => {
  const occupiedByOthers = new Set(
    props.attunedItems
      .map((item, idx) => (idx === slotIndex ? null : item.id))
      .filter((id): id is string => id !== null),
  )

  const result: SelectItem[] = [{ value: 'none', label: t('inventory.detachAttunement') }]
  for (const type of ITEM_TYPES) {
    const options = props.allItems
      .filter((item) => item.type === type)
      .map((item) => ({
        value: item.id,
        label: item.name,
        disabled: occupiedByOthers.has(item.id),
      }))
    if (options.length === 0) continue
    result.push({ group: t(`inventory.itemType.${type}`), options } satisfies SelectOptionGroup)
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
