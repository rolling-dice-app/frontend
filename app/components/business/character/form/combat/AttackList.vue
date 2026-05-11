<template>
  <section aria-labelledby="section-attacks">
    <h2 id="section-attacks" class="mb-4 font-display text-lg font-bold text-content">
      {{ t('combat.attackModule') }}
    </h2>

    <ul class="space-y-2">
      <li>
        <button
          type="button"
          :aria-label="t('combat.addAttack')"
          class="flex w-full items-center justify-center rounded-lg border border-dashed border-border-soft py-7 text-content-muted transition-colors duration-150 hover:border-border hover:bg-surface hover:text-content"
          @click="openCreate"
        >
          <span class="text-xl leading-none">+</span>
        </button>
      </li>

      <li
        v-for="attack in formState.attacks"
        :key="attack.id"
        class="flex items-center justify-between rounded-lg border border-border-soft bg-surface px-3 py-2"
      >
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <p class="text-sm font-semibold text-content">{{ attack.name }}</p>
            <p class="text-xs text-content">
              {{ t('combat.hitBonus') }}
              <span class="font-bold" :class="hitBonusColor(attack)">
                {{ formatModifier(computedHit(attack)) }}
              </span>
            </p>
          </div>
          <p class="my-1 text-xs text-content">
            {{ formatDamageSummary(attack, abilityScores) }}
          </p>
          <p
            v-if="attack.comment"
            class="line-clamp-2 text-xs whitespace-pre-line text-content-muted"
          >
            {{ attack.comment }}
          </p>
        </div>
        <div class="flex shrink-0 gap-1">
          <button
            type="button"
            :aria-label="`${t('ui.action.edit')} ${attack.name || t('combat.thisAttack')}`"
            class="flex size-8 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-raised hover:text-content"
            @click="openEdit(attack)"
          >
            <Icon name="edit" :size="16" />
          </button>
          <button
            type="button"
            :aria-label="`${t('ui.action.delete')} ${attack.name || t('combat.thisAttack')}`"
            class="flex size-8 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:text-danger-hover"
            @click="removeAttack(attack.id)"
          >
            <Icon name="trash" :size="16" />
          </button>
        </div>
      </li>
    </ul>
  </section>

  <!-- 新增 / 編輯 攻擊 Modal -->
  <Modal
    v-model="modalOpen"
    :title="`${editingId ? t('ui.action.edit') : t('ui.action.add')}${t('combat.attackModule')}`"
    size="md"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
  >
    <div class="space-y-5">
      <!-- 第一列：名稱 / 屬性 / 額外命中加值 -->
      <div class="flex items-end gap-3">
        <div class="flex-1">
          <label for="attack-modal-name" class="mb-1 block text-xs text-content">
            {{ t('character.adventureField.name') }}
          </label>
          <CommonAppInput
            id="attack-modal-name"
            :radius="0"
            :model-value="draft.name"
            size="sm"
            outline
            class="w-full"
            @update:model-value="draft.name = $event"
          />
        </div>
        <div>
          <label for="attack-modal-ability" class="mb-1 block text-xs text-content">
            {{ t('combat.attribute') }}
          </label>
          <CommonAppSelect
            id="attack-modal-ability"
            :model-value="draft.abilityKey ?? ''"
            :options="abilityOptions"
            size="sm"
            :placeholder="t('combat.selectAttribute')"
            class="w-28"
            @update:model-value="draft.abilityKey = ($event || null) as AbilityKey | null"
          />
        </div>
        <div>
          <label for="attack-modal-extra-hit" class="mb-1 block text-xs text-content">
            {{ t('combat.extraHit') }}
          </label>
          <CommonAppInput
            id="attack-modal-extra-hit"
            :radius="0"
            :model-value="draft.extraHitBonus != null ? String(draft.extraHitBonus) : ''"
            type="number"
            size="sm"
            outline
            placeholder="0"
            class="w-16"
            @update:model-value="draft.extraHitBonus = parseIntegerInput($event)"
          />
        </div>
      </div>

      <!-- 第二列：傷害骰多行 entries -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-content">{{ t('combat.damageRoll') }}</span>
          <label class="flex cursor-pointer items-center gap-2 text-xs text-content-muted">
            {{ t('combat.applyAbility') }}
            <Toggle
              :model-value="draft.applyAbilityToDamage"
              size="sm"
              color="var(--color-primary)"
              :aria-label="t('combat.applyAbilityToDamage')"
              @update:model-value="draft.applyAbilityToDamage = $event"
            />
          </label>
        </div>
        <div
          v-for="(entry, index) in draft.damageDice"
          :key="entry.id"
          class="flex items-center gap-2"
        >
          <CommonAppInput
            :aria-label="`${t('combat.rowOrdinal')} ${index + 1} ${t('combat.rowDieCount')}`"
            :radius="0"
            :model-value="entry.count > 0 ? String(entry.count) : ''"
            type="number"
            size="sm"
            outline
            placeholder="0"
            class="w-16"
            @update:model-value="entry.count = parseIntegerInput($event, 0)"
          />
          <CommonAppSelect
            :aria-label="`${t('combat.rowOrdinal')} ${index + 1} ${t('combat.rowDieType')}`"
            :model-value="entry.dieType ?? ''"
            :options="dieTypeOptions"
            size="sm"
            :placeholder="t('character.emptyDash')"
            class="w-20"
            @update:model-value="entry.dieType = ($event || null) as DamageDieType | null"
          />
          <CommonAppInput
            :aria-label="`${t('combat.rowOrdinal')} ${index + 1} ${t('combat.rowBonus')}`"
            :radius="0"
            :model-value="entry.bonus != null ? String(entry.bonus) : ''"
            type="number"
            size="sm"
            outline
            placeholder="±0"
            class="w-16"
            @update:model-value="entry.bonus = parseIntegerInput($event)"
          />
          <CommonAppSelect
            :aria-label="`${t('combat.rowOrdinal')} ${index + 1} ${t('combat.rowDamageType')}`"
            :model-value="entry.damageType ?? ''"
            :options="damageTypeOptions"
            size="sm"
            :placeholder="t('character.emptyDash')"
            class="flex-1"
            @update:model-value="entry.damageType = ($event || null) as DamageTypeKey | null"
          />
          <button
            type="button"
            :aria-label="`${t('combat.removeRow')}${t('combat.rowOrdinal')} ${index + 1} 行`"
            class="flex size-8 shrink-0 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:text-danger-hover"
            @click="removeDamageEntry(index)"
          >
            <Icon name="trash" :size="16" />
          </button>
        </div>
        <button
          type="button"
          :aria-label="t('combat.addDamageRow')"
          class="flex w-full items-center justify-center rounded-lg border border-dashed border-border-soft py-2 text-content-muted transition-colors duration-150 hover:border-border hover:bg-surface hover:text-content"
          @click="addDamageEntry"
        >
          <span class="text-base leading-none">+ {{ t('combat.addDamageRow') }}</span>
        </button>
      </div>

      <!-- 第三列：計算結果預覽 -->
      <div class="flex gap-6 rounded-lg border border-border-soft bg-canvas px-4 py-3">
        <div class="flex items-center gap-2">
          <span class="text-xs text-content-muted">{{ t('combat.hitBonus') }}</span>
          <span class="text-sm font-bold" :class="draftHitColor">
            {{ formatModifier(draftHit) }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-content-muted">{{ t('combat.damage') }}</span>
          <span class="text-sm font-bold text-content">
            {{ formatDamageSummary(draft, abilityScores) }}
          </span>
        </div>
      </div>

      <!-- 第四列：補充說明 -->
      <div>
        <label for="attack-modal-comment" class="mb-1 block text-xs text-content">
          {{ t('combat.attackComment') }}
        </label>
        <div class="rounded-md border border-primary bg-canvas-inset">
          <TextArea
            id="attack-modal-comment"
            class="w-full"
            :border="false"
            :model-value="draft.comment ?? ''"
            :rows="3"
            :maxlength="CHARACTER_TEXT_LIMITS.SHORT"
            show-count
            :placeholder="t('combat.attackCommentPlaceholder')"
            @update:model-value="draft.comment = $event ? $event : null"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <Button
        :radius="4"
        :disabled="!draft.name.trim()"
        bg-color="var(--color-primary)"
        @click="saveAttack"
      >
        {{ t('ui.action.confirm') }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Modal, Button, Icon, Toggle, TextArea } from '@ui'
import type { SelectOption } from '@ui'
import {
  ABILITY_KEYS,
  CHARACTER_TEXT_LIMITS,
  VALIDATION_LIMITS,
  type AttackEntry,
  type DamageDieEntry,
  type AbilityKey,
  type DamageDieType,
  type DamageTypeKey,
} from '@rolling-dice-app/core'
import type {
  AttackDraft,
  CharacterUpdateFormState,
  TotalAbilityScores,
} from '~/types/business/character-form'
import { DAMAGE_DIE_TYPES, DAMAGE_TYPE_KEYS } from '~/constants/dnd'

const { t } = useI18n()
const toast = useToast()

const formState = defineModel<CharacterUpdateFormState>('formState', { required: true })

const props = defineProps<{
  abilityScores: TotalAbilityScores
  proficiencyBonus: number
}>()

const { addAttack, removeAttack, updateAttack } = useCharacterAttacksForm(formState.value)

const abilityOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('character.emptyDash') },
  ...ABILITY_KEYS.map((key) => ({ value: key, label: t(`ability.${key}`) })),
])

const dieTypeOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('character.emptyDash') },
  ...DAMAGE_DIE_TYPES.map((die) => ({ value: die, label: `d${die}` })),
])

const damageTypeOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('character.emptyDash') },
  ...DAMAGE_TYPE_KEYS.map((key) => ({ value: key, label: t(`combat.damageType.${key}`) })),
])

// ─── Modal 狀態 ───────────────────────────────────────────────────────────────

const modalOpen = ref(false)
const editingId = ref<string | null>(null)

const createEmptyDraft = (): AttackDraft => {
  return {
    name: '',
    abilityKey: null,
    damageDice: [],
    extraHitBonus: null,
    applyAbilityToDamage: true,
    comment: null,
  }
}

const createDamageEntry = (): DamageDieEntry => {
  return { id: crypto.randomUUID(), dieType: null, count: 0, bonus: null, damageType: null }
}

const addDamageEntry = (): void => {
  draft.value.damageDice.push(createDamageEntry())
}

const removeDamageEntry = (index: number): void => {
  draft.value.damageDice.splice(index, 1)
}

const draft = ref<AttackDraft>(createEmptyDraft())

watch(modalOpen, (open) => {
  if (!open) {
    editingId.value = null
    draft.value = createEmptyDraft()
  }
})

const openCreate = () => {
  if (formState.value.attacks.length >= VALIDATION_LIMITS.maxAttacksPerCharacter) {
    toast.info(t('combat.attackLimitReached'), { kind: 'hint' })
    return
  }
  editingId.value = null
  draft.value = createEmptyDraft()
  modalOpen.value = true
}

