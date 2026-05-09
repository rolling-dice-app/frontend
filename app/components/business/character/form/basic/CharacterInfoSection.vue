<template>
  <div class="space-y-4 px-2">
    <h2 class="font-display text-lg font-bold text-content">{{ t('character.info') }}</h2>
    <div class="flex items-end gap-2">
      <!-- 角色名稱 -->
      <div class="min-w-20 flex-1">
        <label for="char-name" class="mb-1 block text-xs text-content">
          {{ t('character.characterName') }} <span class="text-danger">*</span>
        </label>
        <CommonAppInput
          id="char-name"
          class="w-full"
          :radius="0"
          :model-value="formState.name"
          size="sm"
          outline
          @update:model-value="formState.name = $event"
        />
      </div>
      <!-- 性別 -->
      <div>
        <label for="char-gender" class="mb-1 block text-xs text-content">
          {{ t('character.genderLabel') }}
        </label>
        <CommonAppSelect
          id="char-gender"
          class="min-w-20"
          placeholder=""
          :model-value="formState.gender || null"
          :options="genderOptions"
          size="sm"
          @update:model-value="formState.gender = ($event as GenderKey) || null"
        />
      </div>
    </div>
    <div class="flex items-end gap-2">
      <!-- 種族 -->
      <div class="min-w-20 flex-1">
        <label for="char-race" class="mb-1 block text-xs text-content">
          {{ t('character.race') }}
        </label>
        <CommonAppInput
          id="char-race"
          class="w-full"
          :radius="0"
          :model-value="formState.race ?? ''"
          size="sm"
          outline
          @update:model-value="formState.race = $event || null"
        />
      </div>
      <!-- 亞種 -->
      <div class="min-w-20 flex-1">
        <label for="char-subrace" class="mb-1 block text-xs text-content">
          {{ t('character.subrace') }}
        </label>
        <CommonAppInput
          id="char-subrace"
          class="w-full"
          :radius="0"
          :model-value="formState.subrace ?? ''"
          size="sm"
          outline
          @update:model-value="formState.subrace = $event || null"
        />
      </div>
    </div>
    <div class="flex items-end gap-2">
      <!-- 背景 -->
      <div class="min-w-12">
        <label for="char-background" class="mb-1 block text-xs text-content">
          {{ t('character.background') }}
        </label>
        <CommonAppInput
          id="char-background"
          class="w-full"
          :radius="0"
          :model-value="formState.background ?? ''"
          size="sm"
          outline
          @update:model-value="formState.background = $event || null"
        />
      </div>
      <!-- 陣營 -->
      <div>
        <label for="char-alignment" class="mb-1 block text-xs text-content">
          {{ t('character.alignmentLabel') }}
        </label>
        <CommonAppSelect
          id="char-alignment"
          class="min-w-24"
          :model-value="formState.alignment || null"
          :options="alignmentOptions"
          placeholder=""
          size="sm"
          @update:model-value="formState.alignment = ($event as AlignmentKey) || null"
        />
      </div>
      <!-- 信仰 -->
      <div class="min-w-12">
        <label for="char-faith" class="mb-1 block text-xs text-content">
          {{ t('character.faith') }}
        </label>
        <CommonAppInput
          id="char-faith"
          class="w-full"
          :model-value="formState.faith ?? ''"
          placeholder=""
          size="sm"
          @update:model-value="formState.faith = $event || null"
        />
      </div>
    </div>

    <div class="flex items-end gap-2">
      <div class="min-w-0 flex-1">
        <label for="char-languages" class="mb-1 block text-xs text-content">
          {{ t('character.language') }}
        </label>
        <CommonAppInput
          id="char-languages"
          class="w-full"
          :radius="0"
          :model-value="formState.languages ?? ''"
          size="sm"
          outline
          @update:model-value="formState.languages = $event || null"
        />
      </div>
      <div class="min-w-0 flex-1">
        <label for="char-tools" class="mb-1 block text-xs text-content">
          {{ t('character.toolFull') }}
        </label>
        <CommonAppInput
          id="char-tools"
          class="w-full"
          :radius="0"
          :model-value="formState.tools ?? ''"
          size="sm"
          outline
          @update:model-value="formState.tools = $event || null"
        />
      </div>
    </div>
    <div class="flex items-end gap-2">
      <div class="min-w-0 flex-1">
        <label for="char-weapons" class="mb-1 block text-xs text-content">
          {{ t('character.weaponProficiency') }}
        </label>
        <CommonAppInput
          id="char-weapons"
          class="w-full"
          :radius="0"
          :model-value="formState.weaponProficiencies ?? ''"
          size="sm"
          outline
          @update:model-value="formState.weaponProficiencies = $event || null"
        />
      </div>
      <div class="min-w-0 flex-1">
        <label for="char-armor" class="mb-1 block text-xs text-content">
          {{ t('character.armorProficiency') }}
        </label>
        <CommonAppInput
          id="char-armor"
          class="w-full"
          :radius="0"
          :model-value="formState.armorProficiencies ?? ''"
          size="sm"
          outline
          @update:model-value="formState.armorProficiencies = $event || null"
        />
      </div>
    </div>
    <!-- 職業設定 -->
    <div class="space-y-4">
      <div v-for="(entry, index) in formState.classes" :key="index" class="flex items-end gap-2">
        <div class="w-26">
          <label :for="`prof-${index}`" class="mb-1 block text-xs text-content">
            {{ index === 0 ? t('class.primary') : `${t('class.multiclassWithIndex')}${index}` }}
            <span class="text-danger">*</span>
          </label>
          <CommonAppSelect
            :id="`prof-${index}`"
            :model-value="entry.classKey || null"
            :options="getClassOptions(index)"
            class="w-full"
            size="sm"
            :placeholder="index === 0 ? t('class.primary') : t('class.multiclass')"
            :disabled="lockPrimaryClass && index === 0"
            @update:model-value="updateClassKey(index, $event as string)"
          />
        </div>
        <div class="flex-1">
          <label :for="`prof-sub-${index}`" class="mb-1 block text-xs text-content">
            {{ t('class.subclassLabel') }}
          </label>
          <CommonAppSelect
            :id="`prof-sub-${index}`"
            class="w-full"
            :model-value="entry.subclass || null"
            :options="getSubclassOptions(entry.classKey)"
            :disabled="entry.classKey === null"
            placeholder=""
            size="sm"
            @update:model-value="updateClassSubclass(index, $event as SubclassKey | null)"
          />
        </div>
        <div class="max-w-12">
          <label :for="`prof-level-${index}`" class="mb-1 block text-xs text-content">
            {{ t('class.level') }}
          </label>
          <CommonAppInput
            :id="`prof-level-${index}`"
            type="number"
            class="w-full"
            size="sm"
            :model-value="String(entry.level)"
            @update:model-value="updateClassLevel(index, $event)"
          />
        </div>
        <button
          v-if="index > 0"
          type="button"
          class="flex items-center justify-center border-content bg-danger shrink-0 size-8 rounded text-content transition-colors hover:bg-danger-hover"
          :aria-label="t('class.remove')"
          @click="removeClass(index)"
        >
          <Icon name="close" :size="20" />
        </button>
        <div v-else class="size-8" />
      </div>

      <div class="flex items-center justify-between">
        <Button
          size="sm"
          outline
          :disabled="isButtonDisabled"
          text-color="var(--color-primary)"
          border-color="var(--color-primary)"
          :radius="8"
          @click="addClass"
        >
          {{ t('class.addClass') }}
        </Button>
        <p class="text-sm text-content-muted">
          {{ t('class.totalLevel') }}：
          <span :class="totalLevel > 20 ? 'text-danger font-bold' : ''">{{ totalLevel }}</span>
          / 20
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button, Icon } from '@ui'
import type { SelectOption } from '@ui'
import { ALIGNMENT_NAMES, GENDER_NAMES, CLASS_CONFIG } from '~/constants/dnd'
import { SUBCLASSES_BY_CLASS, SUBCLASS_CONFIG } from '~/constants/subclass'
import type { CharacterFormStateBase } from '~/types/business/character-form'
import {
  CLASS_KEYS,
  type AlignmentKey,
  type GenderKey,
  type ClassKey,
  type SubclassKey,
} from '@rolling-dice-app/core'

