<template>
  <div class="mx-auto max-w-2xl px-4 py-4 sm:px-6 sm:py-6">
    <CommonPageHeader :title="t('settings.title')" :show-back="true" />

    <CommonAppCard variant="flat">
      <ClientOnly>
        <div class="space-y-6">
          <div class="mx-auto w-48 max-w-full">
            <BusinessCharacterFormPortraitUploader
              v-model="avatar"
              shape="avatar"
              :upload-fn="avatarUpload"
              :delete-fn="avatarDelete"
            />
          </div>

          <div class="border-t border-border-soft pt-6">
            <label for="settings-display-name" class="mb-1 block text-xs text-content-muted">
              {{ t('settings.displayName') }}
            </label>
            <div class="flex items-center gap-2">
              <CommonAppInput
                id="settings-display-name"
                class="flex-1"
                size="sm"
                outline
                :model-value="displayName"
                :maxlength="maxNicknameLength"
                :placeholder="t('settings.displayNamePlaceholder')"
                @update:model-value="displayName = $event"
              />
              <CommonAppButton
                variant="primary"
                size="sm"
                :disabled="!canSave"
                :loading="isSaving"
                @click="onSave"
              >
                {{ t('ui.action.save') }}
              </CommonAppButton>
            </div>
          </div>

          <section class="border-t border-border-soft pt-6">
            <h3 class="mb-3 text-lg font-semibold text-content">
              {{ t('settings.accountSection') }}
            </h3>
            <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt class="text-content-muted">{{ t('settings.email') }}</dt>
              <dd class="text-content-soft">{{ auth.user?.email }}</dd>

              <dt class="text-content-muted">{{ t('settings.joinedAt') }}</dt>
              <dd class="text-content-soft tabular-nums">{{ joinedAt }}</dd>
            </dl>
          </section>

          <section v-if="auth.limits" class="border-t border-border-soft pt-6">
            <h3 class="mb-3 text-lg font-semibold text-content">
              {{ t('settings.planLimits') }}
            </h3>
            <div class="flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <div class="flex items-center gap-2">
                <span class="text-content-muted">{{ t('settings.planActiveCharacters') }}</span>
                <CommonAppBadge variant="default" class="tabular-nums">
                  {{ auth.limits.maxActiveCharacters }}
                </CommonAppBadge>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-content-muted">{{ t('settings.planTotalCharacters') }}</span>
                <CommonAppBadge variant="default" class="tabular-nums">
                  {{ auth.limits.maxCharacters }}
                </CommonAppBadge>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-content-muted">{{ t('settings.planCampaignRecords') }}</span>
                <CommonAppBadge variant="default" class="tabular-nums">
                  {{ auth.limits.maxCampaignRecordsPerCharacter }}
                </CommonAppBadge>
              </div>
            </div>
          </section>

          <div class="border-t border-border-soft pt-6">
            <CommonAppButton variant="secondary" type="button" class="w-full" @click="onLogout">
              {{ t('settings.logout') }}
            </CommonAppButton>
          </div>
        </div>

        <template #fallback>
          <div class="space-y-6">
            <div class="mx-auto aspect-square w-48 max-w-full rounded-full bg-canvas-inset" />
            <div class="border-t border-border-soft pt-6">
              <div class="h-9 rounded bg-canvas-inset" />
            </div>
            <div class="border-t border-border-soft pt-6">
              <div class="h-20 rounded bg-canvas-inset" />
            </div>
            <div class="border-t border-border-soft pt-6">
              <div class="h-9 rounded bg-canvas-inset" />
            </div>
          </div>
        </template>
      </ClientOnly>
    </CommonAppCard>
  </div>
</template>

<script setup lang="ts">
import { VALIDATION_LIMITS } from '@rolling-dice-app/core'

definePageMeta({ middleware: 'auth' })

const maxNicknameLength = VALIDATION_LIMITS.maxNicknameLength

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToast()
const apiErrorToast = useApiErrorToast()

useHead({ title: t('settings.title') })

const displayName = ref(auth.user?.displayName ?? '')
const avatar = ref<string | null>(auth.user?.avatarUrl ?? null)
const isSaving = ref(false)

const joinedAt = computed(() =>
  auth.user
    ? new Intl.DateTimeFormat('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(auth.user.createdAt))
    : '',
)

const onLogout = async (): Promise<void> => {
  await auth.logout()
  await navigateTo('/')
}

const seedFromStore = () => {
  displayName.value = auth.user?.displayName ?? ''
  avatar.value = auth.user?.avatarUrl ?? null
}

const canSave = computed(() => {
  const u = auth.user
  if (!u) return false
  const next = displayName.value.trim()
  if (next.length === 0 || next.length > maxNicknameLength) return false
  return next !== u.displayName
})

// avatar：atomic，與 Save 解耦。上傳/清除後 refresh 同步 updatedAt 與 Header。
const avatarUpload = async (blob: Blob): Promise<string> => {
  const { url } = await users().uploadAvatar(blob)
  await auth.refresh()
  return url
}

const avatarDelete = async (): Promise<void> => {
  await users().deleteAvatar()
  await auth.refresh()
}

const onSave = async (): Promise<void> => {
  if (!canSave.value || isSaving.value) return
  isSaving.value = true
  try {
    await auth.updateProfile({
      displayName: displayName.value.trim(),
    })
    toast.success(t('settings.saveSuccess'))
  } catch (err) {
    // 409：updatedAt 過期 → 重抓 + 重新 seed，請使用者再存一次
    if (isFetchError(err) && err.statusCode === 409) {
      await auth.refresh().catch(() => {})
      seedFromStore()
      toast.error(t('settings.staleRetry'))
    } else {
      apiErrorToast.handle(err)
    }
  } finally {
    isSaving.value = false
  }
}
</script>
