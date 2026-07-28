<template>
  <div class="space-y-2">
    <p class="text-xs text-content-muted">{{ t('dmSession.log.field.itemRewards') }}</p>

    <ul v-if="rewards.length > 0" role="list" class="space-y-2">
      <li
        v-for="reward in rewards"
        :key="reward.id"
        class="rounded-md border border-border-soft bg-surface p-3"
      >
        <div class="flex items-center gap-2">
          <CommonAppInput
            :model-value="reward.item"
            data-testid="dm-session-reward-item"
            size="sm"
            outline
            :maxlength="CHARACTER_TEXT_LIMITS.ITEM"
            :placeholder="t('dmSession.log.field.item')"
            :aria-label="t('dmSession.log.field.item')"
            class="w-full flex-1"
            @update:model-value="(value: string) => (reward.item = value)"
          />
          <button
            type="button"
            data-testid="dm-session-reward-delete"
            :aria-label="`${t('ui.action.delete')} ${t('dmSession.log.rewards.thisReward')}`"
            class="flex size-8 shrink-0 items-center justify-center rounded-md text-content-faint transition-colors duration-150 hover:text-danger-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="onRemove(reward.id)"
          >
            <Icon name="trash" :size="14" />
          </button>
        </div>
        <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <CommonAppInput
            :model-value="reward.player"
            data-testid="dm-session-reward-player"
            size="sm"
            outline
            :maxlength="CHARACTER_TEXT_LIMITS.SHORT"
            :placeholder="t('dmSession.log.field.player')"
            :aria-label="t('dmSession.log.field.player')"
            :list="playerListId"
            class="w-full"
            @update:model-value="(value: string) => (reward.player = value)"
          />
          <CommonAppInput
            :model-value="reward.remark"
            data-testid="dm-session-reward-remark"
            size="sm"
            outline
            :maxlength="CHARACTER_TEXT_LIMITS.SHORT"
            :placeholder="t('dmSession.log.field.remark')"
            :aria-label="t('dmSession.log.field.remark')"
            class="w-full"
            @update:model-value="(value: string) => (reward.remark = value)"
          />
        </div>
      </li>
    </ul>

    <!-- 出席玩家名快選；player 仍為自由文字（契約為純文字） -->
    <datalist :id="playerListId">
      <option v-for="name in playerOptions" :key="name" :value="name" />
    </datalist>

    <button
      type="button"
      data-testid="dm-session-reward-add"
      :disabled="atMax"
      class="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-content-muted transition-colors duration-150 hover:bg-surface hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      @click="onAdd"
    >
      <Icon name="plus" :size="16" />
      {{ t('dmSession.log.rewards.addRow') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@ui'
import { CHARACTER_TEXT_LIMITS, VALIDATION_LIMITS } from '@rolling-dice-app/core'
import type { DmSessionLogItemReward } from '@rolling-dice-app/core'

const { t } = useI18n()

const rewards = defineModel<DmSessionLogItemReward[]>('rewards', { required: true })

defineProps<{
  /** 出席玩家名，供受領玩家欄位 datalist 快選 */
  playerOptions: string[]
}>()

const playerListId = useId()

const atMax = computed(
  () => rewards.value.length >= VALIDATION_LIMITS.maxItemRewardsPerDmSessionLog,
)

const onAdd = (): void => {
  if (atMax.value) return
  rewards.value.push({ id: crypto.randomUUID(), item: '', player: '', remark: '' })
}

const onRemove = (id: string): void => {
  rewards.value = rewards.value.filter((r) => r.id !== id)
}
</script>