const { t } = useI18n()

const formState = defineModel<CharacterFormStateBase>('formState', { required: true })

withDefaults(
  defineProps<{
    totalLevel: number
    lockPrimaryClass?: boolean
  }>(),
  { lockPrimaryClass: false },
)

const genderOptions: SelectOption[] = Object.entries(GENDER_NAMES).map(([value, label]) => ({
  value,
  label,
}))

const alignmentOptions: SelectOption[] = Object.entries(ALIGNMENT_NAMES).map(([value, label]) => ({
  value,
  label,
}))

const classOptions: SelectOption[] = Object.entries(CLASS_CONFIG).map(([value, { label }]) => ({
  value,
  label,
}))

const getClassOptions = (index: number): SelectOption[] => {
  return classOptions.filter((option) => {
    return formState.value.classes.every(
      (entry, i) => i === index || entry.classKey !== option.value,
    )
  })
}

const isButtonDisabled = computed(() => {
  const classesOver = formState.value.classes.length >= CLASS_KEYS.length
  const hasUnselected = formState.value.classes.some((entry) => !entry.classKey)
  return classesOver || hasUnselected
})

const addClass = (): void => {
  formState.value.classes.push({ classKey: null, level: 1, subclass: null })
}

const removeClass = (index: number): void => {
  if (formState.value.classes.length <= 1) return
  formState.value.classes.splice(index, 1)
}

const updateClassKey = (index: number, value: string): void => {
  const entry = formState.value.classes[index]!
  entry.classKey = value as ClassKey
  entry.subclass = null
}

const updateClassLevel = (index: number, value: string): void => {
  const level = parseIntegerInput(value, 1)
  formState.value.classes[index]!.level = Math.max(1, Math.min(20, level))
}

const updateClassSubclass = (index: number, value: SubclassKey | null): void => {
  formState.value.classes[index]!.subclass = value
}

const getSubclassOptions = (classKey: ClassKey | null): SelectOption[] => {
  if (classKey === null) return []
  const labels = SUBCLASS_CONFIG[classKey]
  return SUBCLASSES_BY_CLASS[classKey].map((key) => ({
    value: key,
    label: labels[key] ?? key,
  }))
}
</script>
