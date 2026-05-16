<template>
  <header class="sticky top-0 z-50 border-b border-surface bg-panel">
    <div class="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
      <!-- Logo -->
      <NuxtLink
        to="/"
        class="flex items-center gap-3 text-lg font-bold tracking-wider text-content transition-colors hover:text-primary"
        aria-label="Rolling Dice"
      >
        <img src="~assets/images/dnd.png" alt="Dungeons & Dragons" class="w-16 hidden xs:block" />
        <h1 class="font-display text-xl">Rolling Dice</h1>
      </NuxtLink>

      <!-- Auth (client-only：避免被 edge cache 污染) -->
      <div class="ml-auto flex h-8 items-center">
        <ClientOnly>
          <NuxtLink
            v-if="auth.isLoggedIn"
            to="/settings"
            class="flex size-11 items-center justify-center transition-opacity hover:opacity-80"
            :aria-label="t('settings.title')"
          >
            <img
              v-if="auth.user?.avatarUrl && !avatarError"
              :src="auth.user.avatarUrl"
              alt=""
              class="h-8 w-8 rounded-full object-cover"
              @error="avatarError = true"
            />
            <span
              v-else
              aria-hidden="true"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs font-bold uppercase"
            >
              {{ initials }}
            </span>
          </NuxtLink>
          <CommonAppButton v-else variant="primary" size="sm" @click="onLogin">
            <span class="flex items-center gap-1">
              {{ t('ui.auth.login') }}
              <Icon name="login" />
            </span>
          </CommonAppButton>
          <template #fallback>
            <span aria-hidden="true" class="h-8 w-20" />
          </template>
        </ClientOnly>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Icon } from '@ui'

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()

const initials = computed(() => (auth.user?.displayName ?? '?').trim().charAt(0).toUpperCase())

/** avatar URL 載入失敗（尚未傳播 / 404）時退回 initials 而非破圖。 */
const avatarError = ref(false)
watch(
  () => auth.user?.avatarUrl,
  () => {
    avatarError.value = false
  },
)

const onLogin = () => {
  auth.login(route.fullPath)
}
</script>
