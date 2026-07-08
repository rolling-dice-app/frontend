<template>
  <section aria-labelledby="monster-section-attacks">
    <h3 id="monster-section-attacks" class="mb-3 font-display text-base font-bold text-content">
      {{ t('monster.field.attacksModule') }}
    </h3>

    <ul class="space-y-2">
      <li>
        <button
          type="button"
          :aria-label="t('monster.addAttack')"
          class="flex w-full items-center justify-center rounded-lg border border-dashed border-border-soft py-4 text-content-muted transition-colors duration-150 hover:border-border hover:bg-surface hover:text-content"
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
              {{ t('monster.hitBonus') }}
              <span class="font-bold tabular-nums">{{ formatModifier(attack.hitBonus) }}</span>
            </p>
          </div>
          <p class="my-1 text-xs text-content">{{ damageSummary(attack) }}</p>
          <p
            v-if="attack.comment"
            class="line-clamp-2 text-xs whitespace-pre-line text-content-muted"
          >
            {{ attack.comment }}
          </p>
        </div>
        <div class="flex shrink-0 gap-2">
          <button
            type="button"
            :aria-label="`${t('ui.action.edit')} ${attack.name || t('monster.thisAttack')}`"
            class="flex size-8 items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:bg-surface-raised hover:text-content"
            @click="openEdit(attack)"
          >
            <Icon name="edit" :size="16" />
          </button>
          <button
            type="button"
            :aria-label="`${t('ui.action.delete')} ${attack.name || t('monster.thisAttack')}`"
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
    :title="`${editingId ? t('ui.action.edit') : t('ui.action.add')}${t('monster.field.attacksModule')}`"
    size="md"
    bg-color="var(--color-canvas-elevated)"
    text-color="var(--color-content)"
    border-color="var(--color-border)"
  >
    <div class="space-y-5">
      <!-- 名稱 / 命中加值 -->
      <div class="flex items-end gap-3">
        <div class="flex-1">
          <label for="monster-attack-name" class="mb-1 block text-xs text-content">
            {{ t('monster.attackName') }}
            <span class="text-danger">*</span>
          </label>
          <CommonAppInput
            id="monster-attack-name"
            :radius="0"
            :model-value="draft.name"
            :maxlength="CHARACTER_TEXT_LIMITS.SHORT"
            size="sm"
            outline
            class="w-full"
            @update:model-value="draft.name = $event"
          />
        </div>
        <div>
          <label for="monster-attack-hit" class="mb-1 block text-xs text-content">
            {{ t('monster.hitBonus') }}
          </label>
          <CommonAppInput
            id="monster-attack-hit"
            :radius="0"
            :model-value="String(draft.hitBonus)"
            type="number"
            size="sm"
            outline
            placeholder="0"
            class="w-20"
            @update:model-value="
              draft.hitBonus = parseIntegerInput($event, 0, CHARACTER_INT_LIMITS.SMALL_INT_MAX)
            "
          />
        </div>
      </div>

      <!-- 傷害骰多行 -->
      <div class="space-y-2">
        <span class="text-xs text-content">{{ t('combat.damageRoll') }}</span>
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
            @update:model-value="
              entry.count = Math.max(
                0,
                parseIntegerInput($event, 0, CHARACTER_INT_LIMITS.SMALL_INT_MAX),
              )
            "
          />
          <CommonAppSelect
            :aria-label="`${t('combat.rowOrdinal')} ${index + 1} ${t('combat.rowDieType')}`"
            :model-value="entry.dieType ? String(entry.dieType) : ''"
            :options="dieTypeOptions"
            size="sm"
            :placeholder="t('monster.emptyDash')"
            class="w-20"
            @update:model-value="entry.dieType = $event ? (Number($event) as DamageDieType) : null"
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
            @update:model-value="
              entry.bonus = parseIntegerInput($event, undefined, CHARACTER_INT_LIMITS.SMALL_INT_MAX)
            "
          />
          <CommonAppSelect
            :aria-label="`${t('combat.rowOrdinal')} ${index + 1} ${t('combat.rowDamageType')}`"
            :model-value="entry.damageType ?? ''"
            :options="damageTypeOptions"
            size="sm"
            :placeholder="t('monster.emptyDash')"
            class="flex-1"
            @update:model-value="entry.damageType = ($event || null) as DamageTypeKey | null"
          />
          <button
            type="button"
            :aria-label="`${t('combat.removeRow')}${t('combat.rowOrdinal')} ${index + 1}`"
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

      <!-- 傷害預覽 -->
      <div class="flex gap-6 rounded-lg border border-border-soft bg-canvas px-4 py-3">
        <div class="flex items-center gap-2">
          <span class="text-xs text-content-muted">{{ t('monster.hitBonus') }}</span>
          <span class="text-sm font-bold text-content">{{ formatModifier(draft.hitBonus) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-content-muted">{{ t('combat.damage') }}</span>
          <span class="text-sm font-bold text-content">{{ damageSummary(draft) }}</span>
        </div>
      </div>

      <!-- 補充說明 -->
      <div>
        <label for="monster-attack-comment" class="mb-1 block text-xs text-content">
          {{ t('monster.attackComment') }}
        </label>
        <div class="rounded-md border border-primary bg-canvas-inset">
          <TextArea
            id="monster-attack-comment"
            class="w-full"
            :border="false"
            :model-value="draft.comment ?? ''"
            :rows="3"
            max-height="8rem"
            :maxlength="CHARACTER_TEXT_LIMITS.MEDIUM"
            show-count
            :placeholder="t('monster.attackCommentPlaceholder')"
            @update:model-value="draft.comment = $event ? $event : null"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <CommonAppButton variant="primary" :disabled="!draft.name.trim()" @click="saveAttack">
        {{ t('ui.action.confirm') }}
      </CommonAppButton>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Icon, Modal, TextArea } from '@ui'
import type { SelectOption } from '@ui'
import {
  CHARACTER_INT_LIMITS,
  CHARACTER_TEXT_LIMITS,
  DAMAGE_DIE_TYPES,
  DAMAGE_TYPE_KEYS,
  type DamageDieEntry,
  type DamageDieType,
  type DamageTypeKey,
  type MonsterAttackEntry,
} from '@rolling-dice-app/core'
import type { MonsterAttackDraft, MonsterTemplateFormState } from '~/types/business/monster'

const { t } = useI18n()
const toast = useToast()

const formState = defineModel<MonsterTemplateFormState>('formState', { required: true })

// core 含怪物 caps 的版本尚未發佈到前端；此處先以拍板值頂著。
// TODO(串接階段): 改用 VALIDATION_LIMITS.maxAttacksPerMonsterTemplate / maxDamageDicePerAttack。
const MAX_ATTACKS = 10
const MAX_DAMAGE_DICE = 10

const dieTypeOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('monster.emptyDash') },
  ...DAMAGE_DIE_TYPES.map((die) => ({ value: String(die), label: `d${die}` })),
])

const damageTypeOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('monster.emptyDash') },
  ...DAMAGE_TYPE_KEYS.map((key) => ({ value: key, label: t(`combat.damageType.${key}`) })),
])

const damageSummary = (attack: { damageDice: DamageDieEntry[] }): string => {
  if (attack.damageDice.length === 0) return t('monster.emptyDash')
  return attack.damageDice
    .map((entry) => {
      const type = entry.damageType ? ` ${t(`combat.damageType.${entry.damageType}`)}` : ''
      return `${formatDamageDice(entry)}${type}`
    })
    .join(' + ')
}

// ─── Modal 狀態 ───────────────────────────────────────────────────────────────

const modalOpen = ref(false)
const editingId = ref<string | null>(null)

const createEmptyDraft = (): MonsterAttackDraft => ({
  name: '',
  hitBonus: 0,
  damageDice: [],
  comment: null,
})

const createDamageEntry = (): DamageDieEntry => ({
  id: crypto.randomUUID(),
  dieType: null,
  count: 0,
  bonus: null,
  damageType: null,
})

const draft = ref<MonsterAttackDraft>(createEmptyDraft())

watch(modalOpen, (open) => {
  if (!open) {
    editingId.value = null
    draft.value = createEmptyDraft()
  }
})

const addDamageEntry = (): void => {
  if (draft.value.damageDice.length >= MAX_DAMAGE_DICE) {
    toast.info(t('combat.damageRowLimitReached'), { kind: 'hint' })
    return
  }
  draft.value.damageDice.push(createDamageEntry())
}

const removeDamageEntry = (index: number): void => {
  draft.value.damageDice.splice(index, 1)
}

const openCreate = (): void => {
  if (formState.value.attacks.length >= MAX_ATTACKS) {
    toast.info(t('monster.attackLimitReached'), { kind: 'hint' })
    return
  }
  editingId.value = null
  draft.value = createEmptyDraft()
  modalOpen.value = true
}

const openEdit = (attack: MonsterAttackEntry): void => {
  editingId.value = attack.id
  draft.value = {
    name: attack.name,
    hitBonus: attack.hitBonus,
    damageDice: attack.damageDice.map((entry) => ({ ...entry })),
    comment: attack.comment,
  }
  modalOpen.value = true
}

const removeAttack = (id: string): void => {
  const index = formState.value.attacks.findIndex((a) => a.id === id)
  if (index !== -1) formState.value.attacks.splice(index, 1)
}

const saveAttack = (): void => {
  const entry: MonsterAttackDraft = {
    name: cleanText(draft.value.name),
    hitBonus: draft.value.hitBonus,
    damageDice: draft.value.damageDice.map((e) => ({ ...e })),
    comment: cleanTextOrNull(draft.value.comment),
  }
  if (editingId.value) {
    const index = formState.value.attacks.findIndex((a) => a.id === editingId.value)
    if (index !== -1) formState.value.attacks[index] = { id: editingId.value, ...entry }
  } else {
    formState.value.attacks.push({ id: crypto.randomUUID(), ...entry })
  }
  modalOpen.value = false
}
</script>
