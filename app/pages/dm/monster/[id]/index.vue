<template>
  <div>
    <CommonPageHeader :title="monster?.name || ''" :show-back="true" back-to="/dm/monster">
      <template v-if="monster" #actions>
        <div class="ml-auto flex gap-2">
          <NuxtLink
            :to="`/dm/monster/${id}/update`"
            class="rounded-sm border border-border bg-surface px-4 py-2 text-center text-content transition-colors hover:bg-canvas-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {{ t('ui.action.edit') }}
          </NuxtLink>
          <CommonAppButton variant="danger" @click="confirmOpen = true">
            {{ t('ui.action.delete') }}
          </CommonAppButton>
        </div>
      </template>
    </CommonPageHeader>

    <!-- Loading -->
    <div
      v-if="status === 'idle' || status === 'pending'"
      class="flex min-h-[50dvh] items-center justify-center text-content-muted"
      role="status"
      aria-live="polite"
    >
      {{ t('ui.state.loading') }}
    </div>

    <!-- 真 404：模板不存在（或非擁有者） -->
    <CommonNotFound
      v-else-if="isNotFound"
      :message="t('monster.notFound')"
      back-to="/dm/monster"
      :back-label="t('monster.backToList')"
    />

    <!-- 暫時性錯誤：可重試 -->
    <div
      v-else-if="isTransientError"
      class="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center"
      role="alert"
    >
      <p class="text-danger">{{ t('monster.loadFailed') }}</p>
      <CommonAppButton variant="warning" @click="retryDetail">
        {{ t('ui.state.retry') }}
      </CommonAppButton>
    </div>

    <div
      v-else-if="monster"
      class="divide-y divide-divider rounded-lg border border-border-soft bg-canvas-elevated p-4 sm:p-6"
    >
      <!-- 身分 + 核心數值 -->
      <div class="space-y-3 pb-4">
        <p class="text-sm text-content-muted">
          <span v-if="monster.size">{{ t(`character.size.${monster.size}`) }}</span>
          <span v-if="monster.size && monster.alignment">，</span>
          <span v-if="monster.alignment">{{ t(`character.alignment.${monster.alignment}`) }}</span>
          <span v-if="monster.challengeRating" class="ml-2"
            >· CR {{ monster.challengeRating }}</span
          >
        </p>

        <div class="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <div>
            <p class="text-xs text-content-muted">{{ t('monster.field.ac') }}</p>
            <p class="font-bold text-content tabular-nums">{{ monster.ac }}</p>
          </div>
          <div>
            <p class="text-xs text-content-muted">{{ t('monster.field.hp') }}</p>
            <p class="font-bold text-content tabular-nums">{{ monster.hp }}</p>
          </div>
          <div v-if="monster.speed">
            <p class="text-xs text-content-muted">{{ t('monster.field.speed') }}</p>
            <p class="font-bold text-content">{{ monster.speed }}</p>
          </div>
          <div>
            <p class="text-xs text-content-muted">{{ t('monster.field.initiative') }}</p>
            <p class="font-bold text-content tabular-nums">
              {{ formatModifier(monster.initiativeBonus) }}
            </p>
          </div>
        </div>
      </div>

      <!-- 屬性 -->
      <div class="grid grid-cols-3 gap-3 py-4 sm:grid-cols-6">
        <div
          v-for="key in ABILITY_KEYS"
          :key="key"
          class="rounded-lg border border-border-soft bg-surface px-3 py-2 text-center"
        >
          <p class="text-xs text-content-muted">
            {{ t(`ability.${key}`) }}
            <span
              class="font-bold tabular-nums"
              :class="getModifierColorClass(getAbilityModifier(monster.abilities[key]))"
            >
              （{{ formatModifier(getAbilityModifier(monster.abilities[key])) }}）
            </span>
          </p>
          <p class="font-bold text-content tabular-nums">{{ monster.abilities[key] }}</p>
          <p class="mt-1 border-t border-divider pt-1 text-xs text-content-muted">
            {{ t('monster.field.savingThrows') }}
            <span
              class="font-bold tabular-nums"
              :class="getModifierColorClass(monster.savingThrows[key] ?? 0)"
            >
              {{ formatModifier(monster.savingThrows[key] ?? 0) }}
            </span>
          </p>
        </div>
      </div>

      <!-- 豁免 / 技能 / 抗性 / 感官 / 語言 -->
      <dl
        v-if="skillText || traitLines.length > 0"
        class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 py-4 text-sm"
      >
        <template v-if="skillText">
          <dt class="text-content-muted">{{ t('monster.field.skills') }}</dt>
          <dd class="text-content">{{ skillText }}</dd>
        </template>
        <template v-for="trait in traitLines" :key="trait.labelKey">
          <dt class="text-content-muted">{{ t(trait.labelKey) }}</dt>
          <dd class="whitespace-pre-line text-content">{{ trait.value }}</dd>
        </template>
      </dl>

      <!-- 攻擊 -->
      <section v-if="monster.attacks.length > 0" aria-labelledby="view-attacks" class="py-4">
        <h3 id="view-attacks" class="mb-2 font-display text-base font-bold text-content">
          {{ t('monster.field.attacks') }}
        </h3>
        <ul class="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <li
            v-for="attack in monster.attacks"
            :key="attack.id"
            class="rounded-lg border border-border-soft bg-surface px-3 py-2"
          >
            <div class="flex flex-wrap items-baseline gap-x-3">
              <p class="text-sm font-semibold text-content">{{ attack.name }}</p>
              <p class="text-xs text-content">
                {{ t('monster.hitBonus') }}
                <span class="font-bold tabular-nums">{{ formatModifier(attack.hitBonus) }}</span>
              </p>
            </div>
            <p class="my-1 text-xs text-content">{{ damageSummary(attack.damageDice) }}</p>
            <p v-if="attack.comment" class="text-xs whitespace-pre-line text-content-muted">
              {{ attack.comment }}
            </p>
          </li>
        </ul>
      </section>

      <!-- 特性 -->
      <section v-if="monster.features.length > 0" aria-labelledby="view-features" class="py-4">
        <h3 id="view-features" class="mb-2 font-display text-base font-bold text-content">
          {{ t('monster.field.features') }}
        </h3>
        <ul class="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <li
            v-for="feature in monster.features"
            :key="feature.id"
            class="rounded-lg border border-border-soft bg-surface px-3 py-2"
          >
            <p class="text-sm font-semibold text-content">{{ feature.name }}</p>
            <p
              v-if="feature.description"
              class="mt-1 text-xs whitespace-pre-line text-content-muted"
            >
              {{ feature.description }}
            </p>
          </li>
        </ul>
      </section>
    </div>

    <!-- 刪除確認 -->
    <Modal
      v-model="confirmOpen"
      :title="t('monster.deleteLabel')"
      bg-color="var(--color-canvas-elevated)"
      text-color="var(--color-content)"
      border-color="var(--color-border)"
    >
      <p class="text-content">{{ t('monster.deleteConfirm') }}</p>
      <p v-if="monster" class="mt-2 font-bold text-content">{{ monster.name }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <CommonAppButton type="button" variant="ghost" @click="confirmOpen = false">
            {{ t('ui.action.cancel') }}
          </CommonAppButton>
          <CommonAppButton
            type="button"
            variant="danger"
            :disabled="deleting"
            @click="onDeleteConfirm"
          >
            {{ t('ui.action.delete') }}
          </CommonAppButton>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { Modal } from '@ui'
import { ABILITY_KEYS, SKILL_KEYS, type DamageDieEntry } from '@rolling-dice-app/core'
import type { MessagePath } from '~/i18n'

definePageMeta({
  middleware: 'auth',
  noindex: true,
  key: (route) => route.params.id as string,
})

const { t } = useI18n()
const route = useRoute()
const id = getRouteParam(route.params.id)
const apiErrorToast = useApiErrorToast()
const monsterTemplateStore = useMonsterTemplateStore()

useHead({ title: t('monster.detailTitle') })

// 與列表同步：私有資料不進 SSR HTML / payload。id 在本次 mount 內恆定（route 變動走 page key remount）。
const { status, error, refresh } = useAsyncData(
  () => `monster-template-${id}`,
  () => monsterTemplateStore.loadDetail(id),
  { server: false, lazy: true },
)

const monster = computed(() => monsterTemplateStore.getById(id))

// 真 404（模板不存在 / 非擁有者）走 NotFound；其餘暫時性錯誤走可重試三態。
const isNotFound = computed(
  () =>
    (status.value === 'error' && isFetchError(error.value) && error.value.statusCode === 404) ||
    (status.value === 'success' && !monster.value),
)
const isTransientError = computed(() => status.value === 'error' && !isNotFound.value)
const retryDetail = (): void => {
  void refresh()
}

const skillText = computed(() => {
  const m = monster.value
  if (!m) return ''
  return SKILL_KEYS.filter((key) => (m.skills[key] ?? 0) !== 0)
    .map((key) => `${t(`skill.label.${key}`)} ${formatModifier(m.skills[key] ?? 0)}`)
    .join(' · ')
})

const traitLines = computed<{ labelKey: MessagePath; value: string }[]>(() => {
  const m = monster.value
  if (!m) return []
  const candidates: { labelKey: MessagePath; value: string | null }[] = [
    { labelKey: 'monster.field.damageVulnerabilities', value: m.damageVulnerabilities },
    { labelKey: 'monster.field.damageResistances', value: m.damageResistances },
    { labelKey: 'monster.field.damageImmunities', value: m.damageImmunities },
    { labelKey: 'monster.field.conditionImmunities', value: m.conditionImmunities },
    { labelKey: 'monster.field.senses', value: m.senses },
    { labelKey: 'monster.field.languages', value: m.languages },
  ]
  return candidates.filter((c): c is { labelKey: MessagePath; value: string } => !!c.value)
})

const damageSummary = (damageDice: DamageDieEntry[]): string => {
  if (damageDice.length === 0) return t('monster.emptyDash')
  return damageDice
    .map((entry) => {
      const type = entry.damageType ? ` ${t(`combat.damageType.${entry.damageType}`)}` : ''
      return `${formatDamageDice(entry)}${type}`
    })
    .join(' + ')
}

const confirmOpen = ref(false)
const deleting = ref(false)

const onDeleteConfirm = async (): Promise<void> => {
  if (deleting.value) return
  deleting.value = true
  try {
    await monsterTemplateStore.removeMonsterTemplate(id)
    confirmOpen.value = false
    await navigateTo('/dm/monster')
  } catch (err) {
    apiErrorToast.handle(err)
  } finally {
    deleting.value = false
  }
}
</script>
