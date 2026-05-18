<template>
  <section :aria-labelledby="headingId" class="rounded-lg border border-border-soft bg-canvas p-3">
    <header class="mb-2 flex items-center justify-between">
      <label :id="headingId" :for="selectId" class="font-display text-sm font-bold text-content">
        {{ t('spell.castingAbility') }}
      </label>
      <span class="text-xs text-content-muted">{{ t('spell.multicasterHint') }}</span>
    </header>

    <CommonAppSelect
      :id="selectId"
      v-model="abilities"
      :options="options"
      multiple
      :placeholder="t('spell.notSet')"
      size="sm"
      class="w-full"
    />
  </section>
</template>

<script setup lang="ts">
import { ABILITY_KEYS, type AbilityKey } from '@rolling-dice-app/core'

const { t } = useI18n()

const abilities = defineModel<AbilityKey[]>('abilities', { required: true })

const headingId = useId()
const selectId = useId()

const options = computed(() =>
  ABILITY_KEYS.map((key) => ({ value: key, label: t(`ability.${key}`) })),
)
</script>
