<template>
  <div class="space-y-4 px-2">
    <h2 class="font-display text-lg font-bold text-content">角色資訊</h2>
    <div class="flex items-end gap-2">
      <!-- 角色名稱 -->
      <div class="min-w-20 flex-1">
        <label for="char-name" class="mb-1 block text-xs text-content">
          角色名稱 <span class="text-danger">*</span>
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
        <label for="char-gender" class="mb-1 block text-xs text-content"> 性別 </label>
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
        <label for="char-race" class="mb-1 block text-xs text-content"> 種族 </label>
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
        <label for="char-subrace" class="mb-1 block text-xs text-content"> 亞種 </label>
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
        <label for="char-background" class="mb-1 block text-xs text-content"> 背景 </label>
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
        <label for="char-alignment" class="mb-1 block text-xs text-content"> 陣營 </label>
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
        <label for="char-faith" class="mb-1 block text-xs text-content"> 信仰 </label>
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
        <label for="char-languages" class="mb-1 block text-xs text-content"> 語言 </label>
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
        <label for="char-tools" class="mb-1 block text-xs text-content"> 熟練工具 </label>
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
        <label for="char-weapons" class="mb-1 block text-xs text-content"> 武器 </label>
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
        <label for="char-armor" class="mb-1 block text-xs text-content"> 護甲 </label>
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
      <div
        v-for="(entry, index) in formState.professions"
        :key="index"
        class="flex items-end gap-2"
      >
        <div class="w-26">
          <label :for="`prof-${index}`" class="mb-1 block text-xs text-content">
            {{ index === 0 ? '主職業' : `兼職 ${index}` }}
            <span class="text-danger">*</span>
          </label>
          <CommonAppSelect
            :id="`prof-${index}`"
            :model-value="entry.profession || null"
            :options="getProfessionOptions(index)"
            class="w-full"
            size="sm"
            :placeholder="index === 0 ? '主職業' : '兼職'"
            :disabled="lockPrimaryProfession && index === 0"
            @update:model-value="updateProfessionKey(index, $event as string)"
          />
        </div>
        <div class="flex-1">
          <label :for="`prof-sub-${index}`" class="mb-1 block text-xs text-content"> 子職業 </label>
          <CommonAppSelect
            :id="`prof-sub-${index}`"
            class="w-full"
            :model-value="entry.subprofession || null"
            :options="getSubprofessionOptions(entry.profession)"
            :disabled="entry.profession === null"
            placeholder=""
            size="sm"
            @update:model-value="
              updateProfessionSubprofession(index, $event as SubprofessionKey | null)
            "
          />
        </div>
        <div class="max-w-12">
          <label :for="`prof-level-${index}`" class="mb-1 block text-xs text-content"> 等級 </label>
          <CommonAppInput
            :id="`prof-level-${index}`"
            type="number"
            class="w-full"
            size="sm"
            :model-value="String(entry.level)"
            @update:model-value="updateProfessionLevel(index, $event)"
          />
        </div>
        <button
          v-if="index > 0"
          type="button"
          class="flex items-center justify-center border-content bg-danger shrink-0 size-8 rounded text-content transition-colors hover:bg-danger-hover"
          aria-label="移除此職業"
          @click="removeProfession(index)"
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
          @click="addProfession"
        >
          + 新增職業
        </Button>
        <p class="text-sm text-content-muted">
          總等級：
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
import { ALIGNMENT_NAMES, GENDER_NAMES, PROFESSION_CONFIG, PROFESSION_KEYS } from '~/constants/dnd'
import { SUBPROFESSION_BY_PROFESSION, SUBPROFESSION_CONFIG } from '~/constants/subprofession'
import type { CharacterFormStateBase } from '~/types/business/character-form'
import type {
  AlignmentKey,
  GenderKey,
  ProfessionKey,
  SubprofessionKey,
} from '@rolling-dice-app/core'

const formState = defineModel<CharacterFormStateBase>('formState', { required: true })

withDefaults(
  defineProps<{
    totalLevel: number
    lockPrimaryProfession?: boolean
  }>(),
  { lockPrimaryProfession: false },
)

const genderOptions: SelectOption[] = Object.entries(GENDER_NAMES).map(([value, label]) => ({
  value,
  label,
}))

const alignmentOptions: SelectOption[] = Object.entries(ALIGNMENT_NAMES).map(([value, label]) => ({
  value,
  label,
}))

const professionOptions: SelectOption[] = Object.entries(PROFESSION_CONFIG).map(
  ([value, { label }]) => ({ value, label }),
)

const getProfessionOptions = (index: number): SelectOption[] => {
  return professionOptions.filter((option) => {
    return formState.value.professions.every(
      (entry, i) => i === index || entry.profession !== option.value,
    )
  })
}

const isButtonDisabled = computed(() => {
  const professionsOver = formState.value.professions.length >= PROFESSION_KEYS.length
  const hasUnselected = formState.value.professions.some((entry) => !entry.profession)
  return professionsOver || hasUnselected
})

const addProfession = (): void => {
  formState.value.professions.push({ profession: null, level: 1, subprofession: null })
}

const removeProfession = (index: number): void => {
  if (formState.value.professions.length <= 1) return
  formState.value.professions.splice(index, 1)
}

const updateProfessionKey = (index: number, value: string): void => {
  const entry = formState.value.professions[index]!
  entry.profession = value as ProfessionKey
  entry.subprofession = null
}

const updateProfessionLevel = (index: number, value: string): void => {
  const level = parseIntegerInput(value, 1)
  formState.value.professions[index]!.level = Math.max(1, Math.min(20, level))
}

const updateProfessionSubprofession = (index: number, value: SubprofessionKey | null): void => {
  formState.value.professions[index]!.subprofession = value
}

const getSubprofessionOptions = (profession: ProfessionKey | null): SelectOption[] => {
  if (profession === null) return []
  const labels = SUBPROFESSION_CONFIG[profession]
  return SUBPROFESSION_BY_PROFESSION[profession].map((key) => ({
    value: key,
    label: labels[key] ?? key,
  }))
}
</script>
