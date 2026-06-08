<template>
  <Modal
    :model-value="modelValue"
    :title="t('character.buildConfirmTitle')"
    size="md"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-5">
      <p class="rounded-md border border-warning bg-warning-soft px-3 py-2 text-sm text-warning">
        {{ t('character.buildConfirmWarning') }}
      </p>

      <section aria-labelledby="confirm-primary-class">
        <h3 id="confirm-primary-class" class="mb-2 font-display text-sm font-bold text-content">
          {{ t('class.primary') }}
        </h3>
        <p class="rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-content">
          {{ primaryClassLabel }}
        </p>
      </section>

      <section aria-labelledby="confirm-abilities">
        <h3 id="confirm-abilities" class="mb-2 font-display text-sm font-bold text-content">
          {{ t('character.abilitiesLabel') }}
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
              <span class="text-xs font-bold" :class="getModifierColorClass(row.modifier)">
                {{ formatModifier(row.modifier) }}
              </span>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <CommonAppButton variant="ghost" @click="emit('cancel')">
          {{ t('ui.action.cancel') }}
        </CommonAppButton>
        <CommonAppButton
          variant="primary"
          data-testid="character-build-confirm"
          @click="emit('confirm')"
        >
          {{ t('character.buildConfirmAction') }}
        </CommonAppButton>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Modal } from '@ui'
import { ABILITY_KEYS } from '@rolling-dice-app/core'
import type { FormClassEntry, TotalAbilityScores } from '~/types/business/character-form'

const { t } = useI18n()

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
  return primary ? t(`class.label.${primary}`) : t('character.emptyDash')
})

const abilityRows = computed(() =>
  ABILITY_KEYS.map((key) => {
    const score = props.abilities[key]
    return {
      key,
      name: t(`ability.${key}`),
      score,
      modifier: getAbilityModifier(score),
    }
  }),
)
</script>
