<template>
  <div
    class="min-w-0 rounded-lg border-2 transition-colors duration-150"
    :class="isDragOver ? 'border-primary bg-primary/5' : 'border-transparent'"
    @dragover.prevent
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="rounded-lg border border-border-soft bg-canvas-elevated">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border-soft px-4 py-3">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold text-content">{{ title }}</h3>
          <span class="text-xs text-content-muted">
            {{ items.length }} {{ t('inventory.unitCount') }}
          </span>
        </div>
        <span class="text-xs text-content-muted">
          {{ t('inventory.totalWeight') }}：<span class="font-medium text-content">
            {{ formatWeight(totalWeight) }} </span
          >{{ t('inventory.unitWeight') }}
        </span>
      </div>

      <!-- Item rows -->
      <ul class="divide-y divide-border-soft">
        <!-- Add row -->
        <li>
          <button
            type="button"
            :aria-label="t('inventory.addItem')"
            class="flex w-full items-center justify-center py-3 text-content-muted transition-colors duration-150 hover:bg-surface hover:text-content"
            @click="openCreate"
          >
            <span class="text-lg leading-none">+</span>
          </button>
        </li>

        <li
          v-for="item in items"
          :key="item.id"
          :draggable="!props.pendingItemIds.has(item.id)"
          class="cursor-grab px-3 py-2 active:cursor-grabbing"
          @dragstart="onDragStart($event, item.id)"
          @dragend="$emit('drag-end')"
          @click="item.description && toggleExpand(item.id)"
        >
          <div class="flex items-center gap-2">
            <!-- Drag handle -->
            <Icon name="list" :size="14" class="shrink-0 text-content-muted" />

            <div class="min-w-0 flex-1">
              <!-- Name -->
              <div class="flex min-w-0 items-center gap-1.5">
                <p class="min-w-0 flex-1 truncate text-sm text-content">{{ item.name }}</p>
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
                  <span class="text-content-muted">{{ t(`inventory.itemType.${item.type}`) }}</span>
                </CommonAppBadge>
              </div>

              <div class="mt-1 flex items-center justify-between gap-3">
                <!-- Stats -->
                <div class="flex items-center gap-3 text-xs text-content-muted">
                  <span>×{{ item.quantity }}</span>
                  <span class="hidden xxs:inline">
                    {{ formatWeight(item.weight) }} {{ t('inventory.unitWeight') }}
                  </span>
                  <span class="font-medium text-content hidden xxs:inline">
                    {{ formatWeight(item.weight * item.quantity) }} {{ t('inventory.unitWeight') }}
                  </span>
                </div>

                <!-- Actions -->
                <div class="flex shrink-0 gap-1">
                  <!-- Move button (always visible for mobile convenience) -->
                  <button
                    type="button"
                    :aria-label="`${t('inventory.moveTo')}：${item.name}`"
                    :disabled="props.pendingItemIds.has(item.id)"
                    class="flex size-7 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-raised hover:text-content disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-content-muted"
                    @click.stop="$emit('move-item', item.id)"
                  >
                    <Icon name="arrow-left-right" class="rotate-90 md:rotate-0" :size="12" />
                  </button>
                  <button
                    type="button"
                    :aria-label="`${t('ui.action.edit')} ${item.name}`"
                    :disabled="props.pendingItemIds.has(item.id)"
                    class="flex size-7 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-raised hover:text-content disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-content-muted"
                    @click.stop="openEdit(item)"
                  >
                    <Icon name="edit" :size="14" />
                  </button>
                  <button
                    type="button"
                    :aria-label="`${t('ui.action.delete')} ${item.name}`"
                    class="flex size-7 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:text-danger-hover"
                    @click.stop="$emit('remove', item.id)"
                  >
                    <Icon name="trash" :size="14" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Expand toggle (far right, vertically centered) -->
            <button
              v-if="item.description"
              type="button"
              :aria-expanded="isExpanded(item.id)"
              :aria-controls="`inv-item-desc-${item.id}`"
              :aria-label="`${
                isExpanded(item.id) ? t('ui.action.collapse') : t('ui.action.expand')
              } ${item.name}`"
              class="flex size-7 shrink-0 items-center justify-center rounded text-content-muted transition-colors duration-150 hover:text-content"
              @click.stop="toggleExpand(item.id)"
            >
              <Icon
                name="chevron-down"
                :size="14"
                class="transition-transform duration-300 ease-in-out"
                :class="{ 'rotate-180': isExpanded(item.id) }"
              />
            </button>
          </div>

          <!-- Description panel -->
          <div
            :id="`inv-item-desc-${item.id}`"
            role="region"
            class="grid transition-[grid-template-rows] duration-300 ease-in-out"
            :class="isExpanded(item.id) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
          >
            <div class="overflow-hidden">
              <p class="whitespace-pre-wrap px-6 pb-2 pt-1 text-xs text-content-muted">
                {{ item.description }}
              </p>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>

  <!-- Add / Edit Modal -->
  <Modal
    v-model="modalOpen"
    :title="editingId ? t('inventory.editItem') : t('inventory.addItem')"
    size="md"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
  >
    <div class="space-y-4">
      <!-- Name + Type -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="flex-1">
          <label for="item-modal-name" class="mb-1 block text-xs text-content">
            {{ t('inventory.itemName') }}
          </label>
          <CommonAppInput
            id="item-modal-name"
            :radius="0"
            :model-value="draft.name"
            size="sm"
            outline
            class="w-full"
            @update:model-value="draft.name = $event"
          />
        </div>
        <div>
          <label for="item-modal-type" class="mb-1 block text-xs text-content">
            {{ t('inventory.typeLabel') }}
          </label>
          <CommonAppSelect
            id="item-modal-type"
            :model-value="draft.type"
            :options="typeOptions"
            size="sm"
            class="w-28"
            @update:model-value="draft.type = $event as ItemType"
          />
        </div>
      </div>

      <!-- Quantity + Weight -->
      <div class="flex gap-3">
        <div class="w-24">
          <label for="item-modal-quantity" class="mb-1 block text-xs text-content">
            {{ t('inventory.itemQuantity') }}
          </label>
          <CommonAppInput
            id="item-modal-quantity"
            type="number"
            min="1"
            step="1"
            size="sm"
            outline
            :model-value="String(draft.quantity)"
            class="w-full"
            @update:model-value="
              draft.quantity = Math.max(
                1,
                parseIntegerInput($event, 1, CHARACTER_INT_LIMITS.GENERAL_INT_MAX),
              )
            "
          />
        </div>
        <div class="w-32">
          <label for="item-modal-weight" class="mb-1 block text-xs text-content">
            {{ t('inventory.weightLabel') }}
          </label>
          <CommonAppInput
            id="item-modal-weight"
            type="number"
            min="0"
            step="0.1"
            size="sm"
            outline
            :model-value="String(draft.weight)"
            class="w-full"
            @update:model-value="draft.weight = normalizeWeight($event)"
          />
        </div>
      </div>

      <!-- Description -->
      <div>
        <label for="item-modal-description" class="mb-1 block text-xs text-content">
          {{ t('inventory.itemDescriptionOptional') }}
        </label>
        <div class="rounded-md border border-primary bg-canvas-inset">
          <TextArea
            id="item-modal-description"
            class="w-full"
            :border="false"
            :model-value="draft.description ?? ''"
            :rows="2"
            max-height="12rem"
            :maxlength="CHARACTER_TEXT_LIMITS.ITEM"
            show-count
            :placeholder="t('inventory.itemDescription')"
            @update:model-value="draft.description = $event || null"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <CommonAppButton variant="primary" :disabled="!draft.name.trim()" @click="save">
        {{ t('ui.action.confirm') }}
      </CommonAppButton>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Icon, Modal, TextArea } from '@ui'
import type { SelectOption } from '@ui'
import { calculateItemsWeight, formatWeight } from '~/helpers/inventory'
import {
  CHARACTER_INT_LIMITS,
  CHARACTER_TEXT_LIMITS,
  MAX_DECIMAL_PRECISION,
  VALIDATION_LIMITS,
  type InventoryItemDTO,
  type InventoryLocation,
  type ItemType,
} from '@rolling-dice-app/core'
import type { InventoryItemDraft } from '~/types/business/character-form'

const { t, messages } = useI18n()
const toast = useToast()

const props = withDefaults(
  defineProps<{
    items: InventoryItemDTO[]
    totalItemCount: number
    section: InventoryLocation
    title: string
    /** patch in-flight 的 item id；該 item 的 move / edit / 拖曳於期間封鎖以防樂觀鎖 conflict */
    pendingItemIds?: Set<string>
  }>(),
  { pendingItemIds: () => new Set() },
)

const emit = defineEmits<{
  add: [draft: InventoryItemDraft]
  remove: [id: string]
  update: [id: string, draft: InventoryItemDraft]
  'move-item': [id: string]
  'drag-end': []
}>()

// ─── Weight ───────────────────────────────────────────────────────────────────

const totalWeight = computed(() => calculateItemsWeight(props.items))

const WEIGHT_PRECISION_FACTOR = 10 ** MAX_DECIMAL_PRECISION
const normalizeWeight = (raw: string): number => {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 0
  const rounded = Math.round(n * WEIGHT_PRECISION_FACTOR) / WEIGHT_PRECISION_FACTOR
  return Math.min(CHARACTER_INT_LIMITS.GENERAL_INT_MAX, rounded)
}

// ─── Description expand ───────────────────────────────────────────────────────

const expandedIds = ref<Set<string>>(new Set())
const isExpanded = (id: string): boolean => expandedIds.value.has(id)
const toggleExpand = (id: string): void => {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

// ─── Drag and Drop ────────────────────────────────────────────────────────────

const isDragOver = ref(false)
const dragEnterCount = ref(0)

const onDragStart = (event: DragEvent, id: string): void => {
  if (props.pendingItemIds.has(id)) {
    event.preventDefault()
    return
  }
  event.dataTransfer?.setData('application/json', JSON.stringify({ id, section: props.section }))
}

const onDragEnter = (): void => {
  dragEnterCount.value++
  isDragOver.value = true
}

const onDragLeave = (): void => {
  dragEnterCount.value--
  if (dragEnterCount.value <= 0) {
    dragEnterCount.value = 0
    isDragOver.value = false
  }
}

const onDrop = (event: DragEvent): void => {
  dragEnterCount.value = 0
  isDragOver.value = false
  const raw = event.dataTransfer?.getData('application/json')
  if (!raw) return
  try {
    const { id, section: fromSection } = JSON.parse(raw) as {
      id: string
      section: InventoryLocation
    }
    if (fromSection !== props.section) {
      emit('move-item', id)
    }
  } catch {
    // ignore malformed dataTransfer
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

const typeOptions = computed<SelectOption[]>(() =>
  (Object.entries(messages.value.inventory.itemType) as [ItemType, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
)

const modalOpen = ref(false)
const editingId = ref<string | null>(null)

const createEmptyDraft = (): InventoryItemDraft => {
  return {
    name: '',
    description: null,
    quantity: 1,
    weight: 0,
    type: 'other',
    location: props.section,
  }
}

const draft = ref<InventoryItemDraft>(createEmptyDraft())

watch(modalOpen, (open) => {
  if (!open) {
    editingId.value = null
    draft.value = createEmptyDraft()
  }
})

const openCreate = (): void => {
  if (props.totalItemCount >= VALIDATION_LIMITS.maxItemsPerCharacter) {
    toast.info(t('inventory.itemLimitReached'), { kind: 'hint' })
    return
  }
  editingId.value = null
  draft.value = createEmptyDraft()
  modalOpen.value = true
}

const openEdit = (item: InventoryItemDTO): void => {
  editingId.value = item.id
  draft.value = {
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    weight: item.weight,
    type: item.type,
    location: item.location,
  }
  modalOpen.value = true
}

const save = (): void => {
  const payload: InventoryItemDraft = {
    ...draft.value,
    name: draft.value.name.trim(),
  }
  if (editingId.value) {
    emit('update', editingId.value, payload)
  } else {
    emit('add', payload)
  }
  modalOpen.value = false
}
</script>
