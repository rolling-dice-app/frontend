<template>
  <section aria-labelledby="section-ac">
    <h2 id="section-ac" class="mb-4 font-display text-lg font-bold text-content">
      {{ t('combat.ac') }}
    </h2>
    <div class="flex flex-wrap gap-2">
      <div>
        <label for="armor-type" class="mb-1 block text-xs text-content">{{
          t('combat.armor')
        }}</label>
        <CommonAppSelect
          id="armor-type"
          :model-value="formState.armorClass.type"
          :options="armorTypeOptions"
          size="sm"
          :placeholder="t('combat.selectArmor')"
          class="w-18"
          @update:model-value="formState.armorClass.type = ($event || null) as ArmorType | null"
        />
      </div>

      <div>
        <label for="armor-value" class="mb-1 block text-xs text-content">
          {{ t('combat.armorBase') }}
        </label>
        <CommonAppInput
          id="armor-value"
          class="w-12"
          :radius="0"
          :model-value="
            formState.armorClass.value != null ? String(formState.armorClass.value) : ''
          "
          type="number"
          size="sm"
          outline
          :placeholder="String(UNARMORED_AC_BASE)"
          @update:model-value="formState.armorClass.value = parseIntegerInput($event)"
        />
      </div>

      <div>
        <span id="dex-mod-label" class="mb-1 block text-xs text-content">
          {{ t('combat.abilityAdjustment') }}
        </span>
        <output
          aria-labelledby="dex-mod-label"
          class="flex h-8 w-14 items-center justify-center rounded-lg bg-canvas px-2 text-sm font-bold"
          :class="dexModifierTextColor"
        >
          {{ formatModifier(effectiveDexModifier) }}
        </output>
      </div>

      <div>
        <label for="armor-ability" class="mb-1 block text-xs text-content">
          {{ t('combat.unarmored') }}
        </label>
        <CommonAppSelect
          id="armor-ability"
          :model-value="formState.armorClass.abilityKey ?? ''"
          :options="abilityOptions"
          size="sm"
          :placeholder="t('combat.none')"
          class="min-w-18"
          @update:model-value="
            formState.armorClass.abilityKey = ($event || null) as AbilityKey | null
          "
        />
      </div>

      <div>
        <label for="shield-value" class="mb-1 block text-xs text-content">
          {{ t('combat.shield') }}
        </label>
        <CommonAppInput
          id="shield-value"
          class="w-12"
          :radius="0"
          :model-value="String(formState.armorClass.shieldValue)"
          type="number"
          size="sm"
          outline
          placeholder="0"
          @update:model-value="formState.armorClass.shieldValue = parseIntegerInput($event, 0)"
        />
      </div>
    </div>

    <div class="mt-4 flex items-center justify-end gap-3">
      <span id="ac-total-label" class="text-xs text-content-muted">{{ t('combat.acTotal') }}</span>
      <output
        aria-labelledby="ac-total-label"
        class="flex size-12 items-center justify-center rounded-lg border border-border-soft bg-surface text-2xl font-bold text-content"
      >
        {{ totalAC }}
      </output>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { SelectOption } from '@ui'
import type { CharacterUpdateFormState, TotalAbilityScores } from '~/types/business/character-form'
import { UNARMORED_AC_BASE, type AbilityKey, type ArmorType } from '@rolling-dice-app/core'
import { ABILITY_NAMES, ARMOR_TYPE_NAMES } from '~/constants/dnd'

const { t } = useI18n()

const formState = defineModel<CharacterUpdateFormState>('formState', { required: true })

const props = defineProps<{
  abilityScores: TotalAbilityScores
}>()

const armorTypeOptions: SelectOption[] = Object.entries(ARMOR_TYPE_NAMES).map(([value, label]) => ({
  value,
  label,
}))

const abilityOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('combat.none') },
  ...Object.entries(ABILITY_NAMES).map(([value, label]) => ({ value, label })),
])

const totalAC = computed(() => getTotalArmorClass(formState.value.armorClass, props.abilityScores))

const effectiveDexModifier = computed(() => {
  const dexMod = getAbilityModifier(props.abilityScores.dexterity)
  const type = formState.value.armorClass.type
  if (type === 'heavy') return 0
  if (type === 'medium') return Math.min(dexMod, 2)
  return dexMod
})

const dexModifierTextColor = computed(() => {
  const v = effectiveDexModifier.value
  if (v > 0) return 'text-success'
  if (v < 0) return 'text-danger'
  return 'text-content-muted'
})
</script>
