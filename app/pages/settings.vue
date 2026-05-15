<template>
  <div class="mx-auto max-w-3xl px-4 pb-6">
    <CommonPageHeader :title="t('settings.title')" :show-back="true" />

    <div class="flex flex-col gap-6 bg-canvas-elevated p-4 sm:p-6 md:flex-row">
      <div class="w-full space-y-6 md:w-2/3">
        <div>
          <label for="settings-display-name" class="mb-1 block text-xs text-content">
            {{ t('settings.displayName') }}
          </label>
          <CommonAppInput
            id="settings-display-name"
            class="w-full"
            :radius="0"
            size="sm"
            outline
            :model-value="displayName"
            :placeholder="t('settings.displayNamePlaceholder')"
            @update:model-value="displayName = $event"
          />
        </div>

        <div>
          <label for="settings-list-layout" class="mb-1 block text-xs text-content">
            {{ t('settings.characterListLayout') }}
          </label>
          <CommonAppSelect
            id="settings-list-layout"
            class="w-32"
            size="sm"
            :model-value="layout"
            :options="layoutOptions"
            @update:model-value="layout = $event as 'grid' | 'list'"
          />
        </div>

        <div class="flex justify-end">
          <Button
            :disabled="!canSave"
            :loading="isSaving"
            :radius="4"
            bg-color="var(--color-primary)"
            @click="onSave"
          >
            {{ t('ui.action.save') }}
          </Button>
        </div>
      </div>

      <div class="w-full md:w-1/3">
        <span class="mb-1 block text-xs text-content">{{ t('settings.avatar') }}</span>
        <BusinessCharacterFormPortraitUploader
          v-model="avatar"
          :upload-fn="avatarUpload"
          :delete-fn="avatarDelete"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@ui'
import type { SelectOption } from '@ui'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToast()
const apiErrorToast = useApiErrorToast()

useHead({ title: t('settings.title') })

const displayName = ref(auth.user?.displayName ?? '')
const layout = ref<'grid' | 'list'>(auth.user?.preference.characterListLayout ?? 'grid')
const avatar = ref<string | null>(auth.user?.avatarUrl ?? null)
const isSaving = ref(false)

const layoutOptions = computed<SelectOption[]>(() => [
  { label: t('settings.layoutGrid'), value: 'grid' },
  { label: t('settings.layoutList'), value: 'list' },
])

const seedFromStore = () => {
  displayName.value = auth.user?.displayName ?? ''
  layout.value = auth.user?.preference.characterListLayout ?? 'grid'
  avatar.value = auth.user?.avatarUrl ?? null
}

const canSave = computed(() => {
  const u = auth.user
  if (!u) return false
  if (displayName.value.trim().length === 0) return false
  return (
    displayName.value.trim() !== u.displayName || layout.value !== u.preference.characterListLayout
  )
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
      preference: { characterListLayout: layout.value },
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
