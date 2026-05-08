<template>
  <Modal
    :model-value="modelValue"
    title="確認建立角色"
    size="md"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-5">
      <p class="rounded-md border border-warning bg-warning-soft px-3 py-2 text-sm text-warning">
        主職業與屬性建立後將無法變更，確認送出嗎？
      </p>

      <section aria-labelledby="confirm-primary-class">
        <h3 id="confirm-primary-class" class="mb-2 font-display text-sm font-bold text-content">
          主職業
        </h3>
        <p class="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-content">
          {{ primaryClassLabel }}
        </p>
      </section>

      <section aria-labelledby="confirm-abilities">
        <h3 id="confirm-abilities" class="mb-2 font-display text-sm font-bold text-content">
          屬性
        </h3>
        <ul class="grid grid-cols-3 gap-2">
          <li
            v-for="row in abilityRows"
            :key="row.key"
            class="flex items-center justify-between rounded-lg border border-border-soft bg-surface px-3 py-2"
          >
            <span class="text-xs text-content-muted">{{ row.name }}</span>
            <div class="flex items-baseline gap-1.5">
              <span class="text-base font-bold text-content">{{ row.score }}</span>
              <span class="text-xs font-bold" :class="modifierTextColor(row.modifier)">
                {{ formatModifier(row.modifier) }}
              </span>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :radius="4" bg-color="var(--color-surface-2)" @click="emit('cancel')">
          取消
        </Button>
        <Button :radius="4" bg-color="var(--color-primary)" @click="emit('confirm')">
          確認新增
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Button, Modal } from '@ui'
import { ABILITY_KEYS } from '@rolling-dice-app/core'
import { ABILITY_NAMES, CLASS_CONFIG } from '~/constants/dnd'
import type { FormClassEntry, TotalAbilityScores } from '~/types/business/character-form'

const props = defineProps<{
  modelValue: boolean
  classes: FormClassEntry[]
  abilities: TotalAbilityScores
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  cancel: []
  confirm: []
}>()

const primaryClassLabel = computed(() => {
  const primary = props.classes[0]?.classKey
  return primary ? CLASS_CONFIG[primary].label : '—'
})

const abilityRows = computed(() =>
  ABILITY_KEYS.map((key) => {
    const score = props.abilities[key]
    return {
      key,
      name: ABILITY_NAMES[key],
      score,
      modifier: getAbilityModifier(score),
    }
  }),
)

const modifierTextColor = (value: number): string => {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-content-muted'
}
</script>
