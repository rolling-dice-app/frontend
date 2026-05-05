<template>
  <div
    class="rounded-lg border-2 transition-colors duration-150"
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
          <span class="text-xs text-content-muted">{{ items.length }} 件</span>
        </div>
        <span class="text-xs text-content-muted">
          總重：<span class="font-medium text-content">{{ formatWeight(totalWeight) }}</span> 磅
        </span>
      </div>

      <!-- Item rows -->
      <ul class="divide-y divide-border-soft">
        <!-- Add row -->
        <li>
          <button
            type="button"
            aria-label="新增物品"
            class="flex w-full items-center justify-center py-3 text-content-muted transition-colors duration-150 hover:bg-surface hover:text-content"
            @click="openCreate"
          >
            <span class="text-lg leading-none">+</span>
          </button>
        </li>

        <li
          v-for="item in items"
          :key="item.id"
          draggable="true"
          class="flex cursor-grab items-center gap-2 px-3 py-2 active:cursor-grabbing"
          @dragstart="onDragStart($event, item.id)"
          @dragend="$emit('drag-end')"
        >
          <!-- Drag handle -->
          <Icon name="list" :size="14" class="shrink-0 text-content-muted" />

          <!-- Type badge -->
          <Badge
            size="sm"
            bg-color="var(--color-surface-3)"
            class="shrink-0 hidden! xs:inline-flex!"
          >
            <span class="text-content-muted">{{ ITEM_TYPE_LABELS[item.type] }}</span>
          </Badge>

          <!-- Name -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p class="truncate text-sm text-content">{{ item.name }}</p>
              <Icon
                v-if="item.isAttuned"
                name="star"
                class="text-primary"
                :size="10"
                aria-label="已同調"
              />
            </div>
            <p v-if="item.description" class="truncate text-xs text-content-muted">
              {{ item.description }}
            </p>
          </div>

          <!-- Stats -->
          <div class="flex shrink-0 items-center gap-3 text-xs text-content-muted">
            <span>×{{ item.quantity }}</span>
            <span class="hidden xxs:inline">{{ formatWeight(item.weight) }} 磅</span>
            <span class="font-medium text-content hidden xxs:inline">
              {{ formatWeight(item.weight * item.quantity) }} 磅
            </span>
          </div>

          <!-- Actions -->
          <div class="flex shrink-0 items-center gap-1">
            <!-- Move button (always visible for mobile convenience) -->
            <button
              type="button"
              :aria-label="`將 ${item.name} 移至另一袋`"
              class="flex size-7 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-raised hover:text-content"
              @click="$emit('move-item', item.id)"
            >
              <Icon name="arrow-left-right" class="rotate-90 md:rotate-0" :size="12" />
            </button>
            <button
              type="button"
              :aria-label="`編輯 ${item.name}`"
              class="flex size-7 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-raised hover:text-content"
              @click="openEdit(item)"
            >
              <Icon name="edit" :size="14" />
            </button>
            <button
              type="button"
              :aria-label="`刪除 ${item.name}`"
              class="flex size-7 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:text-danger-hover"
              @click="$emit('remove', item.id)"
            >
              <Icon name="trash" :size="14" />
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>

  <!-- Add / Edit Modal -->
  <Modal
    v-model="modalOpen"
    :title="editingId ? '編輯物品' : '新增物品'"
    size="md"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
  >
    <div class="space-y-4">
      <!-- Name + Type -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="flex-1">
          <label for="item-modal-name" class="mb-1 block text-xs text-content">名稱</label>
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
          <label for="item-modal-type" class="mb-1 block text-xs text-content">類型</label>
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
          <label for="item-modal-quantity" class="mb-1 block text-xs text-content">數量</label>
          <CommonAppInput
            id="item-modal-quantity"
            type="number"
            min="1"
            step="1"
            size="sm"
            outline
            :model-value="String(draft.quantity)"
            class="w-full"
            @update:model-value="draft.quantity = Math.max(1, Math.floor(Number($event) || 1))"
          />
        </div>
        <div class="w-32">
          <label for="item-modal-weight" class="mb-1 block text-xs text-content">
            重量（磅/件）
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
            @update:model-value="draft.weight = Math.max(0, Number($event) || 0)"
          />
        </div>
      </div>

      <!-- Description -->
      <div>
        <label for="item-modal-description" class="mb-1 block text-xs text-content">
          描述（選填）
        </label>
        <div class="rounded-md border border-primary bg-canvas-inset">
          <TextArea
            id="item-modal-description"
            class="w-full"
            :border="false"
            :model-value="draft.description ?? ''"
            :rows="2"
            :maxlength="300"
            show-count
            placeholder="物品說明"
            @update:model-value="draft.description = $event || null"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <Button
        :radius="4"
        :disabled="!draft.name.trim()"
        bg-color="var(--color-primary)"
        @click="save"
      >
        確認
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Badge, Button, Icon, Modal, TextArea } from '@ui'
import type { SelectOption } from '@ui'
import { ITEM_TYPE_LABELS } from '~/constants/inventory'
import { calculateItemsWeight, formatWeight } from '~/helpers/inventory'
import type { InventoryItem, InventoryLocation, ItemType } from '@rolling-dice-app/types'
import type { InventoryItemDraft } from '~/types/business/character-form'

const props = defineProps<{
  items: InventoryItem[]
  section: InventoryLocation
  title: string
}>()

const emit = defineEmits<{
  add: [draft: InventoryItemDraft]
  remove: [id: string]
  update: [id: string, draft: InventoryItemDraft]
  'move-item': [id: string]
  'drag-end': []
}>()

// ─── Weight ───────────────────────────────────────────────────────────────────

const totalWeight = computed(() => calculateItemsWeight(props.items))

// ─── Drag and Drop ────────────────────────────────────────────────────────────

const isDragOver = ref(false)
const dragEnterCount = ref(0)

const onDragStart = (event: DragEvent, id: string): void => {
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

const typeOptions: SelectOption[] = (Object.entries(ITEM_TYPE_LABELS) as [ItemType, string][]).map(
  ([value, label]) => ({ value, label }),
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
  editingId.value = null
  draft.value = createEmptyDraft()
  modalOpen.value = true
}

const openEdit = (item: InventoryItem): void => {
  editingId.value = item.id
  const { id: _id, isAttuned: _isAttuned, ...rest } = item
  draft.value = rest
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