const openEdit = (attack: AttackEntry) => {
  editingId.value = attack.id
  draft.value = {
    name: attack.name,
    abilityKey: attack.abilityKey,
    damageDice: attack.damageDice.map((entry) => ({ ...entry })),
    extraHitBonus: attack.extraHitBonus,
    applyAbilityToDamage: attack.applyAbilityToDamage,
    comment: attack.comment,
  }
  modalOpen.value = true
}

const saveAttack = () => {
  const entry: AttackDraft = {
    ...draft.value,
    damageDice: draft.value.damageDice.map((e) => ({ ...e })),
  }
  if (editingId.value) {
    updateAttack(editingId.value, entry)
  } else {
    addAttack(entry)
  }
  modalOpen.value = false
}

// ─── 計算預覽 ─────────────────────────────────────────────────────────────────

const draftHit = computed(() =>
  getAttackHit(draft.value, props.abilityScores, props.proficiencyBonus),
)
const draftHitColor = computed(() => getHitBonusColorClass(draftHit.value))

const computedHit = (attack: AttackEntry): number => {
  return getAttackHit(attack, props.abilityScores, props.proficiencyBonus)
}

const hitBonusColor = (attack: AttackEntry): string => {
  return getHitBonusColorClass(computedHit(attack))
}
</script>
